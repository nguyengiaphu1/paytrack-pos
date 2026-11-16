-- PayTrack POS Atomic RPC Functions (SECURITY INVOKER + FOR UPDATE locking)
-- Migration: 0002_rpc_functions.sql

-- Helper: recompute customer total_debt and earliest unpaid due date cleanly
CREATE OR REPLACE FUNCTION public.recompute_customer_debt_state(p_customer_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_total_debt bigint;
  v_next_due date;
BEGIN
  SELECT
    COALESCE(SUM(total_amount - paid_amount), 0)::bigint,
    MIN(debt_due_date)
  INTO v_total_debt, v_next_due
  FROM public.orders
  WHERE user_id = p_user_id
    AND customer_id = p_customer_id
    AND payment_status IN ('unpaid', 'partial');

  UPDATE public.customers
  SET
    total_debt = GREATEST(v_total_debt, 0),
    next_due_date = v_next_due
  WHERE id = p_customer_id AND user_id = p_user_id;
END;
$$;

-- 1. create_order_with_items
CREATE OR REPLACE FUNCTION public.create_order_with_items(
  p_customer_id uuid DEFAULT NULL,
  p_discount_amount bigint DEFAULT 0,
  p_paid_amount bigint DEFAULT 0,
  p_payment_method text DEFAULT 'cash',
  p_debt_due_date date DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_subtotal bigint := 0;
  v_discount bigint := GREATEST(COALESCE(p_discount_amount, 0), 0);
  v_total bigint := 0;
  v_paid bigint := GREATEST(COALESCE(p_paid_amount, 0), 0);
  v_remaining bigint := 0;
  v_prev_debt bigint := 0;
  v_customer_name text := 'Khách lẻ';
  v_payment_status text;
  v_order_id uuid;
  v_order_code text;
  v_today_vn text := to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYYMMDD');
  v_seq int;
  v_qty numeric(10, 2);
  v_unit_price bigint;
  v_line_total bigint;
  v_new_customer_debt bigint := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Đơn hàng phải có ít nhất 1 sản phẩm';
  END IF;

  IF p_payment_method NOT IN ('cash', 'transfer', 'debt', 'mixed') THEN
    RAISE EXCEPTION 'Phương thức thanh toán không hợp lệ';
  END IF;

  -- Lock customer row if provided
  IF p_customer_id IS NOT NULL THEN
    SELECT name, total_debt
    INTO v_customer_name, v_prev_debt
    FROM public.customers
    WHERE id = p_customer_id AND user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Không tìm thấy khách hàng';
    END IF;
  END IF;

  -- Compute subtotal using nearest integer VND per line
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := COALESCE((v_item ->> 'quantity')::numeric(10, 2), 0);
    v_unit_price := COALESCE((v_item ->> 'unit_price')::bigint, 0);
    IF v_qty <= 0 OR v_unit_price < 0 THEN
      RAISE EXCEPTION 'Số lượng và đơn giá sản phẩm phải hợp lệ';
    END IF;
    v_line_total := ROUND(v_qty * v_unit_price)::bigint;
    v_subtotal := v_subtotal + v_line_total;
  END LOOP;

  IF v_discount > v_subtotal THEN
    v_discount := v_subtotal;
  END IF;

  v_total := v_subtotal - v_discount;

  IF v_paid > v_total THEN
    RAISE EXCEPTION 'Số tiền khách trả không được lớn hơn tổng đơn hàng';
  END IF;

  v_remaining := v_total - v_paid;

  IF v_remaining > 0 AND p_customer_id IS NULL THEN
    RAISE EXCEPTION 'Đơn ghi nợ bắt buộc phải chọn tên khách hàng';
  END IF;

  IF v_remaining = 0 THEN
    v_payment_status := 'paid';
  ELSIF v_paid > 0 THEN
    v_payment_status := 'partial';
  ELSE
    v_payment_status := 'unpaid';
  END IF;

  -- Generate daily sequential order code: DH-YYYYMMDD-XXXX
  SELECT COALESCE(COUNT(*), 0) + 1
  INTO v_seq
  FROM public.orders
  WHERE user_id = v_user_id
    AND order_code LIKE ('DH-' || v_today_vn || '-%');

  v_order_code := 'DH-' || v_today_vn || '-' || lpad(v_seq::text, 4, '0');
  -- Handle potential rare collision via short random suffix
  IF EXISTS (SELECT 1 FROM public.orders WHERE user_id = v_user_id AND order_code = v_order_code) THEN
    v_order_code := 'DH-' || v_today_vn || '-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 4));
  END IF;

  INSERT INTO public.orders (
    user_id,
    order_code,
    customer_id,
    customer_name_snapshot,
    subtotal,
    discount_amount,
    total_amount,
    paid_amount,
    previous_customer_debt,
    payment_status,
    payment_method,
    debt_due_date,
    note
  ) VALUES (
    v_user_id,
    v_order_code,
    p_customer_id,
    v_customer_name,
    v_subtotal,
    v_discount,
    v_total,
    v_paid,
    v_prev_debt,
    v_payment_status,
    p_payment_method,
    CASE WHEN v_remaining > 0 THEN p_debt_due_date ELSE NULL END,
    NULLIF(trim(COALESCE(p_note, '')), '')
  )
  RETURNING id INTO v_order_id;

  -- Insert immutable line items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item ->> 'quantity')::numeric(10, 2);
    v_unit_price := (v_item ->> 'unit_price')::bigint;
    v_line_total := ROUND(v_qty * v_unit_price)::bigint;

    INSERT INTO public.order_items (
      user_id,
      order_id,
      product_id,
      product_name,
      unit,
      unit_price,
      cost_price,
      quantity,
      line_total
    ) VALUES (
      v_user_id,
      v_order_id,
      NULLIF(v_item ->> 'product_id', '')::uuid,
      COALESCE(NULLIF(trim(v_item ->> 'product_name'), ''), 'Mặt hàng'),
      COALESCE(NULLIF(trim(v_item ->> 'unit'), ''), 'cái'),
      v_unit_price,
      CASE
        WHEN (v_item ->> 'cost_price') IS NULL OR (v_item ->> 'cost_price') = '' THEN NULL
        ELSE GREATEST((v_item ->> 'cost_price')::bigint, 0)
      END,
      v_qty,
      v_line_total
    );
  END LOOP;

  -- Log initial cash/transfer payment against customer audit trail if customer exists & paid > 0
  IF p_customer_id IS NOT NULL AND v_paid > 0 THEN
    INSERT INTO public.debt_payments (
      user_id,
      customer_id,
      order_id,
      amount,
      payment_method,
      note
    ) VALUES (
      v_user_id,
      p_customer_id,
      v_order_id,
      v_paid,
      CASE WHEN p_payment_method = 'transfer' THEN 'transfer' ELSE 'cash' END,
      'Thanh toán khi lập đơn ' || v_order_code
    );
  END IF;

  IF p_customer_id IS NOT NULL THEN
    PERFORM public.recompute_customer_debt_state(p_customer_id, v_user_id);
    SELECT total_debt INTO v_new_customer_debt
    FROM public.customers
    WHERE id = p_customer_id AND user_id = v_user_id;
  END IF;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_code', v_order_code,
    'total_amount', v_total,
    'remaining_amount', v_remaining,
    'new_customer_debt', COALESCE(v_new_customer_debt, 0)
  );
