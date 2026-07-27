-- RecycleConnect Seed Data
-- Run this AFTER migration.sql to populate real data
-- Safe to run multiple times (uses ON CONFLICT / DELETE + INSERT)

-- ============================================================
-- RECYCLING CENTRES (real locations across Malaysia)
-- ============================================================
DELETE FROM recycling_centres;

INSERT INTO recycling_centres (id, name, description, address, city, state, lat, lng, hours, contact, materials, category, pays_cash, reward_points, home_collection, rating) VALUES
-- Klang Valley - Petaling Jaya
(
  gen_random_uuid(),
  'IPC Recycling & Buy-Back Centre',
  'Malaysia''s first mall-based recycling centre. Earn Tack Points for every drop-off. Dedicated 10-min drop-off parking bay.',
  'Level P1 (near Ladies Parking), IPC Shopping Centre, 2 Jalan PJU 7/2, Mutiara Damansara',
  'Petaling Jaya',
  'Selangor',
  3.1557, 101.6107,
  'Daily 8am–10pm',
  '017-804 7033',
  ARRAY['Paper', 'Plastic', 'Glass', 'Metal', 'Electronics', 'Batteries', 'Clothes', 'Cooking Oil'],
  'Buy-Back Centre',
  TRUE, TRUE, FALSE,
  4.6
),
(
  gen_random_uuid(),
  '1Recycling Centre (1RC) @ 1 Utama',
  'One-stop recycling hub at Malaysia''s first Green Mall. Earn Green Points via SuperApp, convert to ForestONE water to plant trees.',
  'B2 Highstreet, 1 Utama Shopping Centre, 1 Lebuh Bandar Utama, Bandar Utama',
  'Petaling Jaya',
  'Selangor',
  3.1506, 101.6154,
  'Daily 10am–10pm',
  '03-7725 5788',
  ARRAY['Paper', 'Plastic', 'Metal', 'Electronics', 'Clothes'],
  'Mall Recycling Hub',
  FALSE, TRUE, FALSE,
  4.5
),
(
  gen_random_uuid(),
  'PJ Eco Recycling Plaza',
  'Community recycling plaza accepting books, stationery, e-waste, and more. Runs educational workshops on waste reduction.',
  'Jalan SS8/39, Sungai Way Free Trade Industrial Zone',
  'Petaling Jaya',
  'Selangor',
  3.0823, 101.6145,
  'Tue–Sun 9am–4pm (Mon closed)',
  '03-7865 8049',
  ARRAY['Paper', 'Plastic', 'Glass', 'Metal', 'Electronics', 'Batteries', 'Clothes'],
  'Community Recycling Plaza',
  FALSE, FALSE, FALSE,
  4.3
),
-- Kuala Lumpur
(
  gen_random_uuid(),
  'Thanam Industry Sdn Bhd',
  'One of Malaysia''s oldest scrap metal and waste recyclers. Accepts ferrous/non-ferrous metals, plastics, papers, e-waste and more.',
  '631 Jalan Lima, Off Jalan Chan Sow Lin',
  'Kuala Lumpur',
  'Kuala Lumpur',
  3.1217, 101.7189,
  'Mon–Sat 8am–6pm (Sun closed)',
  '019-315 5261',
  ARRAY['Paper', 'Plastic', 'Metal', 'Electronics', 'Batteries', 'Cooking Oil'],
  'Scrap & Waste Recycler',
  TRUE, FALSE, TRUE,
  4.4
),
(
  gen_random_uuid(),
  'Tzu Chi Happy Garden Recycling Centre',
  'Buddhist Tzu Chi Foundation recycling centre. Part of their 160+ centres nationwide. Accepts wide range of recyclables.',
  'Happy Garden, Jalan Lazat, Sri Petaling',
  'Kuala Lumpur',
  'Kuala Lumpur',
  3.0645, 101.6885,
  'Daily 8am–5pm',
  '03-9058 2190',
  ARRAY['Paper', 'Plastic', 'Glass', 'Metal', 'Electronics', 'Clothes'],
  'NGO Recycling Centre',
  FALSE, FALSE, FALSE,
  4.5
),
(
  gen_random_uuid(),
  'TRASH4CASH KL & Selangor',
  'Drop-off points across KL & Selangor that pay cash for recyclables. Accepts books, e-waste, used cooking oil, appliances.',
  'Various locations across Kuala Lumpur',
  'Kuala Lumpur',
  'Kuala Lumpur',
  3.1390, 101.6869,
  'By appointment',
  'Instagram @trash4cashklselangor',
  ARRAY['Paper', 'Plastic', 'Metal', 'Electronics', 'Cooking Oil', 'Clothes'],
  'Buy-Back Collection',
  TRUE, FALSE, FALSE,
  4.2
),
-- Putrajaya
(
  gen_random_uuid(),
  'Pusat Kitar Semula Komuniti Putrajaya',
  'Community recycling centre serving Putrajaya residents. Accepts paper, plastic, appliances, metal and more.',
  'Jalan P9b, Presint 9',
  'Putrajaya',
  'Putrajaya',
  2.9273, 101.6893,
  'Daily 8:30am–3pm',
  '03-8890 1767',
  ARRAY['Paper', 'Plastic', 'Metal', 'Electronics', 'Batteries'],
  'Community Recycling Centre',
  FALSE, FALSE, FALSE,
  4.1
),
(
  gen_random_uuid(),
  'Alam Flora Drive Thru Recycling Centre (DTRC)',
  'Drive-thru recycling centre by Alam Flora. Drop off recyclables without leaving your car. Cash reward given.',
  '1 Jalan P5B, Presint 20',
  'Putrajaya',
  'Putrajaya',
  2.9012, 101.6714,
  'Mon–Fri 8am–5pm, Sat 8am–1pm',
  '03-2052 7745',
  ARRAY['Paper', 'Plastic', 'Glass', 'Metal', 'Electronics', 'Cooking Oil', 'Batteries'],
  'Drive-Thru Buy-Back',
  TRUE, FALSE, FALSE,
  4.3
),
-- Cyberjaya
(
  gen_random_uuid(),
  'Cyberjaya Recycling Centre',
  'Recycling centre serving the Cyberjaya community. Accepts paper, plastic, e-waste, used cooking oil and more.',
  'Jalan Teknokrat 5, Cyber 5',
  'Cyberjaya',
  'Selangor',
  2.9237, 101.6487,
  'Mon–Sat 9am–5pm',
  '03-8318 1660',
  ARRAY['Paper', 'Plastic', 'Metal', 'Electronics', 'Cooking Oil', 'Clothes'],
  'Community Recycling Centre',
  FALSE, FALSE, FALSE,
  4.0
),
-- Penang
(
  gen_random_uuid(),
  'Penang Green Council MAMPAN Centre',
  'Penang''s zero-waste directory and recycling hub. Supports 5Rs – Refuse, Reduce, Reuse, Recycle, Rot.',
  'No. 1, Jalan Seri Bahari, 11600 George Town',
  'George Town',
  'Penang',
  5.4145, 100.3293,
  'Mon–Fri 8am–5pm',
  '04-250 3322',
  ARRAY['Paper', 'Plastic', 'Glass', 'Metal', 'Electronics', 'Batteries', 'Clothes', 'Cooking Oil'],
  'Green Council Hub',
  FALSE, FALSE, FALSE,
  4.4
),
(
  gen_random_uuid(),
  'Pusat Kitar Semula Pulau Pinang',
  'Penang state recycling centre. Drop-off for household recyclables and e-waste.',
  'Jalan Sungai Dua, 11700 Gelugor',
  'George Town',
  'Penang',
  5.3553, 100.2950,
  'Tue–Sun 9am–5pm (Mon closed)',
  '04-658 4251',
  ARRAY['Paper', 'Plastic', 'Glass', 'Metal', 'Electronics'],
  'State Recycling Centre',
  FALSE, FALSE, FALSE,
  4.0
),
-- Johor
(
  gen_random_uuid(),
  'Pusat Kitar Semula Johor Bahru',
  'Johor Bahru community recycling drop-off. Accepts sorted household recyclables.',
  'Jalan Lingkaran Dalam, 81100 Johor Bahru',
  'Johor Bahru',
  'Johor',
  1.4927, 103.7414,
  'Mon–Sat 9am–5pm',
  '07-224 9635',
  ARRAY['Paper', 'Plastic', 'Glass', 'Metal', 'Electronics'],
  'Community Recycling Centre',
  FALSE, FALSE, FALSE,
  3.9
),
-- Melaka
(
  gen_random_uuid(),
  'Pusat Kitar Semula Melaka',
  'Melaka state recycling drop-off centre for household recyclables.',
  'Jalan Tun Perak, 75350 Melaka',
  'Melaka',
  'Melaka',
  2.2338, 102.2496,
  'Mon–Sat 8am–5pm',
  '06-282 6472',
  ARRAY['Paper', 'Plastic', 'Glass', 'Metal'],
  'Community Recycling Centre',
  FALSE, FALSE, FALSE,
  3.8
),
-- Perak
(
  gen_random_uuid(),
  'Pusat Kitar Semula Ipoh',
  'Perak state recycling drop-off centre. Accepts paper, plastic, glass and metal.',
  'Jalan Sultan Idris Shah, 30000 Ipoh',
  'Ipoh',
  'Perak',
  4.5981, 101.0897,
  'Mon–Sat 9am–5pm',
  '05-241 5523',
  ARRAY['Paper', 'Plastic', 'Glass', 'Metal'],
  'Community Recycling Centre',
  FALSE, FALSE, FALSE,
  3.7
),
-- Negeri Sembilan
(
  gen_random_uuid(),
  'Pusat Kitar Semula Seremban',
  'Negeri Sembilan recycling drop-off centre. Accepts sorted household recyclables.',
  'Jalan Tuanku Munawir, 70000 Seremban',
  'Seremban',
  'Negeri Sembilan',
  2.7286, 101.9412,
  'Mon–Sat 9am–5pm',
  '06-767 8891',
  ARRAY['Paper', 'Plastic', 'Glass', 'Metal', 'Electronics'],
  'Community Recycling Centre',
  FALSE, FALSE, FALSE,
  3.8
),
-- Pahang
(
  gen_random_uuid(),
  'Pusat Kitar Semula Kuantan',
  'Pahang state community recycling drop-off for household waste.',
  'Jalan Beserah, 25300 Kuantan',
  'Kuantan',
  'Pahang',
  3.8066, 103.3260,
  'Mon–Sat 9am–5pm',
  '09-513 8892',
  ARRAY['Paper', 'Plastic', 'Glass', 'Metal'],
  'Community Recycling Centre',
  FALSE, FALSE, FALSE,
  3.6
),
-- Kedah
(
  gen_random_uuid(),
  'Pusat Kitar Semula Alor Setar',
  'Kedah state recycling centre. Drop-off for paper, plastic, glass and metal.',
  'Jalan Sultanah, 05050 Alor Setar',
  'Alor Setar',
  'Kedah',
  6.1157, 100.3733,
  'Mon–Sat 9am–5pm',
  '04-734 5612',
  ARRAY['Paper', 'Plastic', 'Glass', 'Metal'],
  'Community Recycling Centre',
  FALSE, FALSE, FALSE,
  3.5
),
-- Kelantan
(
  gen_random_uuid(),
  'Pusat Kitar Semula Kota Bharu',
  'Kelantan state recycling drop-off centre.',
  'Jalan Sultan Yahya Petra, 15200 Kota Bharu',
  'Kota Bharu',
  'Kelantan',
  6.1303, 102.2371,
  'Mon–Sat 9am–5pm',
  '09-744 9123',
  ARRAY['Paper', 'Plastic', 'Glass', 'Metal'],
  'Community Recycling Centre',
  FALSE, FALSE, FALSE,
  3.4
),
-- Terengganu
(
  gen_random_uuid(),
  'Pusat Kitar Semula Kuala Terengganu',
  'Terengganu state recycling drop-off centre.',
  'Jalan Sultan Ismail, 20200 Kuala Terengganu',
  'Kuala Terengganu',
  'Terengganu',
  5.3295, 103.1395,
  'Mon–Sat 9am–5pm',
  '09-622 3344',
  ARRAY['Paper', 'Plastic', 'Glass', 'Metal'],
  'Community Recycling Centre',
  FALSE, FALSE, FALSE,
  3.5
),
-- Sabah
(
  gen_random_uuid(),
  'Pusat Kitar Semula Kota Kinabalu',
  'Sabah state recycling centre. Accepts sorted household recyclables.',
  'Jalan Lintas, 88300 Kota Kinabalu',
  'Kota Kinabalu',
  'Sabah',
  5.9561, 116.0740,
  'Mon–Sat 8am–5pm',
  '088-238 995',
  ARRAY['Paper', 'Plastic', 'Glass', 'Metal', 'Electronics'],
  'Community Recycling Centre',
  FALSE, FALSE, FALSE,
  3.9
),
-- Sarawak
(
  gen_random_uuid(),
  'Pusat Kitar Semula Kuching',
  'Sarawak state recycling centre. Drop-off for household recyclables.',
  'Jalan Demak Indah, Sejingkat, 93050 Kuching',
  'Kuching',
  'Sarawak',
  1.5766, 110.3569,
  'Mon–Sat 8am–5pm',
  '082-445 112',
  ARRAY['Paper', 'Plastic', 'Glass', 'Metal', 'Electronics'],
  'Community Recycling Centre',
  FALSE, FALSE, FALSE,
  3.8
);

