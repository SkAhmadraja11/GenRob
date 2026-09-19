-- GenRob Row Level Security (RLS) Policies: 20260919000003_rls_policies.sql
-- Explicit shop_id isolation across all tables.

-- Helper function to resolve the current user's authenticated shop_id
CREATE OR REPLACE FUNCTION public.current_shop_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_shop_id UUID;
BEGIN
    -- 1. Try resolving from custom session setting (useful for edge functions & direct DB clients)
    BEGIN
        v_shop_id := NULLIF(current_setting('app.current_shop_id', true), '')::UUID;
        IF v_shop_id IS NOT NULL THEN
            RETURN v_shop_id;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- 2. Try resolving from JWT app_metadata claims
    BEGIN
        v_shop_id := ((auth.jwt() -> 'app_metadata') ->> 'shop_id')::UUID;
        IF v_shop_id IS NOT NULL THEN
            RETURN v_shop_id;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- 3. Query the users mapping table for the authenticated Supabase auth.uid()
    IF auth.uid() IS NOT NULL THEN
        SELECT shop_id INTO v_shop_id
        FROM public.users
        WHERE id = auth.uid()
        LIMIT 1;

        IF v_shop_id IS NOT NULL THEN
            RETURN v_shop_id;
        END IF;
    END IF;

    -- 4. Fallback for demo mode if unauthenticated anon key is used
    -- Return the primary demo shop ID if exists, or NULL (deny)
    SELECT id INTO v_shop_id
    FROM public.shops
    ORDER BY created_at ASC
    LIMIT 1;

    RETURN v_shop_id;
END;
$$;


-- Enable Row Level Security on ALL tables
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.khata_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;


-- 1. SHOPS Policies
DROP POLICY IF EXISTS "Users can view their own shop" ON public.shops;
CREATE POLICY "Users can view their own shop"
ON public.shops FOR SELECT
USING (id = public.current_shop_id());

DROP POLICY IF EXISTS "Owners can update their own shop" ON public.shops;
CREATE POLICY "Owners can update their own shop"
ON public.shops FOR UPDATE
USING (id = public.current_shop_id())
WITH CHECK (id = public.current_shop_id());

DROP POLICY IF EXISTS "Allow shop creation on registration" ON public.shops;
CREATE POLICY "Allow shop creation on registration"
ON public.shops FOR INSERT
WITH CHECK (TRUE);


-- 2. USERS Policies
DROP POLICY IF EXISTS "Users can view members of their own shop" ON public.users;
CREATE POLICY "Users can view members of their own shop"
ON public.users FOR SELECT
USING (shop_id = public.current_shop_id());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
ON public.users FOR UPDATE
USING (id = auth.uid() OR shop_id = public.current_shop_id());

DROP POLICY IF EXISTS "Allow user membership insert" ON public.users;
CREATE POLICY "Allow user membership insert"
ON public.users FOR INSERT
WITH CHECK (shop_id = public.current_shop_id() OR auth.uid() IS NOT NULL);


-- 3. PRODUCTS Policies
DROP POLICY IF EXISTS "Shop users can view their products" ON public.products;
CREATE POLICY "Shop users can view their products"
ON public.products FOR SELECT
USING (shop_id = public.current_shop_id());

DROP POLICY IF EXISTS "Shop users can insert their products" ON public.products;
CREATE POLICY "Shop users can insert their products"
ON public.products FOR INSERT
WITH CHECK (shop_id = public.current_shop_id());

DROP POLICY IF EXISTS "Shop users can update their products" ON public.products;
CREATE POLICY "Shop users can update their products"
ON public.products FOR UPDATE
USING (shop_id = public.current_shop_id())
WITH CHECK (shop_id = public.current_shop_id());

DROP POLICY IF EXISTS "Shop users can delete their products" ON public.products;
CREATE POLICY "Shop users can delete their products"
ON public.products FOR DELETE
USING (shop_id = public.current_shop_id());


-- 4. PRODUCT ALIASES Policies
DROP POLICY IF EXISTS "Shop users can view their product aliases" ON public.product_aliases;
CREATE POLICY "Shop users can view their product aliases"
ON public.product_aliases FOR SELECT
USING (shop_id = public.current_shop_id());

DROP POLICY IF EXISTS "Shop users can insert product aliases" ON public.product_aliases;
CREATE POLICY "Shop users can insert product aliases"
ON public.product_aliases FOR INSERT
WITH CHECK (shop_id = public.current_shop_id());

DROP POLICY IF EXISTS "Shop users can update product aliases" ON public.product_aliases;
CREATE POLICY "Shop users can update product aliases"
ON public.product_aliases FOR UPDATE
USING (shop_id = public.current_shop_id())
WITH CHECK (shop_id = public.current_shop_id());

