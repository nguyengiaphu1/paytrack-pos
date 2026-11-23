-- PayTrack POS 12-Field Sales Ledger, Payment Accounts & Cost/Profit RPCs
-- Migration: 0005_mom_ledger_fields.sql
-- Safe for production: additive columns, idempotent constraints, historical data backfill, RLS preserved.

-- 1. Additive columns on customers, orders, debt_payments
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS address text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_address_snapshot text,
  ADD COLUMN IF NOT EXISTS customer_phone_snapshot text,
  ADD COLUMN IF NOT EXISTS purchased_at timestamptz,
  ADD COLUMN IF NOT EXISTS total_cost bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_account text,
  ADD COLUMN IF NOT EXISTS payment_account_note text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

ALTER TABLE public.debt_payments
  ADD COLUMN IF NOT EXISTS payment_account text,
  ADD COLUMN IF NOT EXISTS payment_account_note text;

-- 2. Historical data backfill (safe & idempotent)
UPDATE public.orders
SET purchased_at = created_at
WHERE purchased_at IS NULL;

ALTER TABLE public.orders
  ALTER COLUMN purchased_at SET DEFAULT now(),
  ALTER COLUMN purchased_at SET NOT NULL;

UPDATE public.orders o
SET
  customer_phone_snapshot = COALESCE(o.customer_phone_snapshot, c.phone),
  customer_address_snapshot = COALESCE(o.customer_address_snapshot, c.address)
FROM public.customers c
WHERE o.customer_id = c.id
  AND (o.customer_phone_snapshot IS NULL OR o.customer_address_snapshot IS NULL);

-- Backfill order_items.cost_price from products.cost_price where missing
UPDATE public.order_items oi
SET cost_price = p.cost_price
FROM public.products p
WHERE oi.product_id = p.id
  AND oi.cost_price IS NULL
  AND p.cost_price IS NOT NULL;

-- Backfill orders.total_cost from line items where still 0
UPDATE public.orders o
SET total_cost = sub.cost_sum
FROM (
  SELECT
    oi.order_id,
    COALESCE(SUM(ROUND(oi.quantity * COALESCE(oi.cost_price, 0))::bigint), 0)::bigint AS cost_sum
  FROM public.order_items oi
  GROUP BY oi.order_id
) sub
WHERE o.id = sub.order_id
  AND o.total_cost = 0
  AND sub.cost_sum > 0;

-- Backfill orders.paid_at for existing fully-paid orders
UPDATE public.orders o
SET paid_at = COALESCE(
  (SELECT MAX(dp.paid_at) FROM public.debt_payments dp WHERE dp.order_id = o.id),
  o.purchased_at,
  o.created_at
)
WHERE o.payment_status = 'paid'
  AND o.paid_at IS NULL;

-- 3. Constraints & Indexes
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_total_cost_non_negative;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_total_cost_non_negative CHECK (total_cost >= 0);

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_account_valid;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_account_valid CHECK (
    payment_account IS NULL OR payment_account IN (
      'Thanh',
      'Phú',
      'Trang',
      'Trang Lê',
      'Thuỳ Trang',
      'Thuỷ',
      'Kiều Thương',
      'Vận chuyển',
      'Khác'
    )
  );

ALTER TABLE public.debt_payments DROP CONSTRAINT IF EXISTS debt_payments_payment_account_valid;
ALTER TABLE public.debt_payments
  ADD CONSTRAINT debt_payments_payment_account_valid CHECK (
    payment_account IS NULL OR payment_account IN (
      'Thanh',
      'Phú',
      'Trang',
      'Trang Lê',
      'Thuỳ Trang',
      'Thuỷ',
      'Kiều Thương',
      'Vận chuyển',
      'Khác'
    )
  );

