-- GenRob Seed Data: 20260919000004_seed_kirana.sql
-- Demo Kirana: "Sri Balaji Kirana & General Stores", Koti / Begum Bazar, Hyderabad

DO $$
DECLARE
    v_shop_id UUID := '11111111-1111-1111-1111-111111111111';
    v_user_id UUID := '22222222-2222-2222-2222-222222222222';
    
    -- Products
    p_atta UUID := 'a0000001-0000-0000-0000-000000000001';
    p_basmati UUID := 'a0000001-0000-0000-0000-000000000002';
    p_sona UUID := 'a0000001-0000-0000-0000-000000000003';
    p_toor UUID := 'a0000001-0000-0000-0000-000000000004';
    p_moong UUID := 'a0000001-0000-0000-0000-000000000005';
    p_chana UUID := 'a0000001-0000-0000-0000-000000000006';
    p_sunflower UUID := 'a0000001-0000-0000-0000-000000000007';
    p_groundnut UUID := 'a0000001-0000-0000-0000-000000000008';
    p_mustard UUID := 'a0000001-0000-0000-0000-000000000009';
    p_salt UUID := 'a0000001-0000-0000-0000-000000000010';
    p_garam UUID := 'a0000001-0000-0000-0000-000000000011';
    p_haldi UUID := 'a0000001-0000-0000-0000-000000000012';
    p_milk UUID := 'a0000001-0000-0000-0000-000000000013';
    p_tea UUID := 'a0000001-0000-0000-0000-000000000014';
    p_coffee UUID := 'a0000001-0000-0000-0000-000000000015';
    p_surf UUID := 'a0000001-0000-0000-0000-000000000016';
    p_lifebuoy UUID := 'a0000001-0000-0000-0000-000000000017';
    p_maggi UUID := 'a0000001-0000-0000-0000-000000000018';

    -- Customers
    c_ramesh UUID := 'c0000001-0000-0000-0000-000000000001';
    c_lakshmi UUID := 'c0000001-0000-0000-0000-000000000002';
    c_venkat UUID := 'c0000001-0000-0000-0000-000000000003';
    c_suresh UUID := 'c0000001-0000-0000-0000-000000000004';

    -- Suppliers
    s_laxmi UUID := 'e0000001-0000-0000-0000-000000000001';
    s_ganesh UUID := 'e0000001-0000-0000-0000-000000000002';
    s_itc UUID := 'e0000001-0000-0000-0000-000000000003';

