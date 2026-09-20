-- Restore OLD project rewards to their ORIGINAL state (pre-V2).
-- Run this ONLY in the OLD/shared Supabase project after splitting, to remove
-- every V2 addition (new rows + changed prices) from the old website.
-- It rebuilds the rewards table EXACTLY as the original seed had it.
--
-- NOTE: users' redeemed_rewards lists store reward IDs. After this rebuild,
-- old redeemed IDs will dangle harmlessly (those items simply show as
-- redeemable again). This affects the old site only.
-- NEVER run this in the NEW V2 project.
--
-- FULL V2 FOOTPRINT AUDIT (old project) — what else V2 left behind, and why
-- each item is INVISIBLE to the old website (old code never reads it):
--   Tables: school_pickup_requests, school_pickup_messages, eco_point_transactions
--   Columns: recycle_logs(weight_g, points_base, points_bonus, client_submission_id),
--     rewards(reward_kind, impact_note, tier_min_grams, stock_total, stock_left,
--     holder_name, holder_at), school_pickup_requests(+ review/rec columns),
--     eco_profiles(is_public)
--   Policies: public_read_leaderboard (+ V2 insert/admin policies), storage
--     uploads INSERT/SELECT (old site never uploads — harmless)
--   challenges table: NEVER touched.
-- The ONLY visible change was rewards rows/prices — fixed by the rebuild above.
--
-- OPTIONAL deep cleanup: drop the V2-only tables entirely. ONLY do this after
-- confirming they hold no submissions you need:
--   SELECT count(*) FROM school_pickup_requests;
--   SELECT count(*) FROM school_pickup_messages;
--   SELECT count(*) FROM eco_point_transactions;
-- If all zero, you may run:
--   DROP TABLE IF EXISTS school_pickup_messages;
--   DROP TABLE IF EXISTS school_pickup_requests;
--   DROP TABLE IF EXISTS eco_point_transactions;
-- (Leave added COLUMNS in place — dropping them risks nothing gained and the
-- statements are harder to undo. Old code ignores unknown columns.)

DELETE FROM rewards;

INSERT INTO rewards (id, name, description, eco_points_cost, category, available) VALUES
(gen_random_uuid(), 'Recycled Tote Bag', 'Eco-friendly tote bag made from recycled plastic bottles. Strong, washable, and foldable.', 150, 'Eco Product', TRUE),
(gen_random_uuid(), 'Bamboo Toothbrush Set', 'Set of 4 biodegradable bamboo toothbrushes. Zero plastic, compostable handles.', 100, 'Eco Product', TRUE),
(gen_random_uuid(), 'Stainless Steel Straw Set', 'Set of 4 stainless steel straws with cleaning brush. Reusable and portable.', 120, 'Eco Product', TRUE),
(gen_random_uuid(), 'Beeswax Food Wraps (3pk)', 'Reusable beeswax wraps to replace plastic cling film. Set of 3 assorted sizes.', 200, 'Eco Product', TRUE),
(gen_random_uuid(), 'Recycled Notebook', 'A5 notebook made from 100% post-consumer recycled paper. 80 pages, kraft cover.', 80, 'Stationery', TRUE),
(gen_random_uuid(), 'Seed Bomb Pack (5pk)', 'Throw-and-grow seed bombs with native Malaysian wildflowers. Perfect for balcony gardens.', 100, 'Eco Product', TRUE),
(gen_random_uuid(), 'Compostable Phone Case', 'Plant-based phone case that fully composts. Fits iPhone & Samsung models.', 250, 'Accessory', TRUE),
(gen_random_uuid(), 'Solar Power Bank (5000mAh)', 'Compact solar-powered charger for your devices. Perfect for outdoor use.', 500, 'Tech', TRUE),
(gen_random_uuid(), 'RM5 GrabFood Voucher', 'Redeem RM5 off your next GrabFood order. One-time use.', 300, 'Voucher', TRUE),
(gen_random_uuid(), 'RM10 Touch n Go eWallet Credit', 'Top up your Touch n Go eWallet with RM10 credit.', 500, 'Voucher', TRUE),
(gen_random_uuid(), 'Reusable Water Bottle', 'Stainless steel vacuum-insulated water bottle (500ml). Keeps drinks cold 24hrs or hot 12hrs.', 350, 'Eco Product', TRUE),
(gen_random_uuid(), 'Eco Lunch Box Set', 'Bamboo fibre lunch box with carry strap and cutlery set. Microwave-safe.', 400, 'Eco Product', TRUE),
(gen_random_uuid(), 'Tree Planting Certificate', 'We plant a native Malaysian tree in your name and send you a digital certificate with GPS coordinates.', 600, 'Impact', TRUE),
(gen_random_uuid(), 'RM20 Shopee Voucher', 'Redeem RM20 off your next Shopee purchase.', 800, 'Voucher', TRUE),
(gen_random_uuid(), 'Zero Waste Starter Kit', 'Complete starter kit: bamboo toothbrush, straw set, beeswax wraps, tote bag, and seed bombs in a gift box.', 900, 'Bundle', TRUE);
