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

const MODELS = [
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'qwen/qwen3.6-27b',
];

async function groqRequest(apiKey, messages) {
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 1000,
        }),
      });

      const contentType = r.headers.get('content-type') || '';
      if (!contentType.includes('json')) {
        const html = await r.text();
        console.error(`Groq non-JSON (${r.status}) for ${model}: ${html.slice(0, 200)}`);
        break;
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
        break;
      }
      return { status: r.status, data, model };
    }
    console.error(`Model ${model} failed, trying next...`);
  }
  return { status: 429, data: { error: { message: 'Rate limit reached after retries. Please wait a minute and try again.' } } };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  const bodyStr = await readBody(req);
  let body;
  try { body = JSON.parse(bodyStr); } catch { return send(res, 400, { error: 'Invalid JSON body' }); }

  const { prompt, imageData } = body;
  if (!prompt) return send(res, 400, { error: 'Prompt is required' });

  const apiKey = process.env.VITE_GROQ_API_KEY;
  if (!apiKey) return send(res, 500, { error: 'Groq API key not configured' });

  try {
    const schema = { item: '', material: '', recyclable: '', instructions: '', tip: '' };
    const textPrompt = prompt + '\n\nYou MUST respond with ONLY valid JSON. No markdown, no explanation. Use exactly these keys: item, material, recyclable, instructions, tip. Example: {"item": "water bottle", "material": "plastic", "recyclable": "Yes, rinse and remove cap", "instructions": "Empty and rinse. Remove label and cap. Place in recycling bin.", "tip": "One plastic bottle takes 450 years to decompose."}';

    const messages = [
      { role: 'system', content: 'You are a JSON-only assistant. Respond with valid JSON and nothing else.' },
      { role: 'user', content: [{ type: 'text', text: textPrompt }] },
    ];

    if (imageData) {
      messages[1].content.push({ type: 'image_url', image_url: { url: imageData } });
    }

    const { status, data } = await groqRequest(apiKey, messages);
    if (status !== 200) {
      const detail = data?.error?.failed_generation || data?.error?.message || JSON.stringify(data?.error || data);
      return send(res, status, { error: detail });
    }
    if (data.error) {
      const detail = data.error.failed_generation || data.error.message || JSON.stringify(data.error);
      return send(res, 500, { error: `Groq API error: ${detail}` });
    }
    if (!data.choices) return send(res, 500, { error: 'Groq API error: no choices returned' });

    let text = data.choices[0]?.message?.content || '';
    if (!text) return send(res, 500, { error: 'Empty response from Groq' });

    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').replace(/<think>[\s\S]*?(?:<\/think>|$)/g, '').trim();

    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      text = text.slice(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(text);
    return send(res, 200, { ...schema, ...parsed });
  } catch (error) {
    console.error('Scan API error:', error.message);
    return send(res, 500, { error: error.message });
  }
};
