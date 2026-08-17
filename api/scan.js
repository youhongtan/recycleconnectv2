function send(res, code, data) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c) => body += c);
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const GROQ_MODELS = ['qwen/qwen3.6-27b'];
const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-2.5-flash'];

function modelUnavailable(msg) {
  return /no longer|not found|not available|does not exist|model.*(?:unavailable|deprecated)/i.test(msg);
}

async function groqVision(apiKey, messages) {
  for (const model of GROQ_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 1000,
          reasoning_effort: 'none',
          response_format: { type: 'json_object' },
        }),
      });

      const contentType = r.headers.get('content-type') || '';
      if (!contentType.includes('json')) {
        const html = await r.text();
        console.error(`Groq non-JSON (${r.status}) for ${model}: ${html.slice(0, 200)}`);
        return { error: `Groq returned non-JSON (${r.status})` };
      }

      const data = await r.json();
      if (r.status === 429 && data?.error) {
        const detail = data.error.failed_generation || data.error.message || '';
        const match = detail.match(/try again in ([\d.]+)s/i);
        const waitMs = match ? Math.ceil(parseFloat(match[1]) * 1000) + 500 : 3000;
        console.error(`Groq rate limited on ${model} (attempt ${attempt + 1}/3), waiting ${waitMs}ms`);
        if (attempt < 2) await sleep(waitMs);
        continue;
      }
      if (r.status === 400 && /image/i.test(data?.error?.message || '')) {
        console.error(`Groq rejected image on ${model}: ${data.error.message}`);
        return { error: data.error.message };
      }
      if (modelUnavailable(data?.error?.message || '')) {
        return { unavailable: true, error: data.error.message };
      }
      if (data?.error) return { error: data.error.failed_generation || data.error.message || JSON.stringify(data.error) };
      const text = data?.choices?.[0]?.message?.content;
      if (!text) return { error: 'Empty response from Groq' };
      return { text };
    }
    return { error: `Groq rate limit reached on ${model} after retries` };
  }
  return { unavailable: true, error: 'No Groq models available' };
}

function dataUrlToInline(imageData) {
  const m = imageData.match(/^data:(image\/[a-z0-9+.-]+);base64,(.+)$/);
  if (!m) return null;
  return { mime_type: m[1], data: m[2] };
}

async function geminiVision(apiKey, textPrompt, imageData) {
  const inline = dataUrlToInline(imageData);
  if (!inline) throw new Error('Invalid image data');

  for (const model of GEMINI_MODELS) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: textPrompt },
            { inline_data: inline },
          ],
        }],
      }),
    });
    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (text) return { text };
    const errMsg = data?.error?.message || 'empty response';
    if (modelUnavailable(errMsg)) continue;
    return { error: errMsg };
  }
  return { unavailable: true, error: 'All Gemini vision models unavailable' };
}

function extractJson(text) {
  text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').replace(/<think>[\s\S]*?(?:<\/think>|$)/g, '').trim();
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(text);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  const bodyStr = await readBody(req);
  let body;
  try { body = JSON.parse(bodyStr); } catch { return send(res, 400, { error: 'Invalid JSON body' }); }

  const { prompt, imageData } = body;
  if (!prompt) return send(res, 400, { error: 'Prompt is required' });

  const groqKey = process.env.VITE_GROQ_API_KEY;
  const geminiKey = process.env.VITE_GEMINI_API_KEY;

  const schema = { item: '', material: '', recyclable: '', instructions: '', tip: '' };
  const textPrompt = prompt + '\n\nYou MUST respond with ONLY valid JSON. No markdown, no explanation. Use exactly these keys: item, material, recyclable, instructions, tip. Example: {"item": "water bottle", "material": "plastic", "recyclable": "Yes, rinse and remove cap", "instructions": "Empty and rinse. Remove label and cap. Place in recycling bin.", "tip": "One plastic bottle takes 450 years to decompose."}';

  const messages = [
    { role: 'system', content: 'You are a JSON-only assistant. Respond with valid JSON and nothing else.' },
    { role: 'user', content: [{ type: 'text', text: textPrompt }] },
  ];

  if (imageData) {
    messages[1].content.push({ type: 'image_url', image_url: { url: imageData } });
  }

  const errors = [];

  try {
    if (groqKey) {
      const groqResult = await groqVision(groqKey, messages);
      if (groqResult.text) {
        const parsed = extractJson(groqResult.text);
        return send(res, 200, { ...schema, ...parsed });
      }
      if (groqResult.error) errors.push(`groq → ${groqResult.error}`);
    }

    if (geminiKey && imageData) {
      const geminiResult = await geminiVision(geminiKey, textPrompt, imageData);
      if (geminiResult.text) {
        const parsed = extractJson(geminiResult.text);
        return send(res, 200, { ...schema, ...parsed });
      }
      if (geminiResult.error) errors.push(`gemini → ${geminiResult.error}`);
    }

    if (!groqKey && !geminiKey) return send(res, 500, { error: 'No AI API keys configured.' });
    return send(res, 500, { error: `All AI models failed: ${errors.join(' | ') || 'unknown error'}` });
  } catch (error) {
    console.error('Scan API error:', error.message);
    return send(res, 500, { error: error.message });
  }
};
