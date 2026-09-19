-- RecycleConnect V2 — meaningful reward prices + impact rewards.
-- Run AFTER migration_v3_grams_points.sql (needs reward_kind / impact_note).
-- Uses upserts by NAME: safe to run multiple times, never wipes other rows.
-- (Do NOT run the full seed.sql on a live shared project — it DELETES tables.)

-- Eco rewards (higher, meaningful prices) --------------------------------------
INSERT INTO rewards (id, name, description, eco_points_cost, category, available, reward_kind)
VALUES
  (gen_random_uuid(), 'Eco Sticker Pack', 'Set of recycled-paper stickers with Malaysian wildlife designs. For books, bottles and laptops.', 5000, 'Stationery', TRUE, 'eco'),
  (gen_random_uuid(), 'Reusable Eraser', 'Long-lasting plastic-free eraser in recycled packaging. A classroom essential.', 8000, 'Stationery', TRUE, 'eco'),
  (gen_random_uuid(), 'Eco Pencil', 'Sustainably grown bamboo pencil with recycled graphite core. Zero plastic.', 10000, 'Stationery', TRUE, 'eco'),
  (gen_random_uuid(), 'Recycled Notebook', 'A5 notebook made from 100% post-consumer recycled paper. 80 pages, kraft cover.', 15000, 'Stationery', TRUE, 'eco'),
  (gen_random_uuid(), 'Reusable Shopping Bag (Recycled PET)', 'Strong foldable shopping bag sewn from recycled plastic bottles.', 25000, 'Eco Product', TRUE, 'eco'),
  (gen_random_uuid(), 'Reusable Cutlery Set', 'Bamboo cutlery set with straw and carry pouch. Ditch single-use plastic.', 30000, 'Eco Product', TRUE, 'eco'),
  (gen_random_uuid(), 'Eco-Friendly Stationery Set', 'Complete school set: recycled notebooks, bamboo pencils, eraser and ruler in a recycled-paper box.', 40000, 'Bundle', TRUE, 'eco'),
  (gen_random_uuid(), 'Reusable Water Bottle', 'Stainless steel vacuum-insulated bottle (500ml). Cold 24h / hot 12h.', 50000, 'Eco Product', TRUE, 'eco'),
  (gen_random_uuid(), 'Eco Starter Kit', 'Zero-waste starter box: bottle, cutlery, straws, tote bag, beeswax wraps and seed bombs.', 75000, 'Bundle', TRUE, 'eco'),
  (gen_random_uuid(), 'Solar Power Bank (20000mAh)', 'High-capacity solar charger for devices. For the serious eco commuter.', 100000, 'Tech', TRUE, 'eco')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  eco_points_cost = EXCLUDED.eco_points_cost,
  category = EXCLUDED.category,
  available = EXCLUDED.available,
  reward_kind = EXCLUDED.reward_kind;

-- Impact rewards (contribution tracking — NO verified external partner) --------
INSERT INTO rewards (id, name, description, eco_points_cost, category, available, reward_kind, impact_note)
VALUES
  (gen_random_uuid(), 'Plant 1 Tree', 'Fund one native Malaysian tree planting contribution, tracked in your impact history.', 10000, 'Impact', TRUE, 'impact', 'Impact Contribution — tracked in-app. No verified planting partner; we do not claim a real tree was planted.'),
  (gen_random_uuid(), 'Plant 2 Trees', 'Fund two native Malaysian tree planting contributions, tracked in your impact history.', 20000, 'Impact', TRUE, 'impact', 'Impact Contribution — tracked in-app. No verified planting partner; we do not claim real trees were planted.'),
  (gen_random_uuid(), 'Support a Cleanup', 'RM1 impact contribution towards community cleanup efforts, tracked in your history.', 5000, 'Impact', TRUE, 'impact', 'Impact Contribution — RM1 tracked in-app. No verified donation partner; we do not claim money was donated.'),
  (gen_random_uuid(), 'Community Cleanup', 'RM5 impact contribution towards community cleanup efforts, tracked in your history.', 25000, 'Impact', TRUE, 'impact', 'Impact Contribution — RM5 tracked in-app. No verified donation partner; we do not claim money was donated.'),
  (gen_random_uuid(), 'Larger Environmental Support', 'RM10 impact contribution towards environmental programmes, tracked in your history.', 50000, 'Impact', TRUE, 'impact', 'Impact Contribution — RM10 tracked in-app. No verified donation partner; we do not claim money was donated.')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  eco_points_cost = EXCLUDED.eco_points_cost,
  category = EXCLUDED.category,
  available = EXCLUDED.available,
  reward_kind = EXCLUDED.reward_kind,
  impact_note = EXCLUDED.impact_note;
