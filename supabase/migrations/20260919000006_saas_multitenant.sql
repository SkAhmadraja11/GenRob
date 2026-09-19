-- GenRob SaaS Multi-Tenant Layer: 20260919000006_saas_multitenant.sql
-- Adds billing, referrals, shop memberships, admin audit, notification logging

-- ─────────────────────────────────────────────────────────────────
-- 1. Extend shops table with SaaS plan + onboarding columns
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by TEXT,
  ADD COLUMN IF NOT EXISTS trade_category TEXT NOT NULL DEFAULT 'kirana'
    CHECK (trade_category IN ('kirana', 'wholesale', 'medical', 'textile', 'electronics', 'general'));

-- Auto-generate referral codes for existing shops
UPDATE public.shops
SET referral_code = UPPER(SUBSTRING(MD5(id::TEXT), 1, 8))
WHERE referral_code IS NULL;


-- ─────────────────────────────────────────────────────────────────
-- 2. Shop Memberships (one user → multiple shops, role-scoped)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shop_memberships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shop_id     UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'cashier'
                CHECK (role IN ('owner', 'manager', 'cashier')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  invited_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, shop_id)
);

CREATE INDEX IF NOT EXISTS idx_shop_memberships_user ON public.shop_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_memberships_shop ON public.shop_memberships(shop_id);


-- ─────────────────────────────────────────────────────────────────
-- 3. Plan Subscriptions (Razorpay billing state per shop)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_subscriptions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id                   UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE UNIQUE,
  plan                      TEXT NOT NULL DEFAULT 'free'
                              CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  razorpay_subscription_id  TEXT,
  razorpay_customer_id      TEXT,
  razorpay_plan_id          TEXT,
  status                    TEXT NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing', 'paused')),
  current_period_start      TIMESTAMPTZ,
  current_period_end        TIMESTAMPTZ,
  cancel_at_period_end      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_sub_shop ON public.plan_subscriptions(shop_id);
CREATE INDEX IF NOT EXISTS idx_plan_sub_status ON public.plan_subscriptions(status);


-- ─────────────────────────────────────────────────────────────────
-- 4. Billing Events (webhook audit trail from Razorpay)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.billing_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id             UUID REFERENCES public.shops(id) ON DELETE SET NULL,
  razorpay_event_id   TEXT UNIQUE,
  event_type          TEXT NOT NULL,   -- 'payment.captured', 'subscription.cancelled', etc.
  amount              NUMERIC(12, 2),
  currency            TEXT NOT NULL DEFAULT 'INR',
  raw_payload         JSONB,
  processed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_shop ON public.billing_events(shop_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_type ON public.billing_events(event_type);


-- ─────────────────────────────────────────────────────────────────
-- 5. Referrals (viral growth engine)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.referrals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_shop_id    UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  referred_shop_id    UUID REFERENCES public.shops(id) ON DELETE SET NULL,
  referral_code       TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'converted', 'rewarded', 'expired')),
  reward_type         TEXT NOT NULL DEFAULT 'free_month',
  reward_applied_at   TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_shop_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);


-- ─────────────────────────────────────────────────────────────────
-- 6. Notification Logs (push, WhatsApp, SMS delivery audit)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  channel     TEXT NOT NULL CHECK (channel IN ('push', 'whatsapp', 'sms', 'email')),
  type        TEXT NOT NULL,   -- 'low_stock_alert', 'daily_briefing', 'udhaar_reminder'
  recipient   TEXT,            -- phone or push endpoint
  status      TEXT NOT NULL DEFAULT 'sent'
                CHECK (status IN ('sent', 'delivered', 'failed', 'queued')),
  metadata    JSONB,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_logs_shop ON public.notification_logs(shop_id);
CREATE INDEX IF NOT EXISTS idx_notif_logs_channel ON public.notification_logs(channel, sent_at DESC);