-- ============================================================
-- REWARDS (redeemable with Eco Points)
-- ============================================================
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

-- ============================================================
-- CHALLENGES (daily and weekly)
-- ============================================================
DELETE FROM challenges;

INSERT INTO challenges (id, title, description, type, target, metric, xp_reward, eco_points_reward, badge, active) VALUES
-- Daily challenges
(gen_random_uuid(), 'First Recycle of the Day', 'Log your first recycling item of the day. Every journey starts with one step!', 'daily', 1, 'items_recycled', 50, 10, NULL, TRUE),
(gen_random_uuid(), 'Plastic Buster', 'Recycle at least 3 plastic items today. Beat plastic pollution one bottle at a time.', 'daily', 3, 'items_recycled', 80, 15, NULL, TRUE),
(gen_random_uuid(), 'Paper Saver', 'Recycle at least 2 kg of paper or cardboard today.', 'daily', 2, 'plastic_saved', 60, 10, NULL, TRUE),
(gen_random_uuid(), 'Streak Keeper', 'Maintain your recycling streak. Log at least one item to keep your streak alive!', 'daily', 1, 'streak_days', 30, 5, NULL, TRUE),
(gen_random_uuid(), 'E-Waste Warrior', 'Recycle at least 1 electronic item today. E-waste contains valuable materials!', 'daily', 1, 'items_recycled', 100, 20, NULL, TRUE),
(gen_random_uuid(), 'Metal Miner', 'Recycle at least 1 kg of metal/aluminium today.', 'daily', 1, 'plastic_saved', 70, 12, NULL, TRUE),
-- Weekly challenges
(gen_random_uuid(), 'Zero Waste Week', 'Recycle at least 10 items this week. Consistent effort makes a real difference!', 'weekly', 10, 'items_recycled', 200, 50, 'Recycling Novice', TRUE),
(gen_random_uuid(), 'Carbon Crusher', 'Reduce your carbon footprint by recycling 5 kg of materials this week.', 'weekly', 5, 'co2_reduced', 300, 60, 'Carbon Crusher', TRUE),
(gen_random_uuid(), 'Plastic-Free Champion', 'Recycle 10 plastic items this week. Malaysia aims to reduce 40% plastic waste by 2030!', 'weekly', 10, 'items_recycled', 250, 55, 'Plastic Champion', TRUE),
(gen_random_uuid(), 'Heavy Lifter', 'Recycle a total of 15 kg of materials this week. Every kg diverted from landfills counts!', 'weekly', 15, 'plastic_saved', 350, 80, 'Heavy Lifter', TRUE),
(gen_random_uuid(), 'Perfect Week', 'Log at least 1 item every day for 7 consecutive days. Consistency is key!', 'weekly', 7, 'streak_days', 500, 100, 'Perfect Week', TRUE),
(gen_random_uuid(), 'Eco Master', 'Recycle across at least 3 different material categories this week (plastic, paper, metal, glass, etc.)', 'weekly', 3, 'items_recycled', 400, 75, 'Eco Master', TRUE),
(gen_random_uuid(), 'Community Hero', 'Recycle 20 items this week and inspire others. Lead by example!', 'weekly', 20, 'items_recycled', 600, 120, 'Community Hero', TRUE);