CREATE INDEX IF NOT EXISTS idx_orders_user_purchased_at
  ON public.orders(user_id, purchased_at DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_user_payment_account
  ON public.orders(user_id, payment_account);

-- 4. Drop previous RPC signatures to avoid PostgREST overloaded-function ambiguity (PGRST203)
DROP FUNCTION IF EXISTS public.create_order_with_items(uuid, bigint, bigint, text, date, text, jsonb);
DROP FUNCTION IF EXISTS public.record_debt_payment(uuid, bigint, text, uuid, text);
DROP FUNCTION IF EXISTS public.get_analytics_summary(timestamptz, timestamptz);

-- 5. Updated RPC: create_order_with_items
CREATE OR REPLACE FUNCTION public.create_order_with_items(
  p_customer_id uuid DEFAULT NULL,
  p_discount_amount bigint DEFAULT 0,
  p_paid_amount bigint DEFAULT 0,
  p_payment_method text DEFAULT 'cash',
  p_debt_due_date date DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_customer_name_snapshot text DEFAULT NULL,
  p_customer_address_snapshot text DEFAULT NULL,
  p_customer_phone_snapshot text DEFAULT NULL,
  p_purchased_at timestamptz DEFAULT NULL,
  p_total_cost bigint DEFAULT NULL,
  p_payment_account text DEFAULT NULL,
  p_payment_account_note text DEFAULT NULL,
  p_paid_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_subtotal bigint := 0;
  v_computed_cost bigint := 0;
  v_total_cost bigint := 0;
  v_discount bigint := GREATEST(COALESCE(p_discount_amount, 0), 0);
  v_total bigint := 0;
  v_paid bigint := GREATEST(COALESCE(p_paid_amount, 0), 0);
  v_remaining bigint := 0;
  v_prev_debt bigint := 0;
  v_customer_name text := 'Khách lẻ';
  v_customer_address text := NULL;
  v_customer_phone text := NULL;
  v_payment_status text;
  v_payment_account text := NULLIF(trim(COALESCE(p_payment_account, '')), '');
  v_payment_account_note text := NULLIF(trim(COALESCE(p_payment_account_note, '')), '');
  v_purchased_at timestamptz := COALESCE(p_purchased_at, now());
  v_paid_at timestamptz := NULL;
  v_order_id uuid;
  v_order_code text;
  v_today_vn text := to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYYMMDD');
  v_seq int;
  v_qty numeric(10, 2);
  v_unit_price bigint;
  v_cost_price bigint;
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

  IF v_payment_account IS NOT NULL AND v_payment_account NOT IN (
    'Thanh', 'Phú', 'Trang', 'Trang Lê', 'Thuỳ Trang', 'Thuỷ', 'Kiều Thương', 'Vận chuyển', 'Khác'
  ) THEN
    RAISE EXCEPTION 'Tên tài khoản thanh toán không hợp lệ';
  END IF;

  IF v_payment_account IS NULL THEN
    v_payment_account_note := NULL;
  END IF;

  -- Lock customer row if provided
  IF p_customer_id IS NOT NULL THEN
    SELECT name, address, phone, total_debt
    INTO v_customer_name, v_customer_address, v_customer_phone, v_prev_debt
    FROM public.customers
    WHERE id = p_customer_id AND user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Không tìm thấy khách hàng';
    END IF;
  END IF;

  -- Allow explicit snapshot overrides (e.g., delivery address/phone edited at checkout or walk-in buyer info)
  IF NULLIF(trim(COALESCE(p_customer_name_snapshot, '')), '') IS NOT NULL THEN
    v_customer_name := trim(p_customer_name_snapshot);
  END IF;
  IF p_customer_address_snapshot IS NOT NULL THEN
    v_customer_address := NULLIF(trim(p_customer_address_snapshot), '');
  END IF;
  IF p_customer_phone_snapshot IS NOT NULL THEN
    v_customer_phone := NULLIF(trim(p_customer_phone_snapshot), '');
  END IF;

  -- Compute subtotal and total cost using nearest integer VND per line
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := COALESCE((v_item ->> 'quantity')::numeric(10, 2), 0);
    v_unit_price := COALESCE((v_item ->> 'unit_price')::bigint, 0);
    IF v_qty <= 0 OR v_unit_price < 0 THEN
      RAISE EXCEPTION 'Số lượng và đơn giá sản phẩm phải hợp lệ';
    END IF;
    v_line_total := ROUND(v_qty * v_unit_price)::bigint;
    v_subtotal := v_subtotal + v_line_total;

    IF (v_item ->> 'cost_price') IS NOT NULL AND (v_item ->> 'cost_price') <> '' THEN
      v_cost_price := GREATEST((v_item ->> 'cost_price')::bigint, 0);
      v_computed_cost := v_computed_cost + ROUND(v_qty * v_cost_price)::bigint;
    END IF;
  END LOOP;

  v_total_cost := GREATEST(COALESCE(p_total_cost, v_computed_cost), 0);

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
    v_paid_at := COALESCE(p_paid_at, v_purchased_at);
  ELSIF v_paid > 0 THEN
    v_payment_status := 'partial';
    v_paid_at := NULL;
  ELSE
    v_payment_status := 'unpaid';
    v_paid_at := NULL;
  END IF;

  -- Generate daily sequential order code: DH-YYYYMMDD-XXXX
  SELECT COALESCE(COUNT(*), 0) + 1
  INTO v_seq
  FROM public.orders
  WHERE user_id = v_user_id
    AND order_code LIKE ('DH-' || v_today_vn || '-%');

  v_order_code := 'DH-' || v_today_vn || '-' || lpad(v_seq::text, 4, '0');
  IF EXISTS (SELECT 1 FROM public.orders WHERE user_id = v_user_id AND order_code = v_order_code) THEN
    v_order_code := 'DH-' || v_today_vn || '-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 4));
  END IF;

  INSERT INTO public.orders (
    user_id,
    order_code,
    customer_id,
    customer_name_snapshot,
    customer_address_snapshot,
    customer_phone_snapshot,
    purchased_at,
    subtotal,
    discount_amount,
    total_amount,
    total_cost,
    paid_amount,
    previous_customer_debt,
    payment_status,
    payment_method,
    payment_account,
    payment_account_note,
    paid_at,
    debt_due_date,
    note
  ) VALUES (
    v_user_id,
    v_order_code,
    p_customer_id,
    v_customer_name,
    v_customer_address,
    v_customer_phone,
    v_purchased_at,
    v_subtotal,
    v_discount,
    v_total,
    v_total_cost,
    v_paid,
    v_prev_debt,
    v_payment_status,
    p_payment_method,
    v_payment_account,
    v_payment_account_note,
    v_paid_at,
    CASE WHEN v_remaining > 0 THEN p_debt_due_date ELSE NULL END,
    NULLIF(trim(COALESCE(p_note, '')), '')
  )
  RETURNING id INTO v_order_id;

  -- Insert immutable line items with cost_price snapshot
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
      payment_account,
      payment_account_note,
      note,
      paid_at
    ) VALUES (
      v_user_id,
      p_customer_id,
      v_order_id,
      v_paid,
      CASE WHEN p_payment_method = 'transfer' THEN 'transfer' ELSE 'cash' END,
      v_payment_account,
      v_payment_account_note,
      'Thanh toán khi lập đơn ' || v_order_code,
      COALESCE(p_paid_at, v_purchased_at)
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
    'total_cost', v_total_cost,
    'remaining_amount', v_remaining,
    'new_customer_debt', COALESCE(v_new_customer_debt, 0)
  );
END;
$$;

-- 6. Updated RPC: record_debt_payment (FIFO oldest-first or single target order, with payment_account & paid_at)
CREATE OR REPLACE FUNCTION public.record_debt_payment(
  p_customer_id uuid,
  p_amount bigint,
  p_payment_method text DEFAULT 'cash',
  p_order_id uuid DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_payment_account text DEFAULT NULL,
  p_payment_account_note text DEFAULT NULL,
  p_paid_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_customer_debt bigint;
  v_left_to_allocate bigint := COALESCE(p_amount, 0);
  v_payment_account text := NULLIF(trim(COALESCE(p_payment_account, '')), '');
  v_payment_account_note text := NULLIF(trim(COALESCE(p_payment_account_note, '')), '');
  v_paid_at timestamptz := COALESCE(p_paid_at, now());
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

  IF v_payment_account IS NOT NULL AND v_payment_account NOT IN (
    'Thanh', 'Phú', 'Trang', 'Trang Lê', 'Thuỳ Trang', 'Thuỷ', 'Kiều Thương', 'Vận chuyển', 'Khác'
  ) THEN
    RAISE EXCEPTION 'Tên tài khoản thanh toán không hợp lệ';
  END IF;

  IF v_payment_account IS NULL THEN
    v_payment_account_note := NULL;
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
    SET
      paid_amount = v_new_paid,
      payment_status = v_new_status,
      paid_at = CASE WHEN v_new_status = 'paid' THEN v_paid_at ELSE paid_at END,
      payment_account = COALESCE(v_payment_account, payment_account),
      payment_account_note = CASE
        WHEN v_payment_account IS NOT NULL THEN v_payment_account_note
        ELSE payment_account_note
      END
    WHERE id = v_order.id;

    INSERT INTO public.debt_payments (
      user_id,
      customer_id,
      order_id,
      amount,
      payment_method,
      payment_account,
      payment_account_note,
      note,
      paid_at
    )
    VALUES (
      v_user_id,
      p_customer_id,
      v_order.id,
      v_left_to_allocate,
      p_payment_method,
      v_payment_account,
      v_payment_account_note,
      COALESCE(NULLIF(trim(COALESCE(p_note, '')), ''), 'Thu nợ đơn ' || v_order.order_code),
      v_paid_at
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
    -- FIFO oldest-first allocation ordered by business purchase date
    FOR v_order IN
      SELECT id, order_code, total_amount, paid_amount, (total_amount - paid_amount) AS remaining_amount
      FROM public.orders
      WHERE user_id = v_user_id
        AND customer_id = p_customer_id
        AND payment_status IN ('unpaid', 'partial')
      ORDER BY purchased_at ASC, created_at ASC, id ASC
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
      SET
        paid_amount = v_new_paid,
        payment_status = v_new_status,
        paid_at = CASE WHEN v_new_status = 'paid' THEN v_paid_at ELSE paid_at END,
        payment_account = COALESCE(v_payment_account, payment_account),
        payment_account_note = CASE
          WHEN v_payment_account IS NOT NULL THEN v_payment_account_note
          ELSE payment_account_note
        END
      WHERE id = v_order.id;

      INSERT INTO public.debt_payments (
        user_id,
        customer_id,
        order_id,
        amount,
        payment_method,
        payment_account,
        payment_account_note,
        note,
        paid_at
      )
      VALUES (
        v_user_id,
        p_customer_id,
        v_order.id,
        v_apply,
        p_payment_method,
        v_payment_account,
        v_payment_account_note,
        COALESCE(NULLIF(trim(COALESCE(p_note, '')), ''), 'Thu nợ FIFO đơn ' || v_order.order_code),
        v_paid_at
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

-- 7. New RPC: update_order_ledger_fields (safe manual edit of ledger fields & item cost prices)
CREATE OR REPLACE FUNCTION public.update_order_ledger_fields(
  p_order_id uuid,
  p_customer_name_snapshot text DEFAULT NULL,
  p_customer_address_snapshot text DEFAULT NULL,
  p_customer_phone_snapshot text DEFAULT NULL,
  p_purchased_at timestamptz DEFAULT NULL,
  p_paid_at timestamptz DEFAULT NULL,
  p_clear_paid_at boolean DEFAULT false,
  p_payment_account text DEFAULT NULL,
  p_clear_payment_account boolean DEFAULT false,
  p_payment_account_note text DEFAULT NULL,
  p_total_cost bigint DEFAULT NULL,
  p_item_costs jsonb DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_order public.orders%ROWTYPE;
  v_payment_account text := NULLIF(trim(COALESCE(p_payment_account, '')), '');
  v_payment_account_note text := NULLIF(trim(COALESCE(p_payment_account_note, '')), '');
  v_item jsonb;
  v_item_id uuid;
  v_item_cost bigint;
  v_next_total_cost bigint;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy đơn hàng';
  END IF;

  IF v_payment_account IS NOT NULL AND v_payment_account NOT IN (
    'Thanh', 'Phú', 'Trang', 'Trang Lê', 'Thuỳ Trang', 'Thuỷ', 'Kiều Thương', 'Vận chuyển', 'Khác'
  ) THEN
    RAISE EXCEPTION 'Tên tài khoản thanh toán không hợp lệ';
  END IF;

  v_next_total_cost := v_order.total_cost;

  -- Update individual order_items cost_price when provided and recompute total_cost
  IF p_item_costs IS NOT NULL AND jsonb_typeof(p_item_costs) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_item_costs)
    LOOP
      v_item_id := NULLIF(v_item ->> 'id', '')::uuid;
      IF v_item_id IS NULL THEN
        CONTINUE;
      END IF;
      IF (v_item ->> 'cost_price') IS NULL OR (v_item ->> 'cost_price') = '' THEN
        v_item_cost := NULL;
      ELSE
        v_item_cost := GREATEST((v_item ->> 'cost_price')::bigint, 0);
      END IF;

      UPDATE public.order_items
      SET cost_price = v_item_cost
      WHERE id = v_item_id
        AND order_id = p_order_id
        AND user_id = v_user_id;
    END LOOP;

    SELECT COALESCE(SUM(ROUND(quantity * COALESCE(cost_price, 0))::bigint), 0)::bigint
    INTO v_next_total_cost
    FROM public.order_items
    WHERE order_id = p_order_id AND user_id = v_user_id;
  ELSIF p_total_cost IS NOT NULL THEN
    v_next_total_cost := GREATEST(p_total_cost, 0);
  END IF;

  UPDATE public.orders
  SET
    customer_name_snapshot = COALESCE(NULLIF(trim(COALESCE(p_customer_name_snapshot, '')), ''), customer_name_snapshot),
    customer_address_snapshot = CASE
      WHEN p_customer_address_snapshot IS NULL THEN customer_address_snapshot
      ELSE NULLIF(trim(p_customer_address_snapshot), '')
    END,
    customer_phone_snapshot = CASE
      WHEN p_customer_phone_snapshot IS NULL THEN customer_phone_snapshot
      ELSE NULLIF(trim(p_customer_phone_snapshot), '')
    END,
    purchased_at = COALESCE(p_purchased_at, purchased_at),
    paid_at = CASE
      WHEN p_clear_paid_at THEN NULL
      WHEN p_paid_at IS NOT NULL THEN p_paid_at
      ELSE paid_at
    END,
    payment_account = CASE
      WHEN p_clear_payment_account THEN NULL
      WHEN v_payment_account IS NOT NULL THEN v_payment_account
      ELSE payment_account
    END,
    payment_account_note = CASE
      WHEN p_clear_payment_account THEN NULL
      WHEN v_payment_account IS NOT NULL THEN v_payment_account_note
      WHEN p_payment_account_note IS NOT NULL THEN v_payment_account_note
      ELSE payment_account_note
    END,
    total_cost = v_next_total_cost,
    note = CASE
      WHEN p_note IS NULL THEN note
      ELSE NULLIF(trim(p_note), '')
    END
  WHERE id = p_order_id AND user_id = v_user_id
  RETURNING * INTO v_order;

  RETURN to_jsonb(v_order);
END;
$$;

-- 8. Updated RPC: get_analytics_summary (uses purchased_at, includes total_cost/total_profit & payment_account filter)
CREATE OR REPLACE FUNCTION public.get_analytics_summary(
  p_start timestamptz,
  p_end timestamptz,
  p_payment_account text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_today_vn date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_filter_account text := NULLIF(trim(COALESCE(p_payment_account, '')), '');
  v_total_revenue bigint := 0;
  v_total_cost bigint := 0;
  v_total_profit bigint := 0;
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

  -- KPIs from non-cancelled orders in range (by purchased_at)
  SELECT
    COALESCE(SUM(total_amount), 0)::bigint,
    COALESCE(SUM(total_cost), 0)::bigint,
    COALESCE(SUM(total_amount - paid_amount), 0)::bigint,
    COUNT(*)::int
  INTO v_total_revenue, v_total_cost, v_new_debt_created, v_order_count
  FROM public.orders
  WHERE user_id = v_user_id
    AND payment_status <> 'cancelled'
    AND purchased_at >= p_start
    AND purchased_at <= p_end
    AND (v_filter_account IS NULL OR payment_account = v_filter_account);

  v_total_profit := v_total_revenue - v_total_cost;

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
        AND (v_filter_account IS NULL OR COALESCE(dp.payment_account, o.payment_account) = v_filter_account)
    ), 0)::bigint
    +
    COALESCE((
      SELECT SUM(o.paid_amount)
      FROM public.orders o
      WHERE o.user_id = v_user_id
        AND o.customer_id IS NULL
        AND o.payment_status <> 'cancelled'
        AND COALESCE(o.paid_at, o.purchased_at) >= p_start
        AND COALESCE(o.paid_at, o.purchased_at) <= p_end
        AND (v_filter_account IS NULL OR o.payment_account = v_filter_account)
    ), 0)::bigint
  INTO v_cash_collected;

  -- Total outstanding debt across all active customers
  SELECT COALESCE(SUM(total_debt), 0)::bigint
  INTO v_total_outstanding_debt
  FROM public.customers
  WHERE user_id = v_user_id AND total_debt > 0;

  -- Tracked item-level gross profit ratio
  SELECT
    COALESCE(SUM(CASE WHEN oi.cost_price IS NOT NULL THEN oi.line_total ELSE 0 END), 0)::bigint,
    COALESCE(SUM(CASE WHEN oi.cost_price IS NOT NULL THEN ROUND(oi.quantity * oi.cost_price)::bigint ELSE 0 END), 0)::bigint
  INTO v_tracked_revenue, v_tracked_cost
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.user_id = v_user_id
    AND o.payment_status <> 'cancelled'
    AND o.purchased_at >= p_start
    AND o.purchased_at <= p_end
    AND (v_filter_account IS NULL OR o.payment_account = v_filter_account);

  IF v_tracked_revenue > 0 THEN
    v_estimated_gross_profit := v_tracked_revenue - v_tracked_cost;
  ELSIF v_order_count > 0 THEN
    v_estimated_gross_profit := v_total_profit;
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
      (purchased_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS d,
      SUM(total_amount)::bigint AS revenue
    FROM public.orders
    WHERE user_id = v_user_id
      AND payment_status <> 'cancelled'
      AND purchased_at >= p_start
      AND purchased_at <= p_end
      AND (v_filter_account IS NULL OR payment_account = v_filter_account)
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
      AND (v_filter_account IS NULL OR COALESCE(dp.payment_account, o.payment_account) = v_filter_account)
    GROUP BY 1
  ),
  col_walkin AS (
    SELECT
      (COALESCE(paid_at, purchased_at) AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS d,
      SUM(paid_amount)::bigint AS amt
    FROM public.orders
    WHERE user_id = v_user_id
      AND customer_id IS NULL
      AND payment_status <> 'cancelled'
      AND COALESCE(paid_at, purchased_at) >= p_start
      AND COALESCE(paid_at, purchased_at) <= p_end
      AND (v_filter_account IS NULL OR payment_account = v_filter_account)
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
    AND purchased_at >= p_start
    AND purchased_at <= p_end
    AND (v_filter_account IS NULL OR payment_account = v_filter_account);

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
      AND o.purchased_at >= p_start
      AND o.purchased_at <= p_end
      AND (v_filter_account IS NULL OR o.payment_account = v_filter_account)
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
      'total_cost', v_total_cost,
      'total_profit', v_total_profit,
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