-- ─────────────────────────────────────────────────────────────────
-- 7. Admin Audit Log (super-admin action trail)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id   UUID NOT NULL,
  action          TEXT NOT NULL, -- 'impersonate', 'plan_change', 'broadcast', 'shop_disable'
  target_shop_id  UUID REFERENCES public.shops(id) ON DELETE SET NULL,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON public.admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_shop ON public.admin_audit_log(target_shop_id);


-- ─────────────────────────────────────────────────────────────────
-- 8. Plan Limit Helper Functions (used in RLS + UI guardrails)
-- ─────────────────────────────────────────────────────────────────

-- Returns the product limit for the current shop's plan
CREATE OR REPLACE FUNCTION public.get_plan_product_limit(p_plan TEXT)
RETURNS INT
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN CASE p_plan
    WHEN 'free'       THEN 50
    WHEN 'starter'    THEN 500
    WHEN 'pro'        THEN 999999
    WHEN 'enterprise' THEN 999999
    ELSE 50
  END;
END;
$$;

-- Returns the daily voice transaction limit for a plan
CREATE OR REPLACE FUNCTION public.get_plan_voice_limit(p_plan TEXT)
RETURNS INT
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN CASE p_plan
    WHEN 'free'       THEN 20
    WHEN 'starter'    THEN 200
    WHEN 'pro'        THEN 999999
    WHEN 'enterprise' THEN 999999
    ELSE 20
  END;
END;
$$;

-- Checks if the current shop is within its product count limit
CREATE OR REPLACE FUNCTION public.shop_within_product_limit()
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_count INT;
  v_limit INT;
  v_plan  TEXT;
  v_sid   UUID;
BEGIN
  v_sid := public.current_shop_id();
  IF v_sid IS NULL THEN RETURN FALSE; END IF;

  SELECT plan INTO v_plan FROM public.shops WHERE id = v_sid;
  v_limit := public.get_plan_product_limit(COALESCE(v_plan, 'free'));
  SELECT COUNT(*) INTO v_count FROM public.products WHERE shop_id = v_sid AND is_active = TRUE;
  RETURN v_count < v_limit;
END;
$$;

-- Returns plan-level feature flags as JSON for the current shop
CREATE OR REPLACE FUNCTION public.get_shop_plan_features()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_plan TEXT;
  v_sid  UUID;
BEGIN
  v_sid := public.current_shop_id();
  IF v_sid IS NULL THEN
    RETURN '{}'::JSONB;
  END IF;
  SELECT plan INTO v_plan FROM public.shops WHERE id = v_sid;
  RETURN jsonb_build_object(
    'plan',              COALESCE(v_plan, 'free'),
    'product_limit',     public.get_plan_product_limit(COALESCE(v_plan, 'free')),
    'voice_limit',       public.get_plan_voice_limit(COALESCE(v_plan, 'free')),
    'whatsapp_alerts',   v_plan IN ('starter', 'pro', 'enterprise'),
    'challan_ocr',       v_plan IN ('starter', 'pro', 'enterprise'),
    'analytics_days',    CASE v_plan WHEN 'free' THEN 7 WHEN 'starter' THEN 90 ELSE 365 END,
    'max_staff',         CASE v_plan WHEN 'free' THEN 1 WHEN 'starter' THEN 3 WHEN 'pro' THEN 10 ELSE 100 END
  );
END;
$$;


-- ─────────────────────────────────────────────────────────────────
-- 9. Trigger: Auto-assign referral_code on new shop INSERT
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_assign_shop_referral_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTRING(MD5(gen_random_uuid()::TEXT), 1, 8));
  END IF;
  -- Set 14-day trial for new shops
  IF NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at := NOW() + INTERVAL '14 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_referral_code ON public.shops;
CREATE TRIGGER trg_assign_referral_code
BEFORE INSERT ON public.shops
FOR EACH ROW
EXECUTE FUNCTION public.fn_assign_shop_referral_code();


