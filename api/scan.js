// RecycleConnect V2 — POST /api/scan
//
// Verified-good vision lineup (probed live, Sep 2026):
//   Groq currently offers NO vision-capable model (qwen3.8 rejects images),
//   so scan goes straight to Gemini: gemini-3.6-flash, then gemini-3.5-flash.
//   (No dead-model attempts first — those only added delay + scary errors.)
// NOTE: free-tier Gemini can be slow at peak times; each attempt has a 90s cap.

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

function fetchTimeout(url, opts, ms) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  const p = fetch(url, { ...opts, signal: c.signal });
  return p.finally(() => clearTimeout(t));
}

const GEMINI_MODELS = ['gemini-3.5-flash', 'gemini-3.6-flash'];

  // Budget: Scout (~1s healthy) → Gemini 12s each → Pollinations 25s.
  // Healthy path finishes in seconds; only all-hung providers approach
  // Vercel's ~60s limit, in which case the friendly error is returned.

function dataUrlToInline(imageData) {
  const m = (imageData || '').match(/^data:(image\/[a-z0-9+.-]+);base64,(.+)$/);
  if (!m) return null;
  return { mime_type: m[1], data: m[2] };
}

async function geminiVision(apiKey, textPrompt, imageData) {
  const inline = dataUrlToInline(imageData);
  if (!inline) throw new Error('Invalid image data');

  for (const model of GEMINI_MODELS) {
    try {
      const r = await fetchTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: textPrompt },
              { inline_data: inline },
            ],
          }],
          // Short JSON-only answers generate much faster than long prose.
          generationConfig: { maxOutputTokens: 500, temperature: 0.2 },
        }),
      }, 12000);
      const data = await r.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (text) return { text };
    } catch { /* next model */ }
  }
  return { error: true };
}

// Pollinations.ai vision fallback — free, no key, OpenAI image_url shape.
async function pollinationsVision(textPrompt, imageData) {
  const m = (imageData || '').match(/^data:(image\/[a-z0-9+.-]+);(base64,.*)$/);
  if (!m) return { error: true };
  try {
    const r = await fetchTimeout('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: textPrompt },
            { type: 'image_url', image_url: { url: imageData } },
          ],
        }],
      }),
    }, 25000);
    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content || '';
    if (text) return { text };
  } catch { /* fall through */ }
  return { error: true };
}

// Cloudflare Llama 4 Scout vision — primary engine (verified ~1s live).
// Needs CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID env vars.
async function scoutVision(accountId, token, textPrompt, imageData) {
  try {
    const r = await fetchTimeout(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-4-scout-17b-16e-instruct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: textPrompt },
            { type: 'image_url', image_url: { url: imageData } },
          ],
        }],
      }),
    }, 30000);
    const data = await r.json();
    const text = data?.result?.choices?.[0]?.message?.content || data?.result?.response || '';
    if (text) return { text };
  } catch { /* fall through */ }
  return { error: true };
}

function extractJson(text) {
  text = (text || '').replace(/```json\s*/gi, '').replace(/```\s*/g, '').replace(/<think>[\s\S]*?(?:<\/think>|$)/g, '').trim();
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

  const { prompt, imageData, lang } = body;
  if (!prompt) return send(res, 400, { error: 'Prompt is required' });

  const geminiKey = process.env.VITE_GEMINI_API_KEY;
  const cfToken = process.env.CLOUDFLARE_API_TOKEN;
  const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
  const hasCf = !!(cfToken && cfAccount);
  if (!geminiKey && !hasCf) return send(res, 500, { error: 'AI is not configured right now.' });

  // Keep JSON keys in English, but write the VALUES in the user's language.
  const langRule =
    lang === 'ms' ? ' Write all JSON values in Bahasa Melayu (keys stay in English).'
    : lang === 'zh' ? ' JSON 值全部用简体中文写 (keys stay in English, values in Simplified Chinese).'
    : '';

  const schema = { item: '', material: '', recyclable: '', instructions: '', tip: '' };
  const textPrompt = prompt + '\n\nYou MUST respond with ONLY valid JSON. No markdown, no explanation. Use exactly these keys: item, material, recyclable, instructions, tip.' + langRule;

  try {
    // Scout first (~1s when healthy), then Gemini, then free Pollinations.
    // Budget: ~30 + 12 + 12 + 25s worst case — fits Vercel's ~60s limit.
    let vision = { error: true };
    if (hasCf) vision = await scoutVision(cfAccount, cfToken, textPrompt, imageData);
    if (!vision.text && geminiKey) vision = await geminiVision(geminiKey, textPrompt, imageData);
    if (!vision.text) vision = await pollinationsVision(textPrompt, imageData);
    if (vision.text) {
      try {
        const parsed = extractJson(vision.text);
        return send(res, 200, { ...schema, ...parsed });
      } catch {
        console.error('Scan JSON parse failed.');
      }
    }
    return send(res, 500, { error: 'AI is busy right now. Please try again in a moment.' });
  } catch (error) {
    console.error('Scan API error:', error.message);
    return send(res, 500, { error: 'AI is busy right now. Please try again in a moment.' });
  }
};
