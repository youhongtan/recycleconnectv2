export const MATERIALS = [
  "Plastic",
  "Paper",
  "Glass",
  "Metal",
  "Electronics",
  "Batteries",
  "Clothes",
  "Cooking Oil",
];

// Display labels only — matching/storage always use the English values above.
export const MATERIAL_KEY = {
  Plastic: "matPlastic",
  Paper: "matPaper",
  Glass: "matGlass",
  Metal: "matMetal",
  Electronics: "matElec",
  Batteries: "matBatt",
  Clothes: "matClothes",
  "Cooking Oil": "matOil",
};

export const PLASTIC_TYPES = [
  { code: "1", difficulty: "Easy" },
  { code: "2", difficulty: "Easy" },
  { code: "3", difficulty: "Hard" },
  { code: "4", difficulty: "Medium" },
  { code: "5", difficulty: "Medium" },
  { code: "6", difficulty: "Hard" },
  { code: "7", difficulty: "Hard" },
];
// Display text lives in i18n (pl0..pl6 keys). Difficulty drives badge colour only.

export const LEARN_TOPICS = [
  { title: "Paper & Cardboard", icon: "Newspaper" },
  { title: "Glass", icon: "Wine" },
  { title: "Metal & Aluminium", icon: "Recycle" },
  { title: "Electronics (E-Waste)", icon: "Smartphone" },
  { title: "Batteries", icon: "BatteryCharging" },
  { title: "Used Cooking Oil", icon: "Droplets" },
  { title: "Food Waste", icon: "Apple" },
];
// Display text lives in i18n (lt0..lt6 keys). Only icon + stable title-key
// remain here. Do NOT re-add unsourced statistics to this file.

export const POLLUTION_STATS = [
  { labelKey: "polStat1L", value: 39000, suffix: "", noteKey: "polStat1N" },
  { labelKey: "polStat2L", value: 37.9, suffix: "%", decimals: 1 },
  { labelKey: "polStat3L", value: 40, suffix: "%" },
  { labelKey: "polStat4L", value: 137, suffix: "", noteKey: "polStat4N" },
];

export const WASTE_COMPOSITION = [
  { name: "Food waste", value: 44 },
  { name: "Plastic", value: 13 },
  { name: "Paper", value: 9 },
  { name: "Others", value: 15 },
  { name: "Garden", value: 8 },
  { name: "Metal & Glass", value: 11 },
];

// Removed: unverified yearly recycling-rate series (old 35.4% etc.).
// The Pollution page now shows only the 2024 rate (37.9%). Do not re-add
// yearly values without a verified source for EVERY year displayed.

export const ECO_POINTS = {
  Plastic: 5,
  Paper: 3,
  Glass: 3,
  Metal: 4,
  Electronics: 20,
  Batteries: 15,
  Clothes: 5,
  "Cooking Oil": 10,
};

export const LEVEL_THRESHOLD = 500;

export function getLevel(xp) {
  return Math.floor((xp || 0) / LEVEL_THRESHOLD) + 1;
}

export function getLevelProgress(xp) {
  const inLevel = (xp || 0) % LEVEL_THRESHOLD;
  return Math.round((inLevel / LEVEL_THRESHOLD) * 100);
}