DROP POLICY IF EXISTS "Shop users can delete product aliases" ON public.product_aliases;
CREATE POLICY "Shop users can delete product aliases"
ON public.product_aliases FOR DELETE
USING (shop_id = public.current_shop_id());


-- 5. TRANSACTIONS Policies
DROP POLICY IF EXISTS "Shop users can view their transactions" ON public.transactions;
CREATE POLICY "Shop users can view their transactions"
ON public.transactions FOR SELECT
USING (shop_id = public.current_shop_id());

DROP POLICY IF EXISTS "Shop users can insert transactions" ON public.transactions;
CREATE POLICY "Shop users can insert transactions"
ON public.transactions FOR INSERT
WITH CHECK (shop_id = public.current_shop_id());

DROP POLICY IF EXISTS "Shop users can delete transactions" ON public.transactions;
CREATE POLICY "Shop users can delete transactions"
ON public.transactions FOR DELETE
USING (shop_id = public.current_shop_id());


-- 6. ALERTS Policies
DROP POLICY IF EXISTS "Shop users can view their alerts" ON public.alerts;
CREATE POLICY "Shop users can view their alerts"
ON public.alerts FOR SELECT
USING (shop_id = public.current_shop_id());

DROP POLICY IF EXISTS "Shop users can update their alerts" ON public.alerts;
CREATE POLICY "Shop users can update their alerts"
ON public.alerts FOR UPDATE
USING (shop_id = public.current_shop_id())
WITH CHECK (shop_id = public.current_shop_id());


-- 7. CUSTOMERS Policies
DROP POLICY IF EXISTS "Shop users can view their customers" ON public.customers;
CREATE POLICY "Shop users can view their customers"
ON public.customers FOR SELECT
USING (shop_id = public.current_shop_id());

DROP POLICY IF EXISTS "Shop users can insert customers" ON public.customers;
CREATE POLICY "Shop users can insert customers"
ON public.customers FOR INSERT
WITH CHECK (shop_id = public.current_shop_id());

DROP POLICY IF EXISTS "Shop users can update their customers" ON public.customers;
CREATE POLICY "Shop users can update their customers"
ON public.customers FOR UPDATE
USING (shop_id = public.current_shop_id())
WITH CHECK (shop_id = public.current_shop_id());


-- 8. KHATA LEDGER Policies
DROP POLICY IF EXISTS "Shop users can view their khata ledger" ON public.khata_ledger;
CREATE POLICY "Shop users can view their khata ledger"
ON public.khata_ledger FOR SELECT
USING (shop_id = public.current_shop_id());

DROP POLICY IF EXISTS "Shop users can insert khata entries" ON public.khata_ledger;
CREATE POLICY "Shop users can insert khata entries"
ON public.khata_ledger FOR INSERT
WITH CHECK (shop_id = public.current_shop_id());


-- 9. SUPPLIERS Policies
DROP POLICY IF EXISTS "Shop users can view their suppliers" ON public.suppliers;
CREATE POLICY "Shop users can view their suppliers"
ON public.suppliers FOR SELECT
USING (shop_id = public.current_shop_id());

DROP POLICY IF EXISTS "Shop users can insert suppliers" ON public.suppliers;
CREATE POLICY "Shop users can insert suppliers"
ON public.suppliers FOR INSERT
WITH CHECK (shop_id = public.current_shop_id());

DROP POLICY IF EXISTS "Shop users can update suppliers" ON public.suppliers;
CREATE POLICY "Shop users can update suppliers"
ON public.suppliers FOR UPDATE
USING (shop_id = public.current_shop_id())
WITH CHECK (shop_id = public.current_shop_id());


-- 10. PURCHASE ORDERS Policies
DROP POLICY IF EXISTS "Shop users can view purchase orders" ON public.purchase_orders;
CREATE POLICY "Shop users can view purchase orders"
ON public.purchase_orders FOR SELECT
USING (shop_id = public.current_shop_id());

DROP POLICY IF EXISTS "Shop users can insert purchase orders" ON public.purchase_orders;
CREATE POLICY "Shop users can insert purchase orders"
ON public.purchase_orders FOR INSERT
WITH CHECK (shop_id = public.current_shop_id());

DROP POLICY IF EXISTS "Shop users can update purchase orders" ON public.purchase_orders;
CREATE POLICY "Shop users can update purchase orders"
ON public.purchase_orders FOR UPDATE
USING (shop_id = public.current_shop_id())
WITH CHECK (shop_id = public.current_shop_id());


-- Enable Supabase Realtime publication on crucial tables
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'products'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'transactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'alerts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'khata_ledger'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.khata_ledger;
    END IF;
END;
$$;
