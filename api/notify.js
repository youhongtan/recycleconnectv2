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

// Verify a Supabase access token and confirm the user is an admin.
// Uses plain REST so this file stays dependency-free (CJS-safe on Vercel).
async function verifyAdmin(accessToken) {
  const url = process.env.VITE_SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) return { ok: false, reason: 'Server missing Supabase config.' };
  if (!accessToken) return { ok: false, reason: 'Not signed in.' };

  const userRes = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anon, Authorization: `Bearer ${accessToken}` },
  });
  if (!userRes.ok) return { ok: false, reason: 'Invalid session. Please sign in again.' };
  const user = await userRes.json();

  const roleRes = await fetch(
    `${url}/rest/v1/user_roles?user_id=eq.${user.id}&select=role`,
    { headers: { apikey: anon, Authorization: `Bearer ${accessToken}` } }
  );
  if (!roleRes.ok) return { ok: false, reason: 'Could not verify admin role.' };
  const roles = await roleRes.json();
  if (!roles[0] || roles[0].role !== 'admin') {
    return { ok: false, reason: 'Admin privileges required.' };
  }
  return { ok: true, user };
}

async function sendEmail({ to, subject, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { notified: false, reason: 'RESEND_API_KEY not configured' };
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // NOTE: without a verified domain in Resend, use the test sender and
      // deliverability is limited — verify a (free) domain in Resend to email
      // any school address reliably. RESEND_FROM env overrides when set.
      from: process.env.RESEND_FROM || 'RecycleConnect <onboarding@resend.dev>',
      to,
      subject,
      text,
    }),
  });
  const data = await r.json();
  if (data.id) return { notified: true };
  // Flatten to a string — callers display this directly.
  const msg =
    (typeof data?.message === "string" && data.message) ||
    (typeof data?.error === "string" && data.error) ||
    (typeof data?.error?.message === "string" && data.error.message) ||
    JSON.stringify(data);
  return { notified: false, error: msg };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  const bodyStr = await readBody(req);
  let body;
  try { body = JSON.parse(bodyStr); } catch { return send(res, 400, { error: 'Invalid JSON body' }); }

  // --- Reply mode: admin emails a school back from the admin panel ---
  if (body.mode === 'reply') {
    const { to, subject, text, accessToken } = body;
    if (!to || !subject || !text) return send(res, 400, { error: 'to, subject, text required' });
    const admin = await verifyAdmin(accessToken);
    if (!admin.ok) return send(res, 403, { notified: false, error: admin.reason });
    try {
      const result = await sendEmail({ to, subject, text });
      return send(res, 200, result);
    } catch (error) {
      return send(res, 200, { notified: false, error: error.message });
    }
  }

  // --- Contact mode (existing): visitor message -> admin inbox ---
  const { name, email, subject, message } = body;
  if (!name || !email || !message) return send(res, 400, { error: 'name, email, message required' });

  const adminEmail = process.env.ADMIN_EMAIL || 'youhong.tyh@gmail.com';
  try {
    const result = await sendEmail({
      to: adminEmail,
      subject: `[RecycleConnect] ${subject || 'New message'} from ${name}`,
      text: `From: ${name} (${email})\nSubject: ${subject || '—'}\n\n${message}`,
    });
    return send(res, 200, result);
  } catch (error) {
    return send(res, 200, { notified: false, error: error.message });
  }
};
