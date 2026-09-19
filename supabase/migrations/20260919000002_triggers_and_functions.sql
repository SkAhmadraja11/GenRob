-- GenRob Triggers & Stored Functions: 20260919000002_triggers_and_functions.sql

-- 1. Trigger Function: Update Product Stock on Transaction Insert/Update/Delete
CREATE OR REPLACE FUNCTION public.fn_sync_product_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_unit_conversion JSONB;
    v_base_unit TEXT;
    v_multiplier NUMERIC := 1.0;
    v_delta_base_qty NUMERIC := 0.0;
    v_product_id UUID;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        v_product_id := NEW.product_id;
        
        -- Retrieve product base_unit and unit_conversion dictionary
        SELECT base_unit, unit_conversion 
        INTO v_base_unit, v_unit_conversion
        FROM public.products
        WHERE id = v_product_id;

        -- Calculate multiplier to base_unit
        IF NEW.unit = v_base_unit THEN
            v_multiplier := 1.0;
        ELSIF v_unit_conversion ? NEW.unit THEN
            v_multiplier := (v_unit_conversion->>NEW.unit)::NUMERIC;
        ELSE
            v_multiplier := 1.0;
        END IF;

        -- Record calculated base unit quantity into the transaction record
        NEW.qty_in_base_unit := NEW.qty * v_multiplier;
        IF NEW.total_amount = 0 AND NEW.price > 0 THEN
            NEW.total_amount := NEW.qty * NEW.price;
        END IF;

        -- Update product stock
        IF NEW.type = 'in' THEN
            v_delta_base_qty := NEW.qty_in_base_unit;
        ELSIF NEW.type = 'out' THEN
            v_delta_base_qty := -NEW.qty_in_base_unit;
        ELSIF NEW.type = 'adjustment' THEN
            -- Adjust directly
            UPDATE public.products
            SET current_stock = NEW.qty_in_base_unit,
                updated_at = NOW()
            WHERE id = v_product_id;
            RETURN NEW;
        END IF;

        UPDATE public.products
        SET current_stock = current_stock + v_delta_base_qty,
            updated_at = NOW()
        WHERE id = v_product_id;

        RETURN NEW;

    ELSIF (TG_OP = 'DELETE') THEN
        v_product_id := OLD.product_id;
        IF OLD.type = 'in' THEN
            v_delta_base_qty := -OLD.qty_in_base_unit;
        ELSIF OLD.type = 'out' THEN
            v_delta_base_qty := OLD.qty_in_base_unit;
        END IF;

        UPDATE public.products
        SET current_stock = current_stock + v_delta_base_qty,
            updated_at = NOW()
        WHERE id = v_product_id;

        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_stock ON public.transactions;
CREATE TRIGGER trg_sync_product_stock
BEFORE INSERT OR DELETE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_product_stock();


-- 2. Trigger Function: Automatically Generate or Resolve Low-Stock Alerts
CREATE OR REPLACE FUNCTION public.fn_evaluate_product_alerts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_alert_id UUID;
    v_message TEXT;
    v_severity TEXT;
BEGIN
    -- Only evaluate if current_stock or reorder_threshold changed
    IF (TG_OP = 'UPDATE' AND (OLD.current_stock IS DISTINCT FROM NEW.current_stock OR OLD.reorder_threshold IS DISTINCT FROM NEW.reorder_threshold)) OR (TG_OP = 'INSERT') THEN
        
        -- Check if stock has breached reorder threshold
        IF NEW.current_stock <= NEW.reorder_threshold THEN
            IF NEW.current_stock <= 0 THEN
                v_severity := 'critical';
                v_message := format('आउट ऑफ स्टॉक: %s खत्म हो चुका है! (Current: 0 %s)', NEW.name, NEW.base_unit);
            ELSE
                v_severity := 'warning';
                v_message := format('कम स्टॉक चेतावनी: %s सिर्फ %s %s बाकी है (सीमा: %s %s)', 
                                    NEW.name, NEW.current_stock, NEW.base_unit, NEW.reorder_threshold, NEW.base_unit);
            END IF;

            -- Check if active alert already exists
            SELECT id INTO v_existing_alert_id
            FROM public.alerts
            WHERE product_id = NEW.id 
              AND type IN ('low_stock', 'out_of_stock') 
              AND status = 'active'
            LIMIT 1;

            IF v_existing_alert_id IS NOT NULL THEN
                UPDATE public.alerts
                SET message = v_message,
                    severity = v_severity
                WHERE id = v_existing_alert_id;
            ELSE
                INSERT INTO public.alerts (shop_id, product_id, type, status, severity, message)
                VALUES (NEW.shop_id, NEW.id, CASE WHEN NEW.current_stock <= 0 THEN 'out_of_stock'::public.alert_type ELSE 'low_stock'::public.alert_type END, 'active', v_severity, v_message);
            END IF;

        -- If stock is replenished above threshold, auto-resolve any active alerts
        ELSIF NEW.current_stock > NEW.reorder_threshold THEN
            UPDATE public.alerts
            SET status = 'resolved',
                resolved_at = NOW()
            WHERE product_id = NEW.id 
              AND type IN ('low_stock', 'out_of_stock') 
              AND status = 'active';
        END IF;

    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_evaluate_product_alerts ON public.products;
