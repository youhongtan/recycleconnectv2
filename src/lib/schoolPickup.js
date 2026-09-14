// ---------------------------------------------------------------------------
// RecycleConnect V2 — School bulk-pickup centre matching.
//
// Uses the project's EXISTING `recycling_centres` data (same rows as Finder).
// No real-time pickup API exists, so this is a transparent local matcher:
//
//   1. Score each centre by requested-material overlap.
//   2. Boost centres whose city/state/address matches the school location.
//   3. Boost `home_collection` centres (they can actually do pickups).
//   4. Tie-break by rating.
//
// To connect a real recycling-centre pickup API later, replace
// `findSuitableCentres` internals with a fetch to that API and keep the
// return shape: [{ centre, score, reasons }]. Callers (SchoolRecycling page)
// do NOT need to change.
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

/**
 * Score one centre against a school request.
 * @param {object} centre - row from `recycling_centres`
 * @param {{ materials: string[], schoolAddress: string }} request
 * @returns {{ score: number, reasons: string[] }}
 */
export function scoreCentre(centre, request) {
  const wanted = request.materials || [];
  const centreMats = centre.materials || [];
  let score = 0;
  const reasons = [];

  // Only concrete materials participate in matching; "Others: ..." free text
  // is confirmed manually with the school later.
  const concrete = wanted.filter((m) => !isCustomMaterial(m));
  const matched = concrete.filter((m) => centreMats.includes(m));
  if (concrete.length > 0 && matched.length === 0) {
    // Centre cannot handle any requested material — push to the bottom.
    // (Material compatibility must outweigh pickup/rating bonuses.)
    score -= 10;
    reasons.push("Does not accept requested materials");
  } else if (matched.length > 0) {
    score += matched.length * 5;
    reasons.push(`Accepts ${matched.join(", ")}`);
  } else if (wanted.length > 0) {
    reasons.push("Custom materials — to confirm with school");
  }

  const loc = normalise(request.schoolAddress);
  if (loc) {
    const hay = normalise(`${centre.city || ""} ${centre.state || ""} ${centre.address || ""}`);
    // Match on city/state tokens (e.g. "Petaling Jaya", "Selangor", "Georgetown").
    const tokens = loc.split(/[^a-z]+/).filter((t) => t.length > 2);
    const hit = tokens.find((t) => hay.includes(t));
    if (hit) {
      score += 3;
      reasons.push(`Near ${centre.city || centre.state || "your area"}`);
    }
  }

  if (centre.home_collection) {
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

  return { score, reasons };
}

/**
 * Rank centres for a school bulk-pickup request.
 * @param {{ materials: string[], schoolAddress: string }} request
 * @param {Array} centres - rows from `recycling_centres`
 * @param {number} limit
 * @returns {Array<{ centre: object, score: number, reasons: string[] }>}
 */
export function findSuitableCentres(request, centres, limit = 3) {
  const list = Array.isArray(centres) ? centres : [];
  return list
    .map((centre) => {
      const { score, reasons } = scoreCentre(centre, request);
      return { centre, score, reasons };
    })
    .sort((a, b) => b.score - a.score || (b.centre.rating || 0) - (a.centre.rating || 0))
    .slice(0, limit);
}

/** Convenience: the single nearest suitable centre (or null). */
export function pickBestCentre(request, centres) {
  const ranked = findSuitableCentres(request, centres, 1);
  return ranked.length > 0 ? ranked[0] : null;
}

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
