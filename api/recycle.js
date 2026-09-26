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

// Bump API_REV on every change to this file. The frontend carries the same
// rev and forces a refresh on mismatch, so a stale cached page can never
// talk to a stale function (or vice versa) without the user knowing.
const API_REV = "r6";

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
  console.log(`RECYCLE-START key=${clientSubmissionId} lines=${Array.isArray(items) ? items.length : '?'}`);

  // Whole-flow guard: ANY unexpected throw (e.g. an upstream HTML error page
  // breaking .json()) becomes a JSON 500 with a logged reason — never a
  // platform crash page the client can't parse.
  try {

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

  // --- 4. Idempotency: already-processed submission returns original result.
  // EVERY success path (fresh, duplicate, or lost-race) returns the live
  // balance + debug, so the client can never display a stale number.
  // The ledger is the source of truth: replays SYNC the profile balance to
  // the transaction sum, so an award orphaned by a killed/timed-out first
  // attempt self-heals instead of sticking forever.
  async function syncBalanceFromLedger() {
    try {
      const sRes = await fetch(
        `${url}/rest/v1/eco_point_transactions?user_id=eq.${userId}&select=amount&limit=5000`,
        { headers: H }
      );
      if (!sRes.ok) return null;
      const rows = await sRes.json();
      const sum = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
      // Check the PATCH result: a silent failure here used to report success
      // with a stale balance. Never claim persisted without proof.
      const syncRes = await fetch(`${url}/rest/v1/eco_profiles?user_id=eq.${userId}`, {
        method: 'PATCH',
        headers: { ...H, Prefer: 'return=minimal' },
        body: JSON.stringify({ eco_points: sum }),
      });
      if (!syncRes.ok) {
        const t = await syncRes.text();
        console.error(`SYNC PATCH failed: HTTP ${syncRes.status} ${t.slice(0, 200)}`);
        return null;
      }
      return sum;
    } catch {
      return null;
    }
  }
  async function liveBalanceOf() {
    try {
      const bRes = await fetch(
        `${url}/rest/v1/eco_profiles?user_id=eq.${userId}&select=eco_points`,
        { headers: H }
      );
      const bRows = await bRes.json();
      return bRows[0] ? bRows[0].eco_points : null;
    } catch {
      return null;
    }
  }
  const dupRes = await fetch(
    `${url}/rest/v1/recycle_logs?client_submission_id=eq.${encodeURIComponent(clientSubmissionId)}&select=id,points_base,points_bonus`,
    { headers: H }
  );
  if (dupRes.ok) {
    const dup = await dupRes.json();
    if (dup.length > 0) {
      const base = dup.reduce((s, r) => s + (r.points_base || 0), 0);
      const bon = dup.reduce((s, r) => s + (r.points_bonus || 0), 0);
      // Self-heal: sync the cached balance to the ledger truth, so an award
      // orphaned by an earlier killed/timed-out attempt lands now.
      const liveBalance = await syncBalanceFromLedger();
      console.log(`DUPLICATE submission ${clientSubmissionId}: synced award, liveBalance=${liveBalance}`);
      return send(res, 200, {
        awarded: base + bon, baseCredited: base, bonus: bon,
        totalGrams, duplicate: true,
        newBalance: liveBalance,
        persisted: liveBalance != null,
        apiRev: API_REV,
        debug: { duplicate: true, key: clientSubmissionId, liveBalance },
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
      // Lost race with a retry carrying the same id: replay from stored rows
      // (with live balance + debug, exactly like the duplicate path above).
      if (ins.status === 409 || /duplicate|unique/i.test(t)) {
        // Definitive check: do rows with this key ACTUALLY exist right now?
        // If yes → genuine race/replay. If no → the unique index itself is
        // misfiring (wrong definition) and must be rebuilt, not worked around.
        let conflictRows = -1;
        try {
          const cRes = await fetch(
            `${url}/rest/v1/recycle_logs?client_submission_id=eq.${encodeURIComponent(clientSubmissionId)}&select=id`,
            { headers: H }
          );
          if (cRes.ok) conflictRows = (await cRes.json()).length;
        } catch { /* keep -1 = unknown */ }
        console.error(`LOST-RACE key=${clientSubmissionId} status=${ins.status} conflictRows=${conflictRows} body=${t.slice(0, 300)}`);
        console.error(`LOST-RACE key=${clientSubmissionId} status=${ins.status} body=${t.slice(0, 300)}`);
        const re = await fetch(
          `${url}/rest/v1/recycle_logs?client_submission_id=eq.${encodeURIComponent(clientSubmissionId)}&select=points_base,points_bonus`,
          { headers: H }
        );
        const reRows = re.ok ? await re.json() : [];
        const reBase = reRows.reduce((s, r) => s + (r.points_base || 0), 0);
        const reBon = reRows.reduce((s, r) => s + (r.points_bonus || 0), 0);
        const liveBalance = await liveBalanceOf();
        console.log(`LOST-RACE on ${clientSubmissionId}: replaying, liveBalance=${liveBalance}`);
        return send(res, 200, {
          awarded: reBase + reBon, baseCredited: reBase, bonus: reBon,
          totalGrams, duplicate: true,
          newBalance: liveBalance,
          persisted: liveBalance != null,
          debug: { duplicate: true, lostRace: true, key: clientSubmissionId, liveBalance, conflictRows },
          apiRev: API_REV,
        });
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
  // Defensive: balances must never go negative. If a corrupt/legacy row is
  // ever read with a negative balance, normalize the math to zero and log it
  // instead of propagating impossible numbers to the client.
  if ((profile.eco_points || 0) < 0 || (profile.xp || 0) < 0) {
    console.error(`NEGATIVE BALANCE on profile=${profile.id}: eco=${profile.eco_points} xp=${profile.xp} — normalizing to 0.`);
    profile.eco_points = 0;
    profile.xp = 0;
  }
  // Badges system removed — profile updates carry points and counts only.
  const newBalance = (profile.eco_points || 0) + totalCredited;
  const upd = await fetch(`${url}/rest/v1/eco_profiles?id=eq.${profile.id}`, {
    method: 'PATCH',
    headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify({
      xp: (profile.xp || 0) + totalCredited,
      eco_points: newBalance,
      items_recycled: (profile.items_recycled || 0) + perLine.length,
      plastic_saved_kg: (profile.plastic_saved_kg || 0) + totalGrams / 1000,
    }),
  });
  if (!upd.ok) {
    const t = await upd.text();
    console.error(`PATCH profile failed: HTTP ${upd.status} ${t.slice(0, 200)}`);
    return fail('Could not credit Eco Points.');
  }
  const updated = (await upd.json())[0];

  // Read-your-write verification: re-read the row and confirm the balance
  // actually stuck. Reports the truth instead of assuming it.
  let persisted = false;
  let verifiedBalance = null;
  try {
    const verifyRes = await fetch(
      `${url}/rest/v1/eco_profiles?id=eq.${profile.id}&select=eco_points,xp`,
      { headers: H }
    );
    const verifyRow = (await verifyRes.json())[0];
    verifiedBalance = verifyRow ? verifyRow.eco_points : null;
    persisted = verifiedBalance === newBalance;
    if (!persisted) {
      console.error(
        `PERSIST MISMATCH profile=${profile.id} before=${profile.eco_points} attempted=${newBalance} verified=${verifiedBalance}`
      );
    }
  } catch (e) {
    console.error('PERSIST CHECK failed:', e.message);
  }

  return send(res, 200, {
    awarded: totalCredited,
    baseCredited,
    bonus,
    totalGrams,
    perLine: perLine.map((l) => ({ material: l.material, grams: l.grams, baseCredited: l.baseCredited })),
    newBalance: verifiedBalance ?? newBalance,
    persisted,
    apiRev: API_REV,
    debug: {
      profileId: profile.id,
      before: profile.eco_points,
      attempted: newBalance,
      verified: verifiedBalance,
    },
    duplicate: false,
  });
  } catch (e) {
    console.error('RECYCLE FATAL:', e.message);
    return send(res, 500, { error: 'Something went wrong saving. Please try again.' });
  }
};