CREATE TRIGGER trg_evaluate_product_alerts
AFTER INSERT OR UPDATE OF current_stock, reorder_threshold ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.fn_evaluate_product_alerts();


-- 3. Trigger Function: Maintain Khata Customer Running Credit
CREATE OR REPLACE FUNCTION public.fn_sync_khata_customer_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_delta NUMERIC := 0.0;
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.type = 'credit' THEN
            v_delta := NEW.amount; -- Udhaar diya: balance increases
        ELSIF NEW.type = 'payment' THEN
            v_delta := -NEW.amount; -- Jama kiya: balance decreases
        END IF;

        UPDATE public.customers
        SET current_credit = current_credit + v_delta,
            updated_at = NOW()
        WHERE id = NEW.customer_id;

        -- Record running balance on ledger entry
        SELECT current_credit INTO NEW.running_balance
        FROM public.customers
        WHERE id = NEW.customer_id;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_khata_customer_balance ON public.khata_ledger;
CREATE TRIGGER trg_sync_khata_customer_balance
BEFORE INSERT ON public.khata_ledger
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_khata_customer_balance();


-- 4. Stored Procedure: Hybrid pgvector & Fuzzy Search for Trade Vocabulary Engine
CREATE OR REPLACE FUNCTION public.match_product_aliases(
    p_shop_id UUID,
    p_query_text TEXT,
    p_query_embedding vector(384) DEFAULT NULL,
    p_match_threshold FLOAT DEFAULT 0.45,
    p_match_count INT DEFAULT 5
)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    category TEXT,
    unit TEXT,
    base_unit TEXT,
    unit_conversion JSONB,
    current_stock NUMERIC,
    price NUMERIC,
    cost_price NUMERIC,
    reorder_threshold NUMERIC,
    matched_alias TEXT,
    match_type TEXT,
    similarity_score FLOAT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    WITH candidate_matches AS (
        -- Vector semantic match if embedding provided
        SELECT 
            pa.product_id,
            pa.alias_text,
            'vector' AS match_type,
            (1 - (pa.embedding <=> p_query_embedding))::FLOAT AS score
        FROM public.product_aliases pa
        WHERE pa.shop_id = p_shop_id 
          AND p_query_embedding IS NOT NULL
          AND pa.embedding IS NOT NULL
          AND (1 - (pa.embedding <=> p_query_embedding)) >= p_match_threshold

        UNION ALL

        -- Trigram text similarity match on aliases
        SELECT 
            pa.product_id,
            pa.alias_text,
            'trigram_alias' AS match_type,
            similarity(pa.alias_text, p_query_text)::FLOAT AS score
        FROM public.product_aliases pa
        WHERE pa.shop_id = p_shop_id
          AND similarity(pa.alias_text, p_query_text) >= 0.30

        UNION ALL

        -- Direct trigram match on product name
        SELECT 
            p.id AS product_id,
            p.name AS alias_text,
            'trigram_name' AS match_type,
            similarity(p.name, p_query_text)::FLOAT AS score
        FROM public.products p
        WHERE p.shop_id = p_shop_id
          AND similarity(p.name, p_query_text) >= 0.25
    ),
    ranked_matches AS (
        SELECT 
            cm.product_id,
            cm.alias_text,
            cm.match_type,
            cm.score,
            ROW_NUMBER() OVER (PARTITION BY cm.product_id ORDER BY cm.score DESC) as rnk
        FROM candidate_matches cm
    )
    SELECT 
        p.id AS product_id,
        p.name AS product_name,
        p.category,
        p.unit,
        p.base_unit,
        p.unit_conversion,
        p.current_stock,
        p.price,
        p.cost_price,
        p.reorder_threshold,
        rm.alias_text AS matched_alias,
        rm.match_type,
        rm.score AS similarity_score
    FROM ranked_matches rm
    JOIN public.products p ON p.id = rm.product_id
    WHERE rm.rnk = 1
    ORDER BY rm.score DESC
    LIMIT p_match_count;
