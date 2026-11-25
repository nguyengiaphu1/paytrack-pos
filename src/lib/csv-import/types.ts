import type { PaymentAccount, PaymentMethod, PaymentStatus } from '@/types/database';

export type CsvUnitMode = 'k' | 'vnd';

export interface CsvImportOptions {
  year: number;
  unitMode: CsvUnitMode;
  groupSameDayOrders: boolean;
  skipDuplicates: boolean;
}

export interface ParsedCsvRow {
  lineNumber: number;
  vnDate: string;
  itemName: string;
  normalizedItemName: string;
  costVnd: number;
  paidVnd: number;
  debtVnd: number;
  sellingPriceVnd: number;
  customerName: string | null;
  normalizedCustomerName: string | null;
  paymentAccount: PaymentAccount | null;
  paymentAccountNote: string | null;
  statusText: string | null;
}

export interface SkippedCsvRow {
  lineNumber: number;
  rawSummary: string;
  reason: string;
  kind: 'incomplete' | 'invalid' | 'summary';
}

export interface PlannedImportItem {
  productName: string;
  normalizedProductName: string;
  unit: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
}

export interface PlannedImportOrder {
  fingerprint: string;
  vnDate: string;
  purchasedAtIso: string;
  customerName: string | null;
  normalizedCustomerName: string | null;
  paymentStatus: Exclude<PaymentStatus, 'cancelled'>;
  paymentMethod: PaymentMethod;
  paymentAccount: PaymentAccount | null;
  paymentAccountNote: string | null;
  totalAmount: number;
  totalCost: number;
  paidAmount: number;
  remainingAmount: number;
  paidAtIso: string | null;
  note: string;
  items: PlannedImportItem[];
  sourceLines: number[];
  isDuplicate: boolean;
}

export interface PlannedImportCustomer {
  name: string;
  normalizedName: string;
  isNew: boolean;
  orderCount: number;
  debtToAdd: number;
}

export interface PlannedImportProduct {
  name: string;
  normalizedName: string;
  unit: string;
  price: number;
  costPrice: number | null;
  isNew: boolean;
}

export interface CsvImportTotals {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalPaid: number;
  totalDebt: number;
}

export interface CsvImportPreview {
  ok: boolean;
  error: string | null;
  validRowCount: number;
  plannedOrders: PlannedImportOrder[];
  newOrders: PlannedImportOrder[];
  duplicateOrderCount: number;
  plannedCustomers: PlannedImportCustomer[];
  newCustomerCount: number;
  matchedCustomerCount: number;
  plannedProducts: PlannedImportProduct[];
  newProductCount: number;
  matchedProductCount: number;
  skippedRows: SkippedCsvRow[];
  notices: string[];
  ignoredSummaryRowCount: number;
  totals: CsvImportTotals;
  newOrdersTotals: CsvImportTotals;
  inferredYear: number;
  detectedUnitMode: CsvUnitMode;
}

export interface DetectedColumns {
  date: number;
  item: number;
  out: number;
  in: number;
  debt: number;
  customer: number;
  receiver: number;
  status: number;
}
