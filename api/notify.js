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

  const { name, email, subject, message } = body;
  if (!name || !email || !message) return send(res, 400, { error: 'name, email, message required' });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return send(res, 200, { notified: false, reason: 'RESEND_API_KEY not configured' });

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'RecycleConnect <noreply@recycleconnect.my>',
        to: process.env.ADMIN_EMAIL || 'youhong.tyh@gmail.com',
        subject: `[RecycleConnect] ${subject || 'New message'} from ${name}`,
        text: `From: ${name} (${email})\nSubject: ${subject || '—'}\n\n${message}`,
      }),
    });
    const data = await r.json();
    if (data.id) return send(res, 200, { notified: true });
    return send(res, 200, { notified: false, error: data });
  } catch (error) {
    return send(res, 200, { notified: false, error: error.message });
  }
};