END;
$$;

-- 2. record_debt_payment (FIFO oldest-first or single target order)
CREATE OR REPLACE FUNCTION public.record_debt_payment(
  p_customer_id uuid,
  p_amount bigint,
  p_payment_method text DEFAULT 'cash',
  p_order_id uuid DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_customer_debt bigint;
  v_left_to_allocate bigint := COALESCE(p_amount, 0);
  v_order record;
  v_apply bigint;
  v_new_paid bigint;
  v_new_status text;
  v_payment_id uuid;
  v_payment_ids uuid[] := ARRAY[]::uuid[];
  v_allocated jsonb := '[]'::jsonb;
  v_remaining_customer_debt bigint := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  IF v_left_to_allocate <= 0 THEN
    RAISE EXCEPTION 'Số tiền thu nợ phải lớn hơn 0';
  END IF;

  IF p_payment_method NOT IN ('cash', 'transfer') THEN
    RAISE EXCEPTION 'Phương thức thu nợ phải là cash hoặc transfer';
  END IF;

  SELECT total_debt
  INTO v_customer_debt
  FROM public.customers
  WHERE id = p_customer_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy khách hàng';
  END IF;

  IF v_left_to_allocate > v_customer_debt THEN
    RAISE EXCEPTION 'Số tiền thu (%) vượt quá tổng nợ hiện tại (%)', v_left_to_allocate, v_customer_debt;
  END IF;

  IF p_order_id IS NOT NULL THEN
    SELECT id, order_code, total_amount, paid_amount, (total_amount - paid_amount) AS remaining_amount
    INTO v_order
    FROM public.orders
    WHERE id = p_order_id
      AND user_id = v_user_id
      AND customer_id = p_customer_id
      AND payment_status IN ('unpaid', 'partial')
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Không tìm thấy đơn hàng còn nợ phù hợp';
    END IF;

    IF v_left_to_allocate > v_order.remaining_amount THEN
      RAISE EXCEPTION 'Số tiền thu vượt quá số nợ còn lại của đơn %', v_order.order_code;
    END IF;

    v_new_paid := v_order.paid_amount + v_left_to_allocate;
    v_new_status := CASE WHEN v_new_paid >= v_order.total_amount THEN 'paid' ELSE 'partial' END;

    UPDATE public.orders
    SET paid_amount = v_new_paid, payment_status = v_new_status
    WHERE id = v_order.id;

    INSERT INTO public.debt_payments (user_id, customer_id, order_id, amount, payment_method, note)
    VALUES (
      v_user_id,
      p_customer_id,
      v_order.id,
      v_left_to_allocate,
      p_payment_method,
      COALESCE(NULLIF(trim(COALESCE(p_note, '')), ''), 'Thu nợ đơn ' || v_order.order_code)
    )
    RETURNING id INTO v_payment_id;

    v_payment_ids := array_append(v_payment_ids, v_payment_id);
    v_allocated := v_allocated || jsonb_build_object(
      'order_id', v_order.id,
      'applied', v_left_to_allocate,
      'new_status', v_new_status
    );
    v_left_to_allocate := 0;
  ELSE
    -- FIFO oldest-first allocation across unpaid/partial orders
    FOR v_order IN
      SELECT id, order_code, total_amount, paid_amount, (total_amount - paid_amount) AS remaining_amount
      FROM public.orders
      WHERE user_id = v_user_id
        AND customer_id = p_customer_id
        AND payment_status IN ('unpaid', 'partial')
      ORDER BY created_at ASC, id ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_left_to_allocate <= 0;

      v_apply := LEAST(v_left_to_allocate, v_order.remaining_amount);
      IF v_apply <= 0 THEN
        CONTINUE;
      END IF;

      v_new_paid := v_order.paid_amount + v_apply;
      v_new_status := CASE WHEN v_new_paid >= v_order.total_amount THEN 'paid' ELSE 'partial' END;

      UPDATE public.orders
      SET paid_amount = v_new_paid, payment_status = v_new_status
      WHERE id = v_order.id;

      INSERT INTO public.debt_payments (user_id, customer_id, order_id, amount, payment_method, note)
      VALUES (
        v_user_id,
        p_customer_id,
        v_order.id,
        v_apply,
        p_payment_method,
        COALESCE(NULLIF(trim(COALESCE(p_note, '')), ''), 'Thu nợ FIFO đơn ' || v_order.order_code)
      )
      RETURNING id INTO v_payment_id;

      v_payment_ids := array_append(v_payment_ids, v_payment_id);
      v_allocated := v_allocated || jsonb_build_object(
        'order_id', v_order.id,
        'applied', v_apply,
        'new_status', v_new_status
      );

      v_left_to_allocate := v_left_to_allocate - v_apply;
    END LOOP;
  END IF;

  PERFORM public.recompute_customer_debt_state(p_customer_id, v_user_id);

  SELECT total_debt INTO v_remaining_customer_debt
  FROM public.customers
  WHERE id = p_customer_id AND user_id = v_user_id;

  RETURN jsonb_build_object(
    'payment_ids', to_jsonb(v_payment_ids),
    'allocated_orders', v_allocated,
    'remaining_customer_debt', COALESCE(v_remaining_customer_debt, 0)
  );
END;
$$;

-- 3. cancel_order (reverses only remaining_amount; preserves historical debt_payments)
CREATE OR REPLACE FUNCTION public.cancel_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_order record;
  v_reversed_debt bigint := 0;
  v_remaining_customer_debt bigint := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  SELECT id, customer_id, payment_status, (total_amount - paid_amount) AS remaining_amount
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy đơn hàng';
  END IF;

  IF v_order.payment_status = 'cancelled' THEN
    RAISE EXCEPTION 'Đơn hàng này đã được hủy trước đó';
  END IF;

  v_reversed_debt := GREATEST(v_order.remaining_amount, 0);

  UPDATE public.orders
  SET payment_status = 'cancelled'
  WHERE id = v_order.id;

  UPDATE public.debt_reminders
  SET status = 'dismissed'
  WHERE user_id = v_user_id
    AND order_id = v_order.id
    AND status = 'pending';

  IF v_order.customer_id IS NOT NULL THEN
    PERFORM 1 FROM public.customers WHERE id = v_order.customer_id AND user_id = v_user_id FOR UPDATE;
    PERFORM public.recompute_customer_debt_state(v_order.customer_id, v_user_id);
    SELECT total_debt INTO v_remaining_customer_debt
    FROM public.customers
    WHERE id = v_order.customer_id AND user_id = v_user_id;
  END IF;

  RETURN jsonb_build_object(
    'order_id', v_order.id,
    'payment_status', 'cancelled',
    'reversed_debt_amount', v_reversed_debt,
    'remaining_customer_debt', COALESCE(v_remaining_customer_debt, 0)
  );
END;
$$;

-- 4. get_analytics_summary
CREATE OR REPLACE FUNCTION public.get_analytics_summary(
  p_start timestamptz,
  p_end timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_today_vn date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_total_revenue bigint := 0;
  v_cash_collected bigint := 0;
  v_new_debt_created bigint := 0;
  v_total_outstanding_debt bigint := 0;
  v_order_count int := 0;
  v_tracked_revenue bigint := 0;
  v_tracked_cost bigint := 0;
  v_estimated_gross_profit bigint := NULL;
  v_profit_tracked_ratio numeric := 0;
  v_daily_series jsonb := '[]'::jsonb;
  v_payment_breakdown jsonb;
  v_debt_aging jsonb;
  v_top_products jsonb := '[]'::jsonb;
  v_top_debtors jsonb := '[]'::jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  -- KPIs from non-cancelled orders in range
  SELECT
    COALESCE(SUM(total_amount), 0)::bigint,
    COALESCE(SUM(total_amount - paid_amount), 0)::bigint,
    COUNT(*)::int
  INTO v_total_revenue, v_new_debt_created, v_order_count
  FROM public.orders
  WHERE user_id = v_user_id
    AND payment_status <> 'cancelled'
    AND created_at >= p_start
    AND created_at <= p_end;

  -- Cash collected in period: direct non-customer POS cash/transfer + debt_payments collected in range
  SELECT
    COALESCE((
      SELECT SUM(dp.amount)
      FROM public.debt_payments dp
      LEFT JOIN public.orders o ON o.id = dp.order_id
      WHERE dp.user_id = v_user_id
        AND dp.paid_at >= p_start
        AND dp.paid_at <= p_end
        AND (o.id IS NULL OR o.payment_status <> 'cancelled')
    ), 0)::bigint
    +
    COALESCE((
      SELECT SUM(o.paid_amount)
      FROM public.orders o
      WHERE o.user_id = v_user_id
        AND o.customer_id IS NULL
        AND o.payment_status <> 'cancelled'
        AND o.created_at >= p_start
        AND o.created_at <= p_end
    ), 0)::bigint
  INTO v_cash_collected;

  -- Total outstanding debt across all active customers
  SELECT COALESCE(SUM(total_debt), 0)::bigint
  INTO v_total_outstanding_debt
  FROM public.customers
  WHERE user_id = v_user_id AND total_debt > 0;

  -- Optional cost_price gross profit calculation
  SELECT
    COALESCE(SUM(CASE WHEN oi.cost_price IS NOT NULL THEN oi.line_total ELSE 0 END), 0)::bigint,
    COALESCE(SUM(CASE WHEN oi.cost_price IS NOT NULL THEN ROUND(oi.quantity * oi.cost_price)::bigint ELSE 0 END), 0)::bigint
  INTO v_tracked_revenue, v_tracked_cost
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.user_id = v_user_id
    AND o.payment_status <> 'cancelled'
    AND o.created_at >= p_start
    AND o.created_at <= p_end;

  IF v_tracked_revenue > 0 THEN
    v_estimated_gross_profit := v_tracked_revenue - v_tracked_cost;
  END IF;

  IF v_total_revenue > 0 THEN
    v_profit_tracked_ratio := ROUND((v_tracked_revenue::numeric / v_total_revenue::numeric), 2);
  END IF;

  -- Daily series (Revenue vs Collected Cash in Asia/Ho_Chi_Minh)
  WITH dates AS (
    SELECT generate_series(
      (p_start AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
      (p_end AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
      interval '1 day'
    )::date AS d
  ),
  rev AS (
    SELECT
      (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS d,
      SUM(total_amount)::bigint AS revenue
    FROM public.orders
    WHERE user_id = v_user_id
      AND payment_status <> 'cancelled'
      AND created_at >= p_start
      AND created_at <= p_end
    GROUP BY 1
  ),
  col_dp AS (
    SELECT
      (dp.paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS d,
      SUM(dp.amount)::bigint AS amt
    FROM public.debt_payments dp
    LEFT JOIN public.orders o ON o.id = dp.order_id
    WHERE dp.user_id = v_user_id
      AND dp.paid_at >= p_start
      AND dp.paid_at <= p_end
      AND (o.id IS NULL OR o.payment_status <> 'cancelled')
    GROUP BY 1
  ),
  col_walkin AS (
    SELECT
      (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS d,
      SUM(paid_amount)::bigint AS amt
    FROM public.orders
    WHERE user_id = v_user_id
      AND customer_id IS NULL
      AND payment_status <> 'cancelled'
      AND created_at >= p_start
      AND created_at <= p_end
    GROUP BY 1
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'date', to_char(dates.d, 'YYYY-MM-DD'),
      'revenue', COALESCE(rev.revenue, 0),
      'collected', COALESCE(col_dp.amt, 0) + COALESCE(col_walkin.amt, 0)
    ) ORDER BY dates.d
  ), '[]'::jsonb)
  INTO v_daily_series
  FROM dates
  LEFT JOIN rev ON rev.d = dates.d
  LEFT JOIN col_dp ON col_dp.d = dates.d
  LEFT JOIN col_walkin ON col_walkin.d = dates.d;

  -- Payment breakdown (cash paid, transfer paid, remaining debt)
  SELECT jsonb_build_object(
    'cash', COALESCE(SUM(CASE WHEN payment_method IN ('cash', 'mixed') THEN paid_amount ELSE 0 END), 0)::bigint,
    'transfer', COALESCE(SUM(CASE WHEN payment_method = 'transfer' THEN paid_amount ELSE 0 END), 0)::bigint,
    'debt', COALESCE(SUM(total_amount - paid_amount), 0)::bigint
  )
  INTO v_payment_breakdown
  FROM public.orders
  WHERE user_id = v_user_id
    AND payment_status <> 'cancelled'
    AND created_at >= p_start
    AND created_at <= p_end;

  -- Debt aging buckets across open customer debts
  SELECT jsonb_build_object(
    'due_or_upcoming', COALESCE(SUM(CASE WHEN next_due_date IS NOT NULL AND next_due_date >= v_today_vn THEN total_debt ELSE 0 END), 0)::bigint,
    'overdue', COALESCE(SUM(CASE WHEN next_due_date IS NOT NULL AND next_due_date < v_today_vn THEN total_debt ELSE 0 END), 0)::bigint,
    'no_due_date', COALESCE(SUM(CASE WHEN next_due_date IS NULL THEN total_debt ELSE 0 END), 0)::bigint
  )
  INTO v_debt_aging
  FROM public.customers
  WHERE user_id = v_user_id AND total_debt > 0;

  -- Top 5 products by revenue in range
  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
  INTO v_top_products
  FROM (
    SELECT
      oi.product_name,
      SUM(oi.quantity)::numeric(10, 2) AS qty,
      SUM(oi.line_total)::bigint AS revenue
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.user_id = v_user_id
      AND o.payment_status <> 'cancelled'
      AND o.created_at >= p_start
      AND o.created_at <= p_end
    GROUP BY oi.product_name
    ORDER BY revenue DESC
    LIMIT 5
  ) t;

  -- Top 5 debtors overall
  SELECT COALESCE(jsonb_agg(d), '[]'::jsonb)
  INTO v_top_debtors
  FROM (
    SELECT
      id AS customer_id,
      name,
      total_debt,
      next_due_date
    FROM public.customers
    WHERE user_id = v_user_id AND total_debt > 0
    ORDER BY total_debt DESC
    LIMIT 5
  ) d;

  RETURN jsonb_build_object(
    'kpis', jsonb_build_object(
      'total_revenue', v_total_revenue,
      'cash_collected', v_cash_collected,
      'estimated_gross_profit', v_estimated_gross_profit,
      'profit_tracked_ratio', v_profit_tracked_ratio,
      'new_debt_created', v_new_debt_created,
      'total_outstanding_debt', v_total_outstanding_debt,
      'order_count', v_order_count
    ),
    'daily_series', v_daily_series,
    'payment_breakdown', v_payment_breakdown,
    'debt_aging', v_debt_aging,
    'top_products', v_top_products,
    'top_debtors', v_top_debtors
  );
END;
$$;