END;
$$;


-- 5. Stored Procedure: Predictive Reorder Suggestions (Rolling Average Consumption Rate)
CREATE OR REPLACE FUNCTION public.get_predictive_reorder_suggestions(
    p_shop_id UUID,
    p_days_lookback INT DEFAULT 14
)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    category TEXT,
    current_stock NUMERIC,
    base_unit TEXT,
    reorder_threshold NUMERIC,
    daily_consumption_rate NUMERIC,
    days_of_stock_left NUMERIC,
    suggested_reorder_qty NUMERIC,
    urgency TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    WITH consumption AS (
        SELECT 
            t.product_id,
            COALESCE(SUM(t.qty_in_base_unit) / GREATEST(p_days_lookback, 1), 0.0) AS daily_rate
        FROM public.transactions t
        WHERE t.shop_id = p_shop_id
          AND t.type = 'out'
          AND t.created_at >= (NOW() - (p_days_lookback || ' days')::INTERVAL)
        GROUP BY t.product_id
    )
    SELECT 
        p.id AS product_id,
        p.name AS product_name,
        p.category,
        p.current_stock,
        p.base_unit,
        p.reorder_threshold,
        ROUND(COALESCE(c.daily_rate, 0.0), 2) AS daily_consumption_rate,
        CASE 
            WHEN COALESCE(c.daily_rate, 0.0) = 0 THEN 999.0
            ELSE ROUND(p.current_stock / c.daily_rate, 1)
        END AS days_of_stock_left,
        -- Suggested reorder quantity: enough for 14 days + buffer to exceed threshold
        ROUND(GREATEST(p.reorder_threshold * 2 - p.current_stock, COALESCE(c.daily_rate, 1.0) * 14), 1) AS suggested_reorder_qty,
        CASE 
            WHEN p.current_stock <= 0 THEN 'critical_out_of_stock'
            WHEN p.current_stock <= p.reorder_threshold THEN 'urgent_below_threshold'
            WHEN COALESCE(c.daily_rate, 0) > 0 AND (p.current_stock / c.daily_rate) <= 3 THEN 'high_risk'
            WHEN COALESCE(c.daily_rate, 0) > 0 AND (p.current_stock / c.daily_rate) <= 7 THEN 'moderate_risk'
            ELSE 'healthy'
        END AS urgency
    FROM public.products p
    LEFT JOIN consumption c ON c.product_id = p.id
    WHERE p.shop_id = p_shop_id
      AND p.is_active = TRUE
    ORDER BY 
        CASE 
            WHEN p.current_stock <= 0 THEN 1
            WHEN p.current_stock <= p.reorder_threshold THEN 2
            WHEN COALESCE(c.daily_rate, 0) > 0 AND (p.current_stock / c.daily_rate) <= 3 THEN 3
            ELSE 4
        END,
        days_of_stock_left ASC;
END;
$$;


