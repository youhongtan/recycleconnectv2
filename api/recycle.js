// RecycleConnect V2 — POST /api/recycle
//
// SERVER-AUTHORITATIVE recycling awards. The frontend NEVER decides points:
//   1. Verify the Supabase JWT (rejects forged/anonymous calls).
//   2. Validate every material + grams value server-side.
//   3. Compute with the canonical config below (MUST match src/lib/ecoConfig.js:
//      rates per 100g, highest weight-bonus tier only, halves round up).
//   4. Idempotency: client_submission_id is UNIQUE — retries/floods can never
//      pay twice; a repeated id returns the ORIGINAL result.
//   5. Writes use SUPABASE_SERVICE_ROLE_KEY when configured (bypasses RLS, so
//      users cannot self-award via direct table writes after RLS hardening);
//      otherwise falls back to the caller's own JWT under existing RLS.

const POINTS_PER = 100;
const MATERIAL_RATES = {
  Plastic: 5,
  Paper: 3,
  Glass: 3,
  Metal: 4,
  Electronics: 20,
  Batteries: 15,
  Clothes: 5,
  "Cooking Oil": 10,
};
const WEIGHT_BONUS_TIERS = [[500, 5], [1000, 10], [2000, 25], [5000, 50], [10000, 100]];
const MAX_GRAMS_PER_LINE = 100000;
const MAX_GRAMS_PER_SUBMISSION = 1000000;

