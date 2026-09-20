// RecycleConnect V2 — POST /api/admin-reset-points
//
// Admin-only: zero out a user's Eco Points (e.g. abuse correction).
//   1. Verify the caller is an admin via their Supabase JWT (server-side).
//   2. Set eco_points = 0 and record an `admin_adjustment` ledger row for
//      negative the old balance, so history always explains the change.
// Writes use SUPABASE_SERVICE_ROLE_KEY when configured, else the caller JWT
// (covered by the admin RLS policies from migration_v3/v6).

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

function supaHeaders(key, token) {
  const h = { apikey: key, 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  const url = process.env.VITE_SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon) return send(res, 500, { error: 'Server missing Supabase config.' });

  let body;
  try { body = JSON.parse(await readBody(req)); }
  catch { return send(res, 400, { error: 'Invalid JSON body' }); }

  const { userId, accessToken } = body || {};
  if (!accessToken) return send(res, 401, { error: 'Sign in required.' });
  if (!userId) return send(res, 400, { error: 'userId required.' });

  // Verify caller identity + admin role (never trust a client claim).
  const meRes = await fetch(`${url}/auth/v1/user`, { headers: supaHeaders(anon, accessToken) });
  if (!meRes.ok) return send(res, 401, { error: 'Invalid session. Please sign in again.' });
  const me = await meRes.json();
  const roleRes = await fetch(
    `${url}/rest/v1/user_roles?user_id=eq.${me.id}&select=role`,
    { headers: supaHeaders(anon, accessToken) }
  );
  const roles = roleRes.ok ? await roleRes.json() : [];
  if (!roles[0] || roles[0].role !== 'admin') {
    return send(res, 403, { error: 'Admin privileges required.' });
  }

  const writeKey = serviceKey || anon;
  const writeToken = serviceKey ? serviceKey : accessToken;
  const H = supaHeaders(writeKey, writeToken);
  const fail = (code, msg) => send(res, code, { error: msg });

  const profRes = await fetch(
    `${url}/rest/v1/eco_profiles?user_id=eq.${userId}&select=*`,
    { headers: H }
  );
  if (!profRes.ok) return fail(500, 'Could not load profile.');
  const profile = (await profRes.json())[0];
  if (!profile) return fail(404, 'Profile not found.');

  const previous = profile.eco_points || 0;
  const upd = await fetch(`${url}/rest/v1/eco_profiles?id=eq.${profile.id}`, {
    method: 'PATCH',
    headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify({ eco_points: 0 }),
  });
  if (!upd.ok) return fail(500, 'Could not reset points.');

  await fetch(`${url}/rest/v1/eco_point_transactions`, {
    method: 'POST',
    headers: { ...H, Prefer: 'return=minimal' },
    body: JSON.stringify([{
      user_id: userId,
      amount: -previous,
      type: 'admin_adjustment',
      reason: `Admin reset by ${me.email || 'admin'} (was ${previous.toLocaleString()} pts)`,
    }]),
  });

  return send(res, 200, { reset: true, previous, newBalance: 0 });
};
