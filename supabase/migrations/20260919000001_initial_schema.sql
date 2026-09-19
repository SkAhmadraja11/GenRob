-- GenRob Database Schema Migration: 20260919000001_initial_schema.sql
-- Enables pgcrypto, vector, and pg_trgm extensions

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. Shops Table
CREATE TABLE IF NOT EXISTS public.shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    gstin TEXT,
    address TEXT,
    city TEXT NOT NULL DEFAULT 'Hyderabad',
    state TEXT NOT NULL DEFAULT 'Telangana',
    currency TEXT NOT NULL DEFAULT 'INR',
    primary_language TEXT NOT NULL DEFAULT 'hi' CHECK (primary_language IN ('hi', 'te', 'en')),
    settings JSONB DEFAULT '{"auto_alert_low_stock": true, "enable_voice_feedback": true, "voice_confidence_threshold": 0.75}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Users / Shop Members Table (scoping users to shops)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY, -- Can match auth.users.id
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'cashier')),
    preferred_language TEXT NOT NULL DEFAULT 'hi' CHECK (preferred_language IN ('hi', 'te', 'en')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Products Table
-- unit: Primary display unit (e.g., 'bag', 'tin', 'box')
-- base_unit: Standard measurement unit (e.g., 'kg', 'litre', 'piece')
-- unit_conversion: JSON mapping conversion to base_unit, e.g. {"bag": 50, "packet": 1, "kg": 1}
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT,
    category TEXT NOT NULL DEFAULT 'General',
    unit TEXT NOT NULL DEFAULT 'piece',
    base_unit TEXT NOT NULL DEFAULT 'piece',
    unit_conversion JSONB NOT NULL DEFAULT '{"piece": 1}'::jsonb,
    reorder_threshold NUMERIC(12, 2) NOT NULL DEFAULT 10.00,
    current_stock NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Stored in base_unit
    price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,        -- Selling price per primary unit
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,   -- Purchase cost per primary unit
    barcode TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Product Aliases Table (Trade Vocabulary Engine with pgvector)
-- Supports regional nicknames (Hindi, Telugu, Hinglish, colloquial trade terms)
CREATE TABLE IF NOT EXISTS public.product_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    alias_text TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'hi' CHECK (language IN ('hi', 'te', 'en', 'mixed')),
    embedding vector(384), -- 384-dimension vector for regional text embeddings
    usage_count INTEGER NOT NULL DEFAULT 1,
    verified BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Transactions Table (Stock Movements)
CREATE TYPE public.stock_transaction_type AS ENUM ('in', 'out', 'adjustment');
CREATE TYPE public.stock_source_type AS ENUM ('voice', 'manual', 'whatsapp', 'ocr');

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    type public.stock_transaction_type NOT NULL,
    qty NUMERIC(12, 2) NOT NULL,
    unit TEXT NOT NULL,
    qty_in_base_unit NUMERIC(12, 2) NOT NULL,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    source public.stock_source_type NOT NULL DEFAULT 'voice',
    raw_transcript TEXT,
    confidence NUMERIC(4, 3) DEFAULT 1.000,
    notes TEXT,
    customer_id UUID,
    supplier_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Alerts Table
CREATE TYPE public.alert_type AS ENUM ('low_stock', 'out_of_stock', 'dead_stock', 'reorder_suggested');
CREATE TYPE public.alert_status AS ENUM ('active', 'acknowledged', 'resolved');

CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    type public.alert_type NOT NULL,
    status public.alert_status NOT NULL DEFAULT 'active',
    message TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- 7. Customers Table (Khata / Udhaar)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    current_credit NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Running udhaar balance
    credit_limit NUMERIC(12, 2) NOT NULL DEFAULT 5000.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Khata Ledger Table
CREATE TYPE public.khata_entry_type AS ENUM ('credit', 'payment'); -- credit: udhaar diya, payment: jama kiya

CREATE TABLE IF NOT EXISTS public.khata_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    linked_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    type public.khata_entry_type NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    running_balance NUMERIC(12, 2) NOT NULL,
    source TEXT NOT NULL DEFAULT 'voice',
    raw_transcript TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Suppliers Table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    contact_person TEXT,
    categories TEXT[] DEFAULT '{}',
    payment_terms TEXT,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Purchase Orders Table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'received', 'cancelled')),
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    challan_image_url TEXT,
    voice_note_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for high-frequency queries
CREATE INDEX IF NOT EXISTS idx_products_shop_id ON public.products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_aliases_product_id ON public.product_aliases(product_id);
CREATE INDEX IF NOT EXISTS idx_aliases_shop_id ON public.product_aliases(shop_id);
CREATE INDEX IF NOT EXISTS idx_aliases_text_trgm ON public.product_aliases USING gin (alias_text gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_transactions_shop_product ON public.transactions(shop_id, product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_shop_status ON public.alerts(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_khata_customer ON public.khata_ledger(customer_id, created_at DESC);