function bonusFor(totalGrams) {
  let bonus = 0;
  for (const [minG, pts] of WEIGHT_BONUS_TIERS) if (totalGrams >= minG) bonus = pts;
  return bonus;
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

  const { items, clientSubmissionId, centreId, centreName, accessToken } = body || {};

  // --- 1. Auth: verify JWT, resolve user (never trust a client-sent user id)
  if (!accessToken) return send(res, 401, { error: 'Sign in required.' });
  const meRes = await fetch(`${url}/auth/v1/user`, { headers: supaHeaders(anon, accessToken) });
  if (!meRes.ok) return send(res, 401, { error: 'Invalid session. Please sign in again.' });
  const me = await meRes.json();
  const userId = me.id;

  // --- 2. Validate shape + values
  if (!clientSubmissionId || typeof clientSubmissionId !== 'string' || clientSubmissionId.length > 64) {
    return send(res, 400, { error: 'clientSubmissionId required.' });
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > 8) {
    return send(res, 400, { error: 'Provide 1–8 material lines.' });
  }
  const lines = [];
  for (const it of items) {
    const material = it && it.material;
    const grams = Number(it && it.grams);
    if (!MATERIAL_RATES.hasOwnProperty(material)) {
      return send(res, 400, { error: `Unknown material: ${material}` });
    }
    if (!Number.isFinite(grams) || grams <= 0) {
      return send(res, 400, { error: `Weight for ${material} must be greater than 0 g.` });
    }
    if (grams > MAX_GRAMS_PER_LINE) {
      return send(res, 400, { error: `Weight for ${material} must be at most ${MAX_GRAMS_PER_LINE.toLocaleString()} g.` });
    }
    // Round display decimals to whole grams — scale can't weigh fractions.
    lines.push({ material, grams: Math.round(grams) });
  }
  const totalGrams = lines.reduce((s, l) => s + l.grams, 0);
  if (totalGrams > MAX_GRAMS_PER_SUBMISSION) {
    return send(res, 400, { error: 'Submission too large (max 1,000,000 g).' });
  }

  // --- 3. Canonical server-side calculation
  const perLine = lines.map((l) => {
    const exact = (l.grams / POINTS_PER) * MATERIAL_RATES[l.material];
    return { ...l, baseExact: exact, baseCredited: Math.round(exact) };
  });
  const baseCredited = perLine.reduce((s, l) => s + l.baseCredited, 0);
  const bonus = bonusFor(totalGrams);
  const totalCredited = baseCredited + bonus;

  // Writes: privileged service client when available, else the caller's JWT.
  const writeKey = serviceKey || anon;
  const writeToken = serviceKey ? serviceKey : accessToken;
  const H = supaHeaders(writeKey, writeToken);
  const fail = (msg) => send(res, 500, { error: msg });

  // --- 4. Idempotency: already-processed submission returns original result
  const dupRes = await fetch(
    `${url}/rest/v1/recycle_logs?client_submission_id=eq.${encodeURIComponent(clientSubmissionId)}&select=id,points_base,points_bonus`,
    { headers: H }
  );
  if (dupRes.ok) {
    const dup = await dupRes.json();
    if (dup.length > 0) {
      const base = dup.reduce((s, r) => s + (r.points_base || 0), 0);
      const bon = dup.reduce((s, r) => s + (r.points_bonus || 0), 0);
      return send(res, 200, {
        awarded: base + bon, baseCredited: base, bonus: bon,
        totalGrams, duplicate: true,
      });
    }
  }

  // --- 5. Insert one log row per material line (bonus rides on the heaviest)
  const heaviest = perLine.reduce((a, b) => (b.grams > a.grams ? b : a));
  const logIds = [];
  for (const l of perLine) {
    const ins = await fetch(`${url}/rest/v1/recycle_logs`, {
      method: 'POST',
      headers: { ...H, Prefer: 'return=representation' },
      body: JSON.stringify({
        user_id: userId,
        material: l.material,
        quantity: 1,
        weight_kg: +(l.grams / 1000).toFixed(3),
        weight_g: l.grams,
        points_base: l.baseCredited,
        points_bonus: l === heaviest ? bonus : 0,
        centre_id: centreId || null,
        centre_name: centreName || null,
        eco_points_earned: l.baseCredited + (l === heaviest ? bonus : 0),
        source: centreId ? 'qr_checkin' : 'manual',
        client_submission_id: clientSubmissionId,
      }),
    });
    if (!ins.ok) {
      const t = await ins.text();
      // Lost race with a retry carrying the same id → treat as duplicate.
      if (ins.status === 409 || /duplicate|unique/i.test(t)) {
        return send(res, 200, { awarded: totalCredited, baseCredited, bonus, totalGrams, duplicate: true });
      }
      return fail(`Could not save recycling log: ${t.slice(0, 200)}`);
    }
    const rows = await ins.json();
    if (rows[0]) logIds.push({ id: rows[0].id, line: l });
  }

  // --- 6. Ledger transactions (base per line + one bonus line)
  const txRows = logIds.map(({ id, line }) => ({
    user_id: userId,
    amount: line.baseCredited,
    type: 'recycle_base',
    reason: `${line.material} recycling — ${line.grams.toLocaleString()} g (${MATERIAL_RATES[line.material]} pts/100g)`,
    recycling_log_id: id,
  }));
  if (bonus > 0 && logIds.length > 0) {
    txRows.push({
      user_id: userId,
      amount: bonus,
      type: 'weight_bonus',
      reason: `Weight bonus — ${totalGrams.toLocaleString()} g total`,
      recycling_log_id: logIds[0].id,
    });
  }
  const txIns = await fetch(`${url}/rest/v1/eco_point_transactions`, {
    method: 'POST',
    headers: { ...H, Prefer: 'return=minimal' },
    body: JSON.stringify(txRows),
  });
  if (!txIns.ok) return fail('Could not record point transactions.');

  // --- 7. Credit profile (read-modify-write on server, never the client)
  const profRes = await fetch(
    `${url}/rest/v1/eco_profiles?user_id=eq.${userId}&select=*`,
    { headers: H }
  );
  if (!profRes.ok) return fail('Could not load profile.');
  const profs = await profRes.json();
  const profile = profs[0];
  if (!profile) return fail('Profile not found.');
  const badges = new Set(profile.badges || []);
  const newBadges = [];
  if (!badges.has('First Recycling Action')) { badges.add('First Recycling Action'); newBadges.push('First Recycling Action'); }
  if ((profile.items_recycled || 0) + perLine.length >= 50 && !badges.has('Earth Guardian')) {
    badges.add('Earth Guardian'); newBadges.push('Earth Guardian');
  }
  const upd = await fetch(`${url}/rest/v1/eco_profiles?id=eq.${profile.id}`, {
    method: 'PATCH',
    headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify({
      xp: (profile.xp || 0) + totalCredited,
      eco_points: (profile.eco_points || 0) + totalCredited,
      items_recycled: (profile.items_recycled || 0) + perLine.length,
      plastic_saved_kg: (profile.plastic_saved_kg || 0) + totalGrams / 1000,
      badges: [...badges],
    }),
  });
  if (!upd.ok) return fail('Could not credit Eco Points.');
  const updated = (await upd.json())[0];

  return send(res, 200, {
    awarded: totalCredited,
    baseCredited,
    bonus,
    totalGrams,
    perLine: perLine.map((l) => ({ material: l.material, grams: l.grams, baseCredited: l.baseCredited })),
    newBalance: updated.eco_points,
    newBadges,
    duplicate: false,
  });
};
