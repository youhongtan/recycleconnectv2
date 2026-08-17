const react = require('@vitejs/plugin-react')
const { defineConfig, loadEnv } = require('vite')
const path = require('path')

module.exports = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  function requireKey(name) {
    const key = env[name];
    if (!key) throw new Error(`${name} not set in .env.local`);
    return key;
  }

  function isComplex(prompt) {
    const complex = ['explain', 'how does', 'why', 'compare', 'difference', 'tell me about', 'what is the process', 'elaborate', 'in detail'];
    return complex.some((w) => prompt.toLowerCase().includes(w));
  }

  const GROQ_MODELS = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'openai/gpt-oss-20b'];
  const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-2.5-flash'];

  function modelUnavailable(msg) {
    return /no longer|not found|not available|does not exist|model.*(?:unavailable|deprecated)/i.test(msg);
  }

  async function callGroq(prompt, model) {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${requireKey('VITE_GROQ_API_KEY')}` },
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

  async function callGeminiChat(prompt, model) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${requireKey('VITE_GEMINI_API_KEY')}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `You are the RecycleConnect Eco Assistant helping people in Malaysia. Answer accurately in 3-5 short sentences.\n\nQuestion: ${prompt}` }] }],
      }),
    });
    return r.json();
  }

  async function groqChatFallback(prompt) {
    for (const model of GROQ_MODELS) {
      try {
        const data = await callGroq(prompt, model);
        const answer = data?.choices?.[0]?.message?.content || '';
        if (answer) return answer;
        if (!modelUnavailable(data?.error?.message || '')) break;
      } catch { /* try next */ }
    }
    return '';
  }

  async function geminiChatFallback(prompt) {
    for (const model of GEMINI_MODELS) {
      try {
        const data = await callGeminiChat(prompt, model);
        const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (answer) return answer;
        if (!modelUnavailable(data?.error?.message || '')) break;
      } catch { /* try next */ }
    }
    return '';
  }

  return {
    plugins: [
      react(),
      {
        name: 'api-routes',
        configureServer(server) {
          server.middlewares.use('/api/chat', async (req, res) => {
            if (req.method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ error: 'Method not allowed' })); return; }
            let body = '';
            req.on('data', (c) => body += c);
            req.on('end', async () => {
              try {
                const { prompt } = JSON.parse(body);
                let answer;

                if (isComplex(prompt)) {
                  answer = await geminiChatFallback(prompt);
                }
                if (!answer) {
                  answer = await groqChatFallback(prompt);
                }
                if (!answer) {
                  answer = await geminiChatFallback(prompt);
                }

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ answer: answer || 'AI service unavailable.' }));
              } catch (e) {
                res.statusCode = 500; res.end(JSON.stringify({ error: e.message }));
              }
            });
          });

          server.middlewares.use('/api/scan', async (req, res) => {
            if (req.method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ error: 'Method not allowed' })); return; }
            let body = '';
            req.on('data', (c) => body += c);
            req.on('end', async () => {
              try {
                const { prompt, imageUrl } = JSON.parse(body);
                const imageRes = await fetch(imageUrl);
                const imageBuffer = await imageRes.arrayBuffer();
                const base64 = Buffer.from(imageBuffer).toString('base64');
                const mime = imageRes.headers.get('content-type') || 'image/jpeg';

                let text = '';
                for (const model of GEMINI_MODELS) {
                  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${requireKey('VITE_GEMINI_API_KEY')}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      contents: [{
                        parts: [
                          { text: prompt + '\n\nRespond in JSON: item, material, recyclable, instructions, tip' },
                          { inline_data: { mime_type: mime, data: base64 } },
                        ],
                      }],
                    }),
                  });
                  const data = await r.json();
                  text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                  if (text) break;
                  if (!modelUnavailable(data?.error?.message || '')) break;
                }

                const match = text.match(/\{[\s\S]*\}/);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(match ? JSON.parse(match[0]) : {}));
              } catch (e) {
                res.statusCode = 500; res.end(JSON.stringify({ error: e.message }));
              }
            });
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
