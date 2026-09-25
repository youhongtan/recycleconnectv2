// RecycleConnect V2 — POST /api/redeem
//
// SERVER-AUTHORITATIVE redemptions (eco + impact rewards):
//   1. Verify JWT, resolve user server-side.
//   2. Load reward (must be available) and profile from the DB.
//   3. Reject: insufficient balance ("Not enough Eco Points"), already redeemed
//      (one redemption per reward — double-clicks/retries can't pay twice).
//   4. Deduct + append redeemed_rewards + record a NEGATIVE ledger transaction.
// Writes use SUPABASE_SERVICE_ROLE_KEY when configured, else the caller JWT.

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

  const { rewardId, localName, localCost, localKind, accessToken } = body || {};
  if (!accessToken) return send(res, 401, { error: 'Sign in required.' });

  const meRes = await fetch(`${url}/auth/v1/user`, { headers: supaHeaders(anon, accessToken) });
  if (!meRes.ok) return send(res, 401, { error: 'Invalid session. Please sign in again.' });
  const userId = (await meRes.json()).id;

  const writeKey = serviceKey || anon;
  const writeToken = serviceKey ? serviceKey : accessToken;
  const H = supaHeaders(writeKey, writeToken);
  const fail = (code, msg) => send(res, code, { error: msg });

  // Offline-fallback catalog mirror (fixed server-side costs — the client
  // can only pick a name; the PRICE always comes from here or the DB).
  const LOCAL_FALLBACK = {
    'Eco Sticker Pack': { cost: 5000, kind: 'eco' },
    'Reusable Eraser': { cost: 8000, kind: 'eco' },
    'Eco Pencil': { cost: 10000, kind: 'eco' },
    'Recycled Notebook': { cost: 15000, kind: 'eco' },
    'Reusable Shopping Bag (Recycled PET)': { cost: 25000, kind: 'eco' },
    'Reusable Water Bottle': { cost: 50000, kind: 'eco' },
    'Plant 1 Tree': { cost: 10000, kind: 'impact' },
    'Support a Cleanup': { cost: 5000, kind: 'impact' },
  };

  let reward = null;
  let rewardRowId = null;
  if (rewardId) {
    const rwRes = await fetch(
      `${url}/rest/v1/rewards?id=eq.${rewardId}&select=*`,
      { headers: H }
    );
    if (!rwRes.ok) return fail(500, 'Could not load reward.');
    reward = (await rwRes.json())[0];
    if (!reward || reward.available === false) return fail(400, 'Reward is not available.');
    rewardRowId = reward.id;
  } else if (localName && LOCAL_FALLBACK[localName]) {
    const fb = LOCAL_FALLBACK[localName];
    reward = { id: `local:${localName}`, name: localName, eco_points_cost: fb.cost, reward_kind: fb.kind };
  } else {
    return fail(400, 'rewardId required.');
  }
  const cost = Number(reward.eco_points_cost) || 0;

  const profRes = await fetch(
    `${url}/rest/v1/eco_profiles?user_id=eq.${userId}&select=*`,
    { headers: H }
  );
  if (!profRes.ok) return fail(500, 'Could not load profile.');
  const profile = (await profRes.json())[0];
  if (!profile) return fail(500, 'Profile not found.');

  const redeemed = profile.redeemed_rewards || [];
  if (redeemed.includes(reward.id)) {
    return fail(409, 'Already redeemed.');
  }

  // Tier trophies: lifetime-total qualification + first-come single stock.
  // Qualification is computed from the user's OWN logs (never trusted input).
  let isTierClaim = false;
  if (reward.tier_min_grams != null) {
    isTierClaim = true;
    const logsRes = await fetch(
      `${url}/rest/v1/recycle_logs?user_id=eq.${userId}&select=weight_g&limit=5000`,
      { headers: H }
    );
    if (!logsRes.ok) return fail(500, 'Could not verify tier qualification.');
    let lifetime = 0;
    for (const row of await logsRes.json()) lifetime += Number(row.weight_g) || 0;
    lifetime = Math.round(lifetime);
    if (lifetime < reward.tier_min_grams) {
      return fail(403, `Recycle ${Number(reward.tier_min_grams).toLocaleString()}g in total to qualify for ${reward.name}. Your total so far: ${lifetime.toLocaleString()}g.`);
    }
    if (reward.stock_left != null && reward.stock_left <= 0) {
      return fail(409, `${reward.name} is already claimed — a new round opens soon.`);
    }
  }

  const balance = profile.eco_points || 0;
  if (balance < cost) {
    return fail(400, 'Not enough Eco Points');
  }

  const newBalance = balance - cost;
  const upd = await fetch(`${url}/rest/v1/eco_profiles?id=eq.${profile.id}`, {
    method: 'PATCH',
    headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify({
      eco_points: newBalance,
      redeemed_rewards: [...redeemed, reward.id],
    }),
  });
  if (!upd.ok) return fail(500, 'Could not complete redemption.');

  const kind = reward.reward_kind === 'impact' ? 'impact_redemption' : 'reward_redemption';
  const label = reward.reward_kind === 'impact' ? 'Impact contribution' : isTierClaim ? 'Tier trophy claimed' : 'Eco reward redemption';
  await fetch(`${url}/rest/v1/eco_point_transactions`, {
    method: 'POST',
    headers: { ...H, Prefer: 'return=minimal' },
    body: JSON.stringify([{
      user_id: userId,
      amount: -cost,
      type: kind,
      reason: `${label} — ${reward.name} (${cost.toLocaleString()} pts)`,
      reward_id: rewardRowId,
    }]),
  });

  // Tier trophies: record the holder, then immediately open a fresh round
  // (stock back to 1) so the trophy keeps rotating first-come-first-served.
  // The claim itself is guarded above by the stock check + one-per-user rule.
  if (isTierClaim && rewardRowId) {
    await fetch(`${url}/rest/v1/rewards?id=eq.${rewardRowId}`, {
      method: 'PATCH',
      headers: { ...H, Prefer: 'return=minimal' },
      body: JSON.stringify({
        stock_left: 1,
        holder_name: profile.display_name || 'Eco Hero',
        holder_at: new Date().toISOString(),
      }),
    });
  }

  return send(res, 200, {
    redeemed: true,
    reward: { id: reward.id, name: reward.name, cost },
    newBalance,
    holder: profile.display_name || 'Eco Hero',
  });
};
