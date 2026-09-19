// ---------------------------------------------------------------------------
// RecycleConnect V2 — REAL, location-aware bulk-pickup centre matching.
//
// Rules (never violated):
//  - Centres come ONLY from the existing `recycling_centres` rows. Never
//    invent names, addresses, phones, hours, materials, distances or pickup.
//  - A centre with ZERO overlap on the requested materials is EXCLUDED from
//    automatic recommendation (not just down-ranked).
//  - Priority: SAME CITY > SAME STATE > NEARBY STATE (Klang Valley cluster +
//    Penang neighbours) > anything else.
//  - Nearby NEVER implies pickup: pickup_verified is true ONLY when the
//    centre row itself flags home_collection. Otherwise the UI must say
//    pickup/capacity is unverified and needs admin review.
//  - No coordinates exist for a typed school address, so distance is ALWAYS
//    null and the UI must NEVER show a kilometre figure.
//  - Vehicle capacity cannot be verified from centre data — auto picks are
//    always capacity-unverified; admins may override (still unverified).
//
// To connect a real pickup API later, replace the ranking internals and keep
// the return shape. Callers do NOT need to change.
// ---------------------------------------------------------------------------

export function normalise(s) {
  return (s || "").toLowerCase().trim();
}

export const PICKUP_PREFERENCE_LABELS = {
  weekday: "Weekdays only (Mon–Fri)",
  weekend: "Weekends only (Sat–Sun)",
};

/** "Others: ..." free-text entries can't be matched to centre data. */
export function isCustomMaterial(m) {
  return /^others\b/i.test(m || "");
}

const CITY_ALIASES = {
  pj: "petaling jaya",
  kl: "kuala lumpur",
  penang: "pulau pinang",
  jb: "johor bahru",
};

// Same-state neighbours we are willing to cross into (lower priority).
const NEARBY_STATES = {
  selangor: ["kuala lumpur", "putrajaya"],
  "kuala lumpur": ["selangor", "putrajaya"],
  putrajaya: ["selangor", "kuala lumpur"],
  "pulau pinang": ["kedah", "perak"],
  kedah: ["pulau pinang", "perak"],
  perak: ["pulau pinang", "kedah"],
};

function tokensOf(s) {
  const expanded = normalise(s).replace(/\b(pj|kl|jb)\b/g, (m) => CITY_ALIASES[m] || m);
  // "penang" alias is a whole word too
  const withPenang = expanded.replace(/\bpenang\b/g, CITY_ALIASES.penang);
  return withPenang.split(/[^a-z]+/).filter((t) => t.length > 2);
}

/** Does the school address mention this city (multi-word aware)? */
function cityHit(schoolTokens, schoolRaw, city) {
  const c = normalise(city);
  if (!c) return false;
  if (schoolRaw.includes(c)) return true;
  const cityTokens = c.split(/[^a-z]+/).filter((t) => t.length > 2);
  return cityTokens.length > 0 && cityTokens.every((t) => schoolTokens.includes(t));
}

function stateHit(schoolTokens, schoolRaw, state) {
  const s = normalise(state);
  if (!s) return false;
  return schoolRaw.includes(s) || schoolTokens.includes(s.replace(/[^a-z]+/g, ""));
}

/**
 * Score one centre. Returns null when the centre must be EXCLUDED from
 * automatic recommendation (no requested-material overlap).
 */
export function scoreCentre(centre, request) {
  const wanted = request.materials || [];
  const centreMats = centre.materials || [];
  const concrete = wanted.filter((m) => !isCustomMaterial(m));
  const matched = concrete.filter((m) => centreMats.includes(m));

  // No material overlap → not a candidate, full stop.
  if (concrete.length > 0 && matched.length === 0) return null;

  let score = 0;
  const reasons = [];
  if (matched.length > 0) {
    score += matched.length * 5;
    reasons.push(`Accepts ${matched.join(", ")}`);
  } else {
    reasons.push("Custom materials — to confirm with school");
  }

  const schoolRaw = normalise(request.schoolAddress);
  const schoolTokens = tokensOf(request.schoolAddress);
  const cCity = normalise(centre.city || "");
  const cState = normalise(centre.state || "");
  let tier = "far";

  if (cCity && cityHit(schoolTokens, schoolRaw, cCity)) {
    score += 6;
    tier = "city";
    reasons.push(`In ${centre.city}`);
  } else if (cState && stateHit(schoolTokens, schoolRaw, cState)) {
    score += 3;
    tier = "state";
    reasons.push(`In ${centre.state}`);
  } else if (
    cState &&
    (NEARBY_STATES[cState] || []).some((n) => stateHit(schoolTokens, schoolRaw, n))
  ) {
    score += 2;
    tier = "nearby";
    reasons.push(`Nearby (${centre.state})`);
  }

  const pickupVerified = centre.home_collection === true;
  if (pickupVerified) {
    score += 4;
    reasons.push("Offers collection service");
  }
  if (centre.pays_cash) {
    score += 1;
    reasons.push("Pays cash for recyclables");
  }
  if ((centre.rating || 0) >= 4.5) {
    score += 1;
    reasons.push(`Highly rated (${centre.rating})`);
  }

  return {
    score,
    reasons,
    tier,
    pickupVerified,
    matchedMaterials: matched,
    locationLabel: [centre.city, centre.state].filter(Boolean).join(", "),
  };
}

/**
 * Rank REAL centres for a bulk request. Far-away centres only surface when no
 * closer facility handles the materials — and pickup stays unverified.
 */
export function findSuitableCentres(request, centres, limit = 3) {
  const list = Array.isArray(centres) ? centres : [];
  const ranked = [];
  for (const centre of list) {
    const s = scoreCentre(centre, request);
    if (s) ranked.push({ centre, ...s });
  }
  ranked.sort(
    (a, b) => b.score - a.score || (b.centre.rating || 0) - (a.centre.rating || 0)
  );
  return ranked.slice(0, limit);
}

/** The single best candidate, or null when nothing suitable exists. */
export function pickBestCentre(request, centres) {
  const ranked = findSuitableCentres(request, centres, 1);
  return ranked.length > 0 ? ranked[0] : null;
}

export const NO_CENTRE_FALLBACK =
  "No verified recycling centre matching your location and materials was found yet. An administrator will review your request and recommend a suitable centre.";

export const NO_CAPACITY_FALLBACK =
  "No verified recycling centre with the required pickup capacity was found yet. An administrator will review this request.";

// Future real-API hook (NOT wired yet — kept so the page code stays stable):
// export async function fetchPickupCentresFromApi(request) {
//   const res = await fetch("/api/pickup-centres", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(request),
//   });
//   if (!res.ok) throw new Error("Pickup API unavailable");
//   return res.json(); // expected: [{ centre, score, reasons }]
// }
