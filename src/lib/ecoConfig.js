// ---------------------------------------------------------------------------
// RecycleConnect V2 — CENTRAL Eco Points configuration.
//
// SINGLE SOURCE OF TRUTH for the frontend. The server endpoints
// (api/recycle.js) mirror these exact numbers and are authoritative —
// never trust a points total computed anywhere else.
//
// Material rates are Eco Points PER 100 GRAMS. Weight bonus applies ONCE per
// submission using only the HIGHEST qualifying tier (never stacked).
// ---------------------------------------------------------------------------

export const POINTS_PER = 100; // grams

export const MATERIAL_RATES = {
  Plastic: 5,
  Paper: 3,
  Glass: 3,
  Metal: 4,
  Electronics: 20,
  Batteries: 15,
  Clothes: 5,
  "Cooking Oil": 10,
};

export const MATERIALS_GRAMS = Object.keys(MATERIAL_RATES);

// [minGrams, bonusPoints] — sorted ascending; highest qualifying tier wins.
export const WEIGHT_BONUS_TIERS = [
  [500, 5],
  [1000, 10],
  [2000, 25],
  [5000, 50],
  [10000, 100],
];

export const MAX_GRAMS_PER_LINE = 100000; // 100 kg per material line
export const MAX_GRAMS_PER_SUBMISSION = 1000000; // 1 tonne per submission

/** Exact (possibly decimal) base points for `grams` of `material`. */
export function basePointsExact(material, grams) {
  const rate = MATERIAL_RATES[material];
  if (rate == null) return 0;
  return (grams / POINTS_PER) * rate;
}

/** Highest applicable weight bonus for a submission totalling `grams`. */
export function weightBonusFor(totalGrams) {
  let bonus = 0;
  for (const [minG, pts] of WEIGHT_BONUS_TIERS) {
    if (totalGrams >= minG) bonus = pts;
  }
  return bonus;
}

/**
 * Full submission quote. Returns exact decimals for DISPLAY plus the
 * integer amounts actually CREDITED (eco_points is an integer column —
 * halves round up, consistently, in one place).
 */
export function quoteSubmission(lines) {
  const perLine = lines.map(({ material, grams }) => {
    const exact = basePointsExact(material, grams);
    return { material, grams, baseExact: exact, baseCredited: Math.round(exact) };
  });
  const totalGrams = perLine.reduce((s, l) => s + l.grams, 0);
  const baseExact = perLine.reduce((s, l) => s + l.baseExact, 0);
  const baseCredited = perLine.reduce((s, l) => s + l.baseCredited, 0);
  const bonus = weightBonusFor(totalGrams);
  return {
    perLine,
    totalGrams,
    baseExact,
    baseCredited,
    bonus,
    totalExact: baseExact + bonus,
    totalCredited: baseCredited + bonus,
  };
}

export function isKnownMaterial(m) {
  return Object.prototype.hasOwnProperty.call(MATERIAL_RATES, m);
}

/** Validate one grams value. Returns an error string or "". */
export function validateGrams(value) {
  if (value === "" || value === null || value === undefined) return "Weight is required.";
  const n = Number(value);
  if (!Number.isFinite(n)) return "Weight must be a number.";
  if (n <= 0) return "Weight must be greater than 0.";
  if (n > MAX_GRAMS_PER_LINE) return `Weight must be at most ${MAX_GRAMS_PER_LINE.toLocaleString()} g per material.`;
  return "";
}
