function isComplex(prompt) {
  const complex = ['explain', 'how does', 'why', 'compare', 'difference', 'tell me about', 'what is the process', 'elaborate', 'in detail'];
  return complex.some((w) => prompt.toLowerCase().includes(w));
}

const GROQ_MODELS = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'openai/gpt-oss-20b'];
const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-2.5-flash'];

async function callGroq(prompt, apiKey, model) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are the RecycleConnect Eco Assistant helping people in Malaysia. Answer simply, accurately and in 3-5 short sentences.' },
        { role: 'user', content: `Question: ${prompt}` },
      ],
      max_tokens: 300,
    }),
  });
  return r.json();
}

async function callGeminiChat(prompt, apiKey, model) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `You are the RecycleConnect Eco Assistant helping people in Malaysia. Answer accurately in 3-5 short sentences.\n\nQuestion: ${prompt}` }] }],
    }),
  });
  return r.json();
}

function groqAnswer(data) {
  return data?.choices?.[0]?.message?.content || '';
}

function geminiAnswer(data) {
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function modelUnavailable(msg) {
  return /no longer|not found|not available|does not exist|model.*(?:unavailable|deprecated)/i.test(msg);
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

  const { prompt } = body;
  if (!prompt) return send(res, 400, { error: 'Prompt is required' });

  const groqKey = process.env.VITE_GROQ_API_KEY;
  const geminiKey = process.env.VITE_GEMINI_API_KEY;
  const errors = [];

  const order = isComplex(prompt)
    ? [...GEMINI_MODELS.map((m) => ['gemini', m]), ...GROQ_MODELS.map((m) => ['groq', m])]
    : [...GROQ_MODELS.map((m) => ['groq', m]), ...GEMINI_MODELS.map((m) => ['gemini', m])];

  for (const [provider, model] of order) {
    try {
      const data = provider === 'groq' && groqKey
        ? await callGroq(prompt, groqKey, model)
        : provider === 'gemini' && geminiKey
          ? await callGeminiChat(prompt, geminiKey, model)
          : null;
      if (!data) continue;

      const answer = provider === 'groq' ? groqAnswer(data) : geminiAnswer(data);
      if (answer) return send(res, 200, { answer });

      const errMsg = data?.error?.message || 'empty response';
      if (modelUnavailable(errMsg)) continue;
      errors.push(`${provider}:${model} → ${errMsg}`);
    } catch (e) {
      errors.push(`${provider}:${model} → ${e.message}`);
    }
  }

  if (!groqKey && !geminiKey) return send(res, 500, { error: 'No AI API keys configured.' });
  return send(res, 500, { error: `All AI models failed: ${errors.join(' | ') || 'unknown error'}` });
};