-- 6. Stored Procedure: Dead Stock Report (Zero stock-out in N days)
CREATE OR REPLACE FUNCTION public.get_dead_stock_report(
    p_shop_id UUID,
    p_inactive_days INT DEFAULT 30
)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    category TEXT,
    current_stock NUMERIC,
    base_unit TEXT,
    cost_price NUMERIC,
    tied_up_capital NUMERIC,
    days_since_last_sale INT,
    last_sale_date TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    WITH last_sales AS (
        SELECT 
            t.product_id,
            MAX(t.created_at) AS last_sold_at
        FROM public.transactions t
        WHERE t.shop_id = p_shop_id
          AND t.type = 'out'
        GROUP BY t.product_id
    )
    SELECT 
        p.id AS product_id,
        p.name AS product_name,
        p.category,
        p.current_stock,
        p.base_unit,
        p.cost_price,
        ROUND(p.current_stock * p.cost_price, 2) AS tied_up_capital,
        COALESCE(EXTRACT(DAY FROM (NOW() - ls.last_sold_at))::INT, 999) AS days_since_last_sale,
        ls.last_sold_at AS last_sale_date
    FROM public.products p
    LEFT JOIN last_sales ls ON ls.product_id = p.id
    WHERE p.shop_id = p_shop_id
      AND p.is_active = TRUE
      AND p.current_stock > 0
      AND (ls.last_sold_at IS NULL OR ls.last_sold_at < (NOW() - (p_inactive_days || ' days')::INTERVAL))
    ORDER BY tied_up_capital DESC;
END;
$$;


-- 7. Stored Procedure: Daily Voice Briefing Statistics (Past 24 Hours)
CREATE OR REPLACE FUNCTION public.get_daily_briefing_stats(
    p_shop_id UUID
)
RETURNS TABLE (
    total_sales_amount NUMERIC,
    stock_in_count INT,
    stock_out_count INT,
    total_transactions_24h INT,
    new_udhaar_amount NUMERIC,
    payments_received_amount NUMERIC,
    items_below_threshold_count INT,
    critical_out_of_stock_count INT,
    top_moving_product TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    WITH stats_24h AS (
        SELECT
            COALESCE(SUM(CASE WHEN t.type = 'out' THEN t.total_amount ELSE 0 END), 0) AS sales_sum,
            COALESCE(COUNT(CASE WHEN t.type = 'in' THEN 1 END), 0)::INT AS in_cnt,
            COALESCE(COUNT(CASE WHEN t.type = 'out' THEN 1 END), 0)::INT AS out_cnt,
            COUNT(*)::INT AS total_cnt
        FROM public.transactions t
        WHERE t.shop_id = p_shop_id
          AND t.created_at >= (NOW() - INTERVAL '24 hours')
    ),
    khata_24h AS (
        SELECT 
            COALESCE(SUM(CASE WHEN k.type = 'credit' THEN k.amount ELSE 0 END), 0) AS udhaar_sum,
            COALESCE(SUM(CASE WHEN k.type = 'payment' THEN k.amount ELSE 0 END), 0) AS payment_sum
        FROM public.khata_ledger k
        WHERE k.shop_id = p_shop_id
          AND k.created_at >= (NOW() - INTERVAL '24 hours')
    ),
    stock_alerts AS (
        SELECT 
            COUNT(CASE WHEN current_stock <= reorder_threshold AND current_stock > 0 THEN 1 END)::INT AS low_cnt,
            COUNT(CASE WHEN current_stock <= 0 THEN 1 END)::INT AS out_cnt
        FROM public.products
        WHERE shop_id = p_shop_id
          AND is_active = TRUE
    ),
    top_product AS (
        SELECT p.name AS top_name
        FROM public.transactions t
        JOIN public.products p ON p.id = t.product_id
        WHERE t.shop_id = p_shop_id
          AND t.type = 'out'
          AND t.created_at >= (NOW() - INTERVAL '24 hours')
        GROUP BY p.name
        ORDER BY SUM(t.qty_in_base_unit) DESC
        LIMIT 1
    )
    SELECT 
        ROUND(s.sales_sum, 2) AS total_sales_amount,
        s.in_cnt AS stock_in_count,
        s.out_cnt AS stock_out_count,
        s.total_cnt AS total_transactions_24h,
        ROUND(k.udhaar_sum, 2) AS new_udhaar_amount,
        ROUND(k.payment_sum, 2) AS payments_received_amount,
        a.low_cnt AS items_below_threshold_count,
        a.out_cnt AS critical_out_of_stock_count,
        COALESCE(tp.top_name, 'No sales recorded yet') AS top_moving_product
    FROM stats_24h s
    CROSS JOIN khata_24h k
    CROSS JOIN stock_alerts a
    LEFT JOIN top_product tp ON TRUE;
END;
$$;
