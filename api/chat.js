function isComplex(prompt) {
  const complex = ['explain', 'how does', 'why', 'compare', 'difference', 'tell me about', 'what is the process', 'elaborate', 'in detail'];
  return complex.some((w) => prompt.toLowerCase().includes(w));
}

async function callGroq(prompt, apiKey) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: 'You are the RecycleConnect Eco Assistant helping people in Malaysia. Answer simply, accurately and in 3-5 short sentences.' },
        { role: 'user', content: `Question: ${prompt}` },
      ],
      max_tokens: 300,
    }),
  });
  return r.json();
}

async function callGeminiChat(prompt, apiKey) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `You are the RecycleConnect Eco Assistant helping people in Malaysia. Answer accurately in 3-5 short sentences.\n\nQuestion: ${prompt}` }] }],
    }),
  });
  return r.json();
}

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

  const { prompt } = body;
  if (!prompt) return send(res, 400, { error: 'Prompt is required' });

  const groqKey = process.env.VITE_GROQ_API_KEY;
  const geminiKey = process.env.VITE_GEMINI_API_KEY;

  try {
    let answer;

    if (isComplex(prompt) && geminiKey) {
      const data = await callGeminiChat(prompt, geminiKey);
      answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!answer) answer = data?.error?.message || '';
    } else if (groqKey) {
      const data = await callGroq(prompt, groqKey);
      if (data?.choices?.[0]?.message?.content) {
        answer = data.choices[0].message.content;
      } else if (geminiKey) {
        const geminiData = await callGeminiChat(prompt, geminiKey);
        answer = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || geminiData?.error?.message || '';
      } else {
        answer = 'AI service unavailable. Please configure an API key.';
      }
    } else if (geminiKey) {
      const data = await callGeminiChat(prompt, geminiKey);
      answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || data?.error?.message || '';
    } else {
      answer = 'No AI API keys configured.';
    }

    return send(res, 200, { answer });
  } catch (error) {
    return send(res, 500, { error: error.message });
  }
};