BEGIN
    -- 1. Insert Shop
    INSERT INTO public.shops (id, name, owner_name, phone, gstin, address, city, state, primary_language)
    VALUES (
        v_shop_id,
        'Sri Balaji Kirana & General Stores',
        'Rajesh Sharma',
        '+919876543210',
        '36AAAAA0000A1Z5',
        'Shop #4, Begum Bazar Main Road',
        'Hyderabad',
        'Telangana',
        'hi'
    ) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

    -- 2. Insert User profile
    INSERT INTO public.users (id, shop_id, phone, full_name, role, preferred_language)
    VALUES (
        v_user_id,
        v_shop_id,
        '+919876543210',
        'Rajesh Sharma',
        'owner',
        'hi'
    ) ON CONFLICT (id) DO NOTHING;

    -- 3. Insert Suppliers
    INSERT INTO public.suppliers (id, shop_id, name, phone, contact_person, categories, payment_terms)
    VALUES
    (s_laxmi, v_shop_id, 'Sri Laxmi Agro Traders', '+919123456780', 'Laxman Rao', ARRAY['Grains', 'Dals'], 'Net 15 days'),
    (s_ganesh, v_shop_id, 'Sri Ganesh Oil Depot', '+919123456781', 'Ganesh Gupta', ARRAY['Edible Oils'], 'Immediate Cheque'),
    (s_itc, v_shop_id, 'ITC Begum Bazar Agency', '+919123456782', 'Sunil Kumar', ARRAY['Atta', 'Snacks', 'Soaps'], 'Weekly on Monday')
    ON CONFLICT (id) DO NOTHING;

    -- 4. Insert Customers
    INSERT INTO public.customers (id, shop_id, name, phone, current_credit, credit_limit, notes)
    VALUES
    (c_ramesh, v_shop_id, 'Ramesh Kumar (Tailor)', '+919848012345', 1850.00, 5000.00, 'Monthly settlement on 1st'),
    (c_lakshmi, v_shop_id, 'Lakshmi Devi (Teacher)', '+919848054321', 650.00, 3000.00, 'Pays via PhonePe bi-weekly'),
    (c_venkat, v_shop_id, 'Venkatesh Goud (Auto)', '+919848099887', 3200.00, 4000.00, 'Frequent small purchases'),
    (c_suresh, v_shop_id, 'Suresh Patel (Carpenter)', '+919848011223', 0.00, 2500.00, 'Clean record, settled last week')
    ON CONFLICT (id) DO NOTHING;

    -- 5. Insert Products
    -- Notice: Several products are intentionally seeded below reorder_threshold to trigger immediate alerts!
    -- Current stock is in base_unit (e.g. kg, litre, piece)
    INSERT INTO public.products (id, shop_id, name, category, unit, base_unit, unit_conversion, reorder_threshold, current_stock, price, cost_price, sku)
    VALUES
    -- Grains & Atta
    (p_atta, v_shop_id, 'Aashirvaad Shudh Chakki Atta', 'Grains & Atta', 'bag', 'kg', '{"bag": 50, "packet": 10, "kg": 1}'::jsonb, 100.00, 250.00, 2100.00, 1950.00, 'ATT-AAS-50K'),
    (p_basmati, v_shop_id, 'India Gate Feast Rozzana Basmati Rice', 'Grains & Atta', 'bag', 'kg', '{"bag": 25, "packet": 5, "kg": 1}'::jsonb, 75.00, 150.00, 1900.00, 1720.00, 'RIC-ING-25K'),
    (p_sona, v_shop_id, 'Sona Masoori HMT Rice Premium', 'Grains & Atta', 'bag', 'kg', '{"bag": 25, "kg": 1}'::jsonb, 100.00, 300.00, 1450.00, 1300.00, 'RIC-SON-25K'),

    -- Dals / Pulses (Toor Dal is LOW STOCK: 20kg vs 80kg threshold!)
    (p_toor, v_shop_id, 'Tata Sampann Toor Dal Unpolished', 'Pulses & Dals', 'bag', 'kg', '{"bag": 50, "kg": 1, "packet": 1}'::jsonb, 80.00, 20.00, 8500.00, 7800.00, 'DAL-TOO-50K'),
    (p_moong, v_shop_id, 'Desi Moong Dal Dhuli', 'Pulses & Dals', 'bag', 'kg', '{"bag": 30, "kg": 1}'::jsonb, 50.00, 90.00, 3900.00, 3450.00, 'DAL-MOO-30K'),
    (p_chana, v_shop_id, 'Premium Chana Dal', 'Pulses & Dals', 'bag', 'kg', '{"bag": 50, "kg": 1}'::jsonb, 60.00, 120.00, 4200.00, 3800.00, 'DAL-CHA-50K'),

    -- Edible Oils (Sunflower Oil is LOW STOCK: 2 tins = 30L vs 60L threshold!)
    (p_sunflower, v_shop_id, 'Fortune Sunlite Sunflower Oil', 'Edible Oils', 'tin', 'litre', '{"tin": 15, "pouch": 1, "litre": 1}'::jsonb, 60.00, 30.00, 2150.00, 1980.00, 'OIL-SUN-15T'),
    (p_groundnut, v_shop_id, 'Gemini Pure Groundnut Oil', 'Edible Oils', 'tin', 'litre', '{"tin": 15, "litre": 1}'::jsonb, 45.00, 75.00, 2450.00, 2280.00, 'OIL-GRO-15T'),
    (p_mustard, v_shop_id, 'Dhara Kachi Ghani Mustard Oil', 'Edible Oils', 'carton', 'litre', '{"carton": 12, "bottle": 1, "litre": 1}'::jsonb, 24.00, 48.00, 1850.00, 1680.00, 'OIL-MUS-12B'),

    -- Spices & Condiments
    (p_salt, v_shop_id, 'Tata Salt Vacuum Evaporated Iodized', 'Spices & Masalas', 'carton', 'packet', '{"carton": 25, "packet": 1}'::jsonb, 50.00, 125.00, 675.00, 580.00, 'SPC-SAL-25P'),
    (p_garam, v_shop_id, 'Everest Garam Masala 100g', 'Spices & Masalas', 'box', 'piece', '{"box": 20, "piece": 1}'::jsonb, 30.00, 60.00, 1800.00, 1550.00, 'SPC-GAR-20P'),
    (p_haldi, v_shop_id, 'MDH Agmark Haldi Powder 500g', 'Spices & Masalas', 'box', 'piece', '{"box": 24, "piece": 1}'::jsonb, 25.00, 72.00, 2640.00, 2300.00, 'SPC-HAL-24P'),

    -- Dairy & Beverages
    (p_milk, v_shop_id, 'Amul Taaza Homogenised Toned Milk 1L', 'Dairy & Beverages', 'crate', 'litre', '{"crate": 12, "pouch": 1, "litre": 1}'::jsonb, 24.00, 48.00, 840.00, 760.00, 'BEV-MLK-12L'),
    (p_tea, v_shop_id, 'Brooke Bond Red Label Tea 250g', 'Dairy & Beverages', 'carton', 'piece', '{"carton": 40, "piece": 1}'::jsonb, 40.00, 80.00, 5200.00, 4600.00, 'BEV-TEA-40P'),
    (p_coffee, v_shop_id, 'Bru Gold Instant Coffee 50g', 'Dairy & Beverages', 'box', 'piece', '{"box": 24, "piece": 1}'::jsonb, 20.00, 36.00, 3600.00, 3120.00, 'BEV-COF-24P'),

    -- Cleaning & Hygiene (Lifebuoy Soap is CRITICALLY LOW: 4 pcs vs 36 pcs threshold!)
    (p_surf, v_shop_id, 'Surf Excel Easy Wash Detergent Powder 1kg', 'Cleaning & Household', 'carton', 'packet', '{"carton": 18, "packet": 1}'::jsonb, 36.00, 54.00, 2700.00, 2430.00, 'CLN-SRF-18P'),
    (p_lifebuoy, v_shop_id, 'Lifebuoy Total Germ Protection Soap 125g', 'Cleaning & Household', 'carton', 'piece', '{"carton": 36, "piece": 1}'::jsonb, 36.00, 4.00, 1440.00, 1260.00, 'CLN-LIF-36P'),

    -- Snacks
    (p_maggi, v_shop_id, 'Maggi 2-Minute Noodles Masala 70g', 'Packaged Food', 'carton', 'piece', '{"carton": 96, "packet": 1, "piece": 1}'::jsonb, 96.00, 192.00, 1344.00, 1150.00, 'SNK-MAG-96P')
    ON CONFLICT (id) DO UPDATE SET 
        current_stock = EXCLUDED.current_stock,
        reorder_threshold = EXCLUDED.reorder_threshold;

    -- 6. Insert Product Trade Vocabulary Aliases (Hindi, Telugu, Hinglish, Nicknames)
    INSERT INTO public.product_aliases (shop_id, product_id, alias_text, language)
    VALUES
    -- Aashirvaad Atta
    (v_shop_id, p_atta, 'आशीर्वाद आटा', 'hi'),
    (v_shop_id, p_atta, 'गेहूं का आटा', 'hi'),
    (v_shop_id, p_atta, 'Aashirvaad godhumapindi', 'te'),
    (v_shop_id, p_atta, 'గోధుమ పిండి', 'te'),
    (v_shop_id, p_atta, 'atta bora', 'hi'),
    (v_shop_id, p_atta, '50kg atta bag', 'en'),

    -- Basmati Rice
    (v_shop_id, p_basmati, 'बासमती चावल', 'hi'),
    (v_shop_id, p_basmati, 'India Gate basmati', 'en'),
    (v_shop_id, p_basmati, 'బిర్యానీ బియ్యం', 'te'),
    (v_shop_id, p_basmati, 'biryani biyyam', 'te'),

    -- Sona Masoori
    (v_shop_id, p_sona, 'सोना मसूरी चावल', 'hi'),
    (v_shop_id, p_sona, 'సోనా మసూరి బియ్యం', 'te'),
    (v_shop_id, p_sona, 'Kurnool sona rice', 'mixed'),
    (v_shop_id, p_sona, 'regular rice bag', 'en'),

    -- Toor Dal
    (v_shop_id, p_toor, 'तूअर दाल', 'hi'),
    (v_shop_id, p_toor, 'अरहर दाल', 'hi'),
    (v_shop_id, p_toor, 'కందిపప్పు', 'te'),
    (v_shop_id, p_toor, 'kandi pappu', 'te'),
    (v_shop_id, p_toor, 'Tata toor dal', 'mixed'),

    -- Sunflower Oil
    (v_shop_id, p_sunflower, 'फॉर्च्यून सूरजमुखी तेल', 'hi'),
    (v_shop_id, p_sunflower, 'तेल का पीपा', 'hi'),
    (v_shop_id, p_sunflower, 'సూర్యకాంతి నూనె డబ్బా', 'te'),
    (v_shop_id, p_sunflower, 'Fortune oil tin', 'en'),
    (v_shop_id, p_sunflower, 'sunflower packet', 'en'),

    -- Salt
    (v_shop_id, p_salt, 'टाटा नमक', 'hi'),
    (v_shop_id, p_salt, 'namak packet', 'hi'),
    (v_shop_id, p_salt, 'టాటా ఉప్పు', 'te'),
    (v_shop_id, p_salt, 'uppu packet', 'te'),

    -- Lifebuoy
    (v_shop_id, p_lifebuoy, 'लाइफबॉय साबुन', 'hi'),
    (v_shop_id, p_lifebuoy, 'లైఫ్‌బాయ్ సబ్బు', 'te'),
    (v_shop_id, p_lifebuoy, 'red soap', 'en'),
    (v_shop_id, p_lifebuoy, 'Lifebuoy petti', 'mixed'),

    -- Maggi
    (v_shop_id, p_maggi, 'मैगी नूडल्स', 'hi'),
    (v_shop_id, p_maggi, 'మ్యాగీ నూడుల్స్', 'te'),
    (v_shop_id, p_maggi, 'Maggi petti', 'mixed'),
    (v_shop_id, p_maggi, 'two minute noodles', 'en')
    ON CONFLICT DO NOTHING;

    -- 7. Seed Low-Stock Alerts for Items below threshold
    INSERT INTO public.alerts (shop_id, product_id, type, status, severity, message)
    VALUES
    (v_shop_id, p_toor, 'low_stock', 'active', 'warning', 'कम स्टॉक चेतावनी: Tata Sampann Toor Dal सिर्फ 20.00 kg बाकी है (सीमा: 80.00 kg)'),
    (v_shop_id, p_sunflower, 'low_stock', 'active', 'warning', 'कम स्टॉक चेतावनी: Fortune Sunlite Sunflower Oil सिर्फ 30.00 litre (2 tin) बाकी है (सीमा: 60.00 litre)'),
    (v_shop_id, p_lifebuoy, 'low_stock', 'active', 'critical', 'अति गंभीर स्टॉक: Lifebuoy Total Germ Protection Soap सिर्फ 4 piece बाकी है (सीमा: 36 piece)')
    ON CONFLICT DO NOTHING;

    -- 8. Seed Realistic Recent Transactions (Stock IN and OUT across past 48h)
    INSERT INTO public.transactions (shop_id, product_id, type, qty, unit, qty_in_base_unit, price, total_amount, source, raw_transcript, confidence, created_at)
    VALUES
    -- Atta stock in 2 days ago
    (v_shop_id, p_atta, 'in', 5, 'bag', 250, 2100.00, 10500.00, 'voice', 'पांच बोरा आशीर्वाद आटा आया २१०० में', 0.96, NOW() - INTERVAL '44 hours'),
    -- Basmati sales
    (v_shop_id, p_basmati, 'out', 2, 'bag', 50, 1900.00, 3800.00, 'voice', 'दो बैग इंडिया गेट बासमती चावल बिका', 0.94, NOW() - INTERVAL '30 hours'),
    -- Toor dal sales (led to low stock!)
    (v_shop_id, p_toor, 'out', 30, 'kg', 30, 170.00, 5100.00, 'voice', 'तीस किलो तूअर दाल दिया होटल वाले को', 0.92, NOW() - INTERVAL '18 hours'),
    -- Sunflower oil sales
    (v_shop_id, p_sunflower, 'out', 2, 'tin', 30, 2150.00, 4300.00, 'voice', 'రెండు డబ్బాల ఫార్చూన్ నూనె అమ్మాము', 0.95, NOW() - INTERVAL '12 hours'),
    -- Maggi carton sold
    (v_shop_id, p_maggi, 'out', 1, 'carton', 96, 1344.00, 1344.00, 'manual', 'Maggi carton sale', 1.00, NOW() - INTERVAL '6 hours'),
    -- Lifebuoy sold out
    (v_shop_id, p_lifebuoy, 'out', 32, 'piece', 32, 40.00, 1280.00, 'voice', '32 Lifebuoy soap customer le gaya', 0.91, NOW() - INTERVAL '3 hours'),
    -- Salt sales
    (v_shop_id, p_salt, 'out', 10, 'packet', 10, 27.00, 270.00, 'voice', 'Dus packet Tata salt diya', 0.97, NOW() - INTERVAL '1 hour');

    -- 9. Seed Khata Ledger Entries linked to customer credit
    INSERT INTO public.khata_ledger (shop_id, customer_id, type, amount, running_balance, source, raw_transcript, notes, created_at)
    VALUES
    (v_shop_id, c_ramesh, 'credit', 850.00, 850.00, 'voice', 'रमेश जी ने आठ सौ पचास का राशन उधार लिया', 'Groceries on credit', NOW() - INTERVAL '2 days'),
    (v_shop_id, c_ramesh, 'credit', 1000.00, 1850.00, 'voice', 'रमेश जी के खाते में एक हज़ार रुपये और जोड़ो', 'Atta and Oil', NOW() - INTERVAL '8 hours'),
    (v_shop_id, c_lakshmi, 'credit', 1150.00, 1150.00, 'manual', 'Weekly ration', 'Rice and Dal', NOW() - INTERVAL '5 days'),
    (v_shop_id, c_lakshmi, 'payment', 500.00, 650.00, 'voice', 'Lakshmi madam ne paanch sau rupaye jama kiye PhonePe se', 'PhonePe partial payment', NOW() - INTERVAL '1 day'),
    (v_shop_id, c_venkat, 'credit', 3200.00, 3200.00, 'voice', 'వెంకటేష్ గౌడ్ మూడు వేల రెండు వందలు అప్పు రాసుకో', 'Monthly provision bill', NOW() - INTERVAL '18 hours');

END $$;
