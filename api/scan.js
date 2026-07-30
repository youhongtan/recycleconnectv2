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

    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        messages,
        max_tokens: 1000,
      }),
    });

    const contentType = r.headers.get('content-type') || '';
    if (!contentType.includes('json')) {
      const html = await r.text();
      return send(res, 502, { error: `Groq returned non-JSON (${r.status}): ${html.slice(0, 200)}` });
    }

    const data = await r.json();
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
