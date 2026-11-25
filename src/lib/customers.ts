import { createClient } from '@/lib/supabase/client';
import { stripVietnamese } from '@/lib/vietnamese';
import type { Customer, Order } from '@/types/database';

/**
 * Builds the normalized diacritic-stripped search index for a customer record.
 */
export function buildCustomerSearchText(
  name: string,
  phone?: string | null,
  address?: string | null
): string {
  return stripVietnamese(`${name} ${phone ?? ''} ${address ?? ''}`);
}

/**
 * Filters customers by Vietnamese diacritic-insensitive match against name, phone, address, note, and search_text.
 */
export function filterCustomersByQuery(
  customers: ReadonlyArray<Customer>,
  query: string,
  limit?: number
): Customer[] {
  const q = stripVietnamese(query);
  if (!q) {
    return typeof limit === 'number' ? customers.slice(0, limit) : [...customers];
  }
  const matches = customers.filter((c) => {
    const hay = stripVietnamese(`${c.name} ${c.phone ?? ''} ${c.address ?? ''} ${c.note ?? ''}`);
    return hay.includes(q) || c.search_text.includes(q);
  });
  return typeof limit === 'number' ? matches.slice(0, limit) : matches;
}

export interface CreateCustomerInput {
  name: string;
  phone?: string | null;
  address?: string | null;
  note?: string | null;
}

/**
 * Creates a new customer row for the currently authenticated user via Supabase client.
 */
export async function createCustomerRecord(input: CreateCustomerInput): Promise<Customer> {
  const trimmedName = input.name.trim();
  if (!trimmedName) {
    throw new Error('Vui lòng nhập tên khách hàng.');
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
  }

  const phoneVal = input.phone?.trim() || null;
  const addressVal = input.address?.trim() || null;
  const noteVal = input.note?.trim() || null;

  const { data, error } = await supabase
    .from('customers')
    .insert({
      user_id: user.id,
      name: trimmedName,
      search_text: buildCustomerSearchText(trimmedName, phoneVal, addressVal),
      phone: phoneVal,
      address: addressVal,
      note: noteVal,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as Customer;
}

/**
 * Resolves a customer from cache or synthesizes a safe Customer stub from an order snapshot
 * (used when collecting debt directly from the Orders ledger before customers finish syncing).
 */
export function resolveOrStubOrderCustomer(
  order: Order | null,
  customers: ReadonlyArray<Customer>
): Customer | null {
  if (!order || !order.customer_id) return null;
  const found = customers.find((c) => c.id === order.customer_id);
  if (found) return found;
  return {
    id: order.customer_id,
    user_id: order.user_id,
    name: order.customer_name_snapshot,
    search_text: buildCustomerSearchText(
      order.customer_name_snapshot,
      order.customer_phone_snapshot,
      order.customer_address_snapshot
    ),
    phone: order.customer_phone_snapshot,
    address: order.customer_address_snapshot,
    note: null,
    total_debt: order.remaining_amount,
    next_due_date: order.debt_due_date,
    created_at: order.created_at,
    updated_at: order.updated_at,
  };
}
