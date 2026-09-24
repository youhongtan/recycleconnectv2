// RecycleConnect V2 — POST /api/chat
//
// Verified-good model lineup (probed live, Sep 2026):
//   Groq:  qwen/qwen3.8-27b (fast primary ~300ms; old llama + qwen3.6 retired)
//   Gemini: gemini-3.6-flash, gemini-3.5-flash (fallbacks; 2.5-flash retired,
//           3.7/3.8-flash frequently overloaded)
// Strategy: Groq first with a short timeout (typical answer <1s), then Gemini
// fallbacks. Never surfaces raw provider errors — always a short message.

function isComplex(prompt) {
  const complex = ['explain', 'how does', 'why', 'compare', 'difference', 'tell me about', 'what is the process', 'elaborate', 'in detail'];
  return complex.some((w) => (prompt || '').toLowerCase().includes(w));
}

const GROQ_MODELS = ['qwen/qwen3.8-27b', 'allam-2-7b'];
const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash'];

function langInstruction(lang) {
  if (lang === 'ms') return 'Respond ENTIRELY in Bahasa Melayu (Malay).';
  if (lang === 'zh') return '必须完全用简体中文回答 (Respond ENTIRELY in Simplified Chinese).';
  return 'Respond in English.';
}

async function fetchTimeout(url, opts, ms) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: c.signal });
  } finally {
    clearTimeout(t);
  }
}

async function callGroq(prompt, apiKey, model, lang) {
  const r = await fetchTimeout('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: `You are the RecycleConnect Eco Assistant helping people in Malaysia. Answer simply, accurately and in 3-5 short sentences. ${langInstruction(lang)}` },
        { role: 'user', content: `Question: ${prompt}` },
      ],
      max_tokens: 300,
    }),
  }, 15000);
  return r.json();
}

async function callGeminiChat(prompt, apiKey, model, lang) {
  const r = await fetchTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `You are the RecycleConnect Eco Assistant helping people in Malaysia. Answer accurately in 3-5 short sentences. ${langInstruction(lang)}\n\nQuestion: ${prompt}` }] }],
    }),
  }, 20000);
  return r.json();
}

// Pollinations.ai — free, no key, OpenAI-compatible (verified live).
async function callPollinations(prompt, lang) {
  const r = await fetchTimeout('https://text.pollinations.ai/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai',
      messages: [
        { role: 'system', content: `You are the RecycleConnect Eco Assistant helping people in Malaysia. Answer simply, accurately and in 3-5 short sentences. ${langInstruction(lang)}` },
        { role: 'user', content: `Question: ${prompt}` },
      ],
    }),
  }, 40000);
  const data = await r.json();
  return data?.choices?.[0]?.message?.content || '';
}

// Cloudflare Workers AI — Llama 4 Scout (verified live, ~1s).
// Needs CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID env vars.
async function callScoutChat(prompt, accountId, token, lang) {
  const r = await fetchTimeout(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-4-scout-17b-16e-instruct`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: `You are the RecycleConnect Eco Assistant helping people in Malaysia. Answer simply, accurately and in 3-5 short sentences. ${langInstruction(lang)}` },
        { role: 'user', content: `Question: ${prompt}` },
      ],
    }),
  }, 25000);
  const data = await r.json();
  return data?.result?.choices?.[0]?.message?.content || data?.result?.response || '';
}

function groqAnswer(data) {
  return data?.choices?.[0]?.message?.content || '';
}

function geminiAnswer(data) {
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

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

  const { prompt, lang } = body;
  if (!prompt) return send(res, 400, { error: 'Prompt is required' });

  const groqKey = process.env.VITE_GROQ_API_KEY;
  const geminiKey = process.env.VITE_GEMINI_API_KEY;
  const cfToken = process.env.CLOUDFLARE_API_TOKEN;
  const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
  const hasCf = !!(cfToken && cfAccount);
  if (!groqKey && !geminiKey && !hasCf) return send(res, 500, { error: 'AI is not configured right now.' });

  // Groq first (fastest); Scout second (~1s, reliable); Pollinations free;
  // Gemini fallbacks after. Complex questions try Gemini 3.6 first.
  const order = [];
  if (isComplex(prompt)) {
    if (geminiKey) order.push(['gemini', GEMINI_MODELS[0]]);
    if (groqKey) order.push(...GROQ_MODELS.map((m) => ['groq', m]));
    if (hasCf) order.push(['scout', 'scout']);
    order.push(['pollinations', 'openai']);
    if (geminiKey) order.push(...GEMINI_MODELS.slice(1).map((m) => ['gemini', m]));
  } else {
    if (groqKey) order.push(...GROQ_MODELS.map((m) => ['groq', m]));
    if (hasCf) order.push(['scout', 'scout']);
    order.push(['pollinations', 'openai']);
    if (geminiKey) order.push(...GEMINI_MODELS.map((m) => ['gemini', m]));
  }

  for (const [provider, model] of order) {
    try {
      const data = provider === 'groq'
        ? await callGroq(prompt, groqKey, model, lang)
        : provider === 'scout'
          ? { scout: await callScoutChat(prompt, cfAccount, cfToken, lang) }
          : provider === 'pollinations'
            ? { polli: await callPollinations(prompt, lang) }
            : await callGeminiChat(prompt, geminiKey, model, lang);
      const answer = provider === 'groq' ? groqAnswer(data)
        : provider === 'scout' ? (data.scout || '')
        : provider === 'pollinations' ? (data.polli || '')
        : geminiAnswer(data);
      if (answer) return send(res, 200, { answer });
    } catch { /* next model */ }
  }

  return send(res, 500, { error: 'AI is busy right now. Please try again in a moment.' });
};
