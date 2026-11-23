export type PaymentStatus = 'paid' | 'partial' | 'unpaid' | 'cancelled';
export type PaymentMethod = 'cash' | 'transfer' | 'debt' | 'mixed';
export type DebtPaymentMethod = 'cash' | 'transfer';
export type InvoiceFormat = 'a5' | '80mm';
export type ReminderType = 'digest' | 'custom';
export type ReminderStatus = 'pending' | 'sent' | 'dismissed';

export type PaymentAccount =
  | 'Thanh'
  | 'Phú'
  | 'Trang'
  | 'Trang Lê'
  | 'Thuỳ Trang'
  | 'Thuỷ'
  | 'Kiều Thương'
  | 'Vận chuyển'
  | 'Khác';

export interface ShopProfile {
  id: string;
  user_id: string;
  shop_name: string;
  phone: string | null;
  address: string | null;
  bank_bin: string | null;
  bank_name: string | null;
  bank_account_no: string | null;
  bank_account_name: string | null;
  reminder_digest_enabled: boolean;
  reminder_default_hour: string;
  last_digest_sent_date: string | null;
  default_invoice_format: InvoiceFormat;
  default_show_cumulative_debt: boolean;
  default_show_qr_on_invoice: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  search_text: string;
  unit: string;
  price: number;
  cost_price: number | null;
  category: string | null;
  sku: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  search_text: string;
  phone: string | null;
  address: string | null;
  note: string | null;
  total_debt: number;
  next_due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  user_id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit: string;
  unit_price: number;
  cost_price: number | null;
  quantity: number;
  line_total: number;
}

export interface Order {
  id: string;
  user_id: string;
  order_code: string;
  customer_id: string | null;
  customer_name_snapshot: string;
  customer_address_snapshot: string | null;
  customer_phone_snapshot: string | null;
  purchased_at: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  total_cost: number;
  paid_amount: number;
  remaining_amount: number;
  previous_customer_debt: number;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  payment_account: PaymentAccount | null;
  payment_account_note: string | null;
  paid_at: string | null;
  debt_due_date: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface DebtPayment {
  id: string;
  user_id: string;
  customer_id: string;
  order_id: string | null;
  amount: number;
  payment_method: DebtPaymentMethod;
  payment_account: PaymentAccount | null;
  payment_account_note: string | null;
  note: string | null;
  paid_at: string;
}

export interface DebtReminder {
  id: string;
  user_id: string;
  customer_id: string;
  order_id: string | null;
  reminder_type: ReminderType;
  scheduled_for: string;
  message: string | null;
  target_url: string;
  status: ReminderStatus;
  sent_at: string | null;
  created_at: string;
}

export interface PushSubscriptionRecord {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  device_label: string | null;
  created_at: string;
  last_seen_at: string;
}

export interface CartItem {
  key: string;
  product_id: string | null;
  product_name: string;
  unit: string;
  unit_price: number;
  cost_price: number | null;
  quantity: number;
}

export interface AnalyticsSummary {
  kpis: {
    total_revenue: number;
    total_cost: number;
    total_profit: number;
    cash_collected: number;
    estimated_gross_profit: number | null;
    profit_tracked_ratio: number;
    new_debt_created: number;
    total_outstanding_debt: number;
    order_count: number;
  };
  daily_series: Array<{
    date: string;
    revenue: number;
    collected: number;
  }>;
  payment_breakdown: {
    cash: number;
    transfer: number;
    debt: number;
  };
  debt_aging: {
    due_or_upcoming: number;
    overdue: number;
    no_due_date: number;
  };
  top_products: Array<{
    product_name: string;
    qty: number;
    revenue: number;
  }>;
  top_debtors: Array<{
    customer_id: string;
    name: string;
    total_debt: number;
    next_due_date: string | null;
  }>;
}