-- ─────────────────────────────────────────────────────────────────
-- 10. Platform-wide daily stats (super-admin analytics)
-- Aggregated view — no shop-specific data exposed
-- ─────────────────────────────────────────────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS public.platform_daily_stats AS
SELECT
  DATE_TRUNC('day', t.created_at)                                       AS day,
  COUNT(DISTINCT t.shop_id)                                             AS active_shops,
  COUNT(*)                                                              AS total_transactions,
  COUNT(*) FILTER (WHERE t.source = 'voice')                           AS voice_transactions,
  COUNT(*) FILTER (WHERE t.source = 'whatsapp')                        AS whatsapp_transactions,
  COUNT(*) FILTER (WHERE t.source = 'manual')                          AS manual_transactions,
  ROUND(AVG(t.confidence)::NUMERIC, 3)                                  AS avg_nlu_confidence,
  ROUND(COALESCE(SUM(t.total_amount), 0)::NUMERIC, 2)                  AS total_gmv_inr
FROM public.transactions t
GROUP BY 1
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_daily_stats_day
  ON public.platform_daily_stats(day);


-- ─────────────────────────────────────────────────────────────────
-- 11. RLS on new tables
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.shop_memberships  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log   ENABLE ROW LEVEL SECURITY;

-- Shop Memberships: users can see memberships for their current shop
DROP POLICY IF EXISTS "Members can view shop memberships" ON public.shop_memberships;
CREATE POLICY "Members can view shop memberships"
  ON public.shop_memberships FOR SELECT
  USING (shop_id = public.current_shop_id());

DROP POLICY IF EXISTS "Owners can manage memberships" ON public.shop_memberships;
CREATE POLICY "Owners can manage memberships"
  ON public.shop_memberships FOR ALL
  USING (shop_id = public.current_shop_id());

-- Plan Subscriptions: shop owner can view their own subscription
DROP POLICY IF EXISTS "Shop can view own subscription" ON public.plan_subscriptions;
CREATE POLICY "Shop can view own subscription"
  ON public.plan_subscriptions FOR SELECT
  USING (shop_id = public.current_shop_id());

-- Billing Events: shop owner can view own billing events
DROP POLICY IF EXISTS "Shop can view own billing events" ON public.billing_events;
CREATE POLICY "Shop can view own billing events"
  ON public.billing_events FOR SELECT
  USING (shop_id = public.current_shop_id());

-- Referrals: referrer can view their own referrals
DROP POLICY IF EXISTS "Referrer can view own referrals" ON public.referrals;
CREATE POLICY "Referrer can view own referrals"
  ON public.referrals FOR SELECT
  USING (referrer_shop_id = public.current_shop_id());

DROP POLICY IF EXISTS "Referrer can insert referrals" ON public.referrals;
CREATE POLICY "Referrer can insert referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (referrer_shop_id = public.current_shop_id());

-- Notification Logs: shop can view own logs
DROP POLICY IF EXISTS "Shop can view own notifications" ON public.notification_logs;
CREATE POLICY "Shop can view own notifications"
  ON public.notification_logs FOR SELECT
  USING (shop_id = public.current_shop_id());

-- Admin Audit: locked down — superadmin only (handled via service_role in Edge Functions)
DROP POLICY IF EXISTS "No direct access to admin audit" ON public.admin_audit_log;
CREATE POLICY "No direct access to admin audit"
  ON public.admin_audit_log FOR SELECT
  USING (FALSE); -- All access via service_role key in Edge Functions only


-- ─────────────────────────────────────────────────────────────────
-- 12. Update products INSERT policy to enforce plan limits
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Shop users can insert their products" ON public.products;
CREATE POLICY "Shop users can insert their products"
  ON public.products FOR INSERT
  WITH CHECK (
    shop_id = public.current_shop_id()
    AND public.shop_within_product_limit()
  );


-- ─────────────────────────────────────────────────────────────────
-- 13. Realtime: add new relevant tables
-- ─────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'plan_subscriptions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.plan_subscriptions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notification_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_logs;
  END IF;
END;
$$;
