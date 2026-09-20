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
  {
    code: "1",
    name: "PET / PETE",
    recyclable: "Widely recycled",
    difficulty: "Easy",
    examples: "Mineral water bottles, soft drink bottles, food trays",
    how: "Empty, rinse, remove the label and cap, then flatten before dropping off.",
    impact: "Recycling 1 kg of PET saves about 1.5 kg of CO₂ and keeps bottles out of Malaysian rivers.",
  },
  {
    code: "2",
    name: "HDPE",
    recyclable: "Widely recycled",
    difficulty: "Easy",
    examples: "Milk jugs, detergent bottles, shampoo bottles",
    how: "Rinse out residue and keep the cap off. Colour-sorted HDPE fetches a better price.",
    impact: "Strong and reusable — HDPE becomes drainage pipes and recycling bins.",
  },
  {
    code: "3",
    name: "PVC",
    recyclable: "Rarely recycled",
    difficulty: "Hard",
    examples: "Pipes, cling film, blister packaging",
    how: "Not accepted at most kerbside centres. Send to specialist construction-waste collectors.",
    impact: "Releases chlorine compounds when burned — never open-burn PVC.",
  },
  {
    code: "4",
    name: "LDPE",
    recyclable: "Sometimes recycled",
    difficulty: "Medium",
    examples: "Plastic bags, bread bags, bubble wrap",
    how: "Keep clean and dry, bundle bags together and use supermarket soft-plastic bins.",
    impact: "Light films clog drains and cause flash floods in Kuala Lumpur.",
  },
  {
    code: "5",
    name: "PP",
    recyclable: "Increasingly recycled",
    difficulty: "Medium",
    examples: "Takeaway containers, straws, bottle caps",
    how: "Wash off oil and food. Oily PP is usually rejected by buyers.",
    impact: "Malaysia's tapau culture makes PP one of our fastest-growing waste streams.",
  },
  {
    code: "6",
    name: "PS",
    recyclable: "Rarely recycled",
    difficulty: "Hard",
    examples: "Polystyrene foam boxes, disposable cups",
    how: "Avoid where possible. A few drop-off points compress clean foam for reprocessing.",
    impact: "Breaks into microplastics that marine life mistake for food.",
  },
  {
    code: "7",
    name: "Others",
    recyclable: "Depends on the blend",
    difficulty: "Hard",
    examples: "Multilayer pouches, melamine, polycarbonate",
    how: "Check with your local centre — most mixed plastics go to landfill.",
    impact: "Design-for-recycling is the only real solution for category 7.",
  },
];

export const LEARN_TOPICS = [
  {
    title: "Paper & Cardboard",
    icon: "Newspaper",
    tint: "amber",
    recyclable: "Yes — up to 7 times",
    tips: [
      "Keep paper dry; wet paper loses its fibre value.",
      "Flatten cardboard boxes and remove tape.",
      "Greasy pizza boxes: tear off the clean lid, bin the oily base.",
    ],
    impact: "Every tonne of recycled paper saves around 17 trees and 26,000 litres of water.",
  },
  {
    title: "Glass",
    icon: "Wine",
    tint: "sky",
    recyclable: "Yes — infinitely",
    tips: [
      "Rinse jars and bottles, lids removed.",
      "Separate clear, green and brown glass if your centre asks.",
      "Broken glass: wrap safely and label it before drop-off.",
    ],
    impact: "Glass never loses quality when recycled — melting cullet uses 30% less energy than raw sand.",
  },
  {
    title: "Metal & Aluminium",
    icon: "Recycle",
    tint: "slate",
    recyclable: "Yes — highest value",
    tips: [
      "Crush aluminium cans to save space.",
      "Rinse tin cans; leave the label on, it burns off in smelting.",
      "Scrap dealers in Malaysia pay cash per kg for aluminium and copper.",
    ],
    impact: "Recycling one aluminium can saves enough energy to run a TV for three hours.",
  },
  {
    title: "Electronics (E-Waste)",
    icon: "Smartphone",
    tint: "violet",
    recyclable: "Yes — at licensed collectors",
    tips: [
      "Wipe your data before handing over any device.",
      "Never bin e-waste — it is scheduled waste under Malaysian law.",
      "Use DOE-registered e-waste collectors or mall drop-off boxes.",
    ],
    impact: "One tonne of phone circuit boards holds more gold than 17 tonnes of gold ore.",
  },
  {
    title: "Batteries",
    icon: "BatteryCharging",
    tint: "rose",
    recyclable: "Yes — special handling",
    tips: [
      "Tape the terminals of lithium batteries to prevent fires.",
      "Drop off at supermarket or electronics-store battery bins.",
      "Never throw batteries into general waste or water.",
    ],
    impact: "A single button cell can contaminate 600,000 litres of water with heavy metals.",
  },
  {
    title: "Used Cooking Oil",
    icon: "Droplets",
    tint: "amber",
    recyclable: "Yes — becomes biodiesel",
    tips: [
      "Cool the oil and pour it into a sealed plastic bottle.",
      "Strain out food bits — buyers pay more for clean oil.",
      "Many Malaysian collectors pay RM1.50–RM2.50 per kg.",
    ],
    impact: "One litre of oil poured down the sink can pollute a million litres of water.",
  },
  {
    title: "Food Waste",
    icon: "Apple",
    tint: "emerald",
    recyclable: "Compost it",
    tips: [
      "Start a simple bokashi or takakura bin at home.",
      "Keep meat and dairy out of open compost.",
      "Finished compost feeds your garden instead of the landfill.",
    ],
    impact: "Food waste makes up around 44% of Malaysia's household rubbish.",
  },
];

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