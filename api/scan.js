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
    const fullPrompt = prompt + '\n\nRespond in JSON only: item, material, recyclable, instructions, tip';

    const messages = [{
      role: 'user',
      content: [{ type: 'text', text: fullPrompt }],
    }];

    if (imageData) {
      messages[0].content.push({ type: 'image_url', image_url: { url: imageData } });
    }

    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.2-11b-vision-preview',
        messages,
        max_tokens: 1000,
      }),
    });

    const data = await r.json();
    if (data.error) return send(res, 500, { error: data.error.message || 'Groq API error' });

    const text = data?.choices?.[0]?.message?.content || '';
    if (!text) return send(res, 500, { error: 'Empty response from Groq' });

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return send(res, 500, { error: 'Could not parse JSON from response', raw: text });

    const parsed = JSON.parse(match[0]);
    return send(res, 200, parsed);
  } catch (error) {
    return send(res, 500, { error: error.message });
  }
};
