function send(res, code, data) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch { return send(res, 400, { error: 'Invalid JSON body' }); }

  const { prompt, imageUrl } = body;
  if (!prompt) return send(res, 400, { error: 'Prompt is required' });

  const apiKey = process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return send(res, 500, { error: 'Gemini API key not configured' });

  try {
    let base64, mime;

    if (imageUrl) {
      const imageRes = await fetch(imageUrl);
      const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
      base64 = imageBuffer.toString('base64');
      mime = imageRes.headers.get('content-type') || 'image/jpeg';
    }

    const parts = [{ text: prompt + '\n\nRespond in JSON only: item, material, recyclable, instructions, tip' }];
    if (base64) {
      parts.push({ inline_data: { mime_type: mime, data: base64 } });
    }

    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }] }),
    });

    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : {};

    return send(res, 200, parsed);
  } catch (error) {
    return send(res, 500, { error: error.message });
  }
};
