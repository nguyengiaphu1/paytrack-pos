'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Banknote, QrCode, Search, Users } from 'lucide-react';
import { formatDateVN, formatVND, getTodayVN, stripVietnamese } from '@/lib/vietnamese';
import { usePosData } from '@/components/providers/PosDataProvider';
import { DebtCustomerDrawer } from '@/components/debts/DebtCustomerDrawer';

type DebtFilter = 'debtors' | 'due' | 'all';

function DebtsContent() {
  const searchParams = useSearchParams();
  const deepCustomerId = searchParams.get('customer');
  const deepFilter = searchParams.get('filter');

  const {
    customers,
    customersLoaded,
    profile,
    ensureCustomers,
    invalidateAfterMutation,
  } = usePosData();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<DebtFilter>(
    deepFilter === 'due' ? 'due' : 'debtors'
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    deepCustomerId
  );

  useEffect(() => {
    void ensureCustomers();
  }, [ensureCustomers]);

  useEffect(() => {
    if (!deepCustomerId && deepFilter !== 'due') return;
    const id = setTimeout(() => {
      if (deepCustomerId) setSelectedCustomerId(deepCustomerId);
      if (deepFilter === 'due') setFilter('due');
    }, 0);
    return () => clearTimeout(id);
  }, [deepCustomerId, deepFilter]);

  const loading = !customersLoaded;
  const todayVN = getTodayVN();

  const summary = useMemo(() => {
    let totalShopDebt = 0;
    let debtorCount = 0;
    let dueOrOverdueCount = 0;
    for (const c of customers) {
      if (c.total_debt > 0) {
        totalShopDebt += c.total_debt;
        debtorCount += 1;
        if (c.next_due_date && c.next_due_date <= todayVN) {
          dueOrOverdueCount += 1;
        }
      }
    }
    return { totalShopDebt, debtorCount, dueOrOverdueCount };
  }, [customers, todayVN]);

  const filtered = useMemo(() => {
    const q = stripVietnamese(query);
    return customers.filter((c) => {
      if (filter === 'debtors' && c.total_debt <= 0) return false;
      if (filter === 'due' && (c.total_debt <= 0 || !c.next_due_date || c.next_due_date > todayVN)) {
        return false;
      }
      if (q && !c.search_text.includes(q) && !(c.phone && c.phone.includes(query.trim()))) {
        return false;
      }
      return true;
    });
  }, [customers, filter, query, todayVN]);

  const activeCustomer =
    customers.find((c) => c.id === selectedCustomerId) ?? null;

  return (
    <div className="mx-auto max-w-[1160px] px-3 py-4 sm:px-6 lg:py-5">
      <div className="mb-4">
        <h1 className="text-[20px] font-bold tracking-[-0.015em] lg:text-[24px]">
          Sổ nợ khách hàng
        </h1>
        <p className="text-[13px] text-[var(--text-secondary)]">
          Theo dõi công nợ, thu tiền tự động trừ đơn cũ trước (FIFO) và tạo VietQR đòi nợ
        </p>
      </div>

      {/* KPI Strip */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="col-span-2 min-w-0 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 sm:col-span-1">
          <p className="text-[13px] text-[var(--text-secondary)]">Tổng công nợ toàn shop</p>
          <p className="font-mono-tabular mt-1 break-words text-[22px] font-bold text-[var(--status-debt)] sm:text-[24px]">
            {formatVND(summary.totalShopDebt)}
          </p>
        </div>
        <div className="min-w-0 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
          <p className="text-[13px] text-[var(--text-secondary)]">Khách đang nợ</p>
          <p className="font-mono-tabular mt-1 text-[20px] font-bold text-[var(--text-primary)] sm:text-[22px]">
            {summary.debtorCount}
          </p>
        </div>
        <div className="min-w-0 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
          <p className="text-[13px] text-[var(--text-secondary)]">Đến hạn / Quá hạn</p>
          <p className="font-mono-tabular mt-1 text-[20px] font-bold text-[var(--status-overdue)] sm:text-[22px]">
            {summary.dueOrOverdueCount}
          </p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-[360px]">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm tên khách hoặc SĐT..."
            className="min-h-[46px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] pr-3.5 pl-10 outline-none focus:border-[var(--brand-jade)]"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['debtors', 'Đang nợ'],
              ['due', 'Đến hạn / Quá hạn'],
              ['all', 'Tất cả khách'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`min-h-[38px] rounded-lg border px-3 text-[13px] font-semibold ${
                filter === key
                  ? 'border-[var(--brand-jade)] bg-[var(--status-paid-bg)] text-[var(--brand-jade)]'
                  : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Debt List */}
      {loading ? (
        <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center text-[14px] text-[var(--text-secondary)]">
          Đang tải sổ nợ...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-[var(--text-secondary)]" />
          <p className="mt-2 text-[15px] font-semibold text-[var(--text-primary)]">
            {filter === 'debtors'
              ? 'Hiện chưa có khách hàng nào đang nợ'
              : filter === 'due'
                ? 'Không có khoản nợ nào đến hạn hoặc quá hạn hôm nay'
                : 'Chưa có khách hàng nào'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-default)] rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)]">
          {filtered.map((cust) => {
            const isOverdue =
              cust.total_debt > 0 && cust.next_due_date && cust.next_due_date < todayVN;
            const isDueToday =
              cust.total_debt > 0 && cust.next_due_date && cust.next_due_date === todayVN;

            return (
              <div
                key={cust.id}
                onClick={() => setSelectedCustomerId(cust.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelectedCustomerId(cust.id);
                }}
                className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--bg-subtle)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="max-w-full break-words text-[16px] font-bold text-[var(--text-primary)]">
                      {cust.name}
                    </span>
                    {isOverdue && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--status-overdue-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--status-overdue)]">
                        <AlertCircle className="h-3 w-3" />
                        Quá hạn ({formatDateVN(cust.next_due_date)})
                      </span>
                    )}
                    {isDueToday && (
                      <span className="shrink-0 rounded-full bg-[var(--status-debt-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--status-debt)]">
                        Hẹn thu hôm nay
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 break-words font-mono-tabular text-[13px] text-[var(--text-secondary)]">
                    {cust.phone || 'Chưa có SĐT'}
                    {cust.next_due_date && !isOverdue && !isDueToday && cust.total_debt > 0
                      ? ` · Hẹn ${formatDateVN(cust.next_due_date)}`
                      : ''}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`font-mono-tabular text-[16px] font-bold sm:text-[17px] ${
                      cust.total_debt > 0 ? 'text-[var(--status-debt)]' : 'text-[var(--brand-jade)]'
                    }`}
                  >
                    {formatVND(cust.total_debt)}
                  </span>

                  {cust.total_debt > 0 && (
                    <div className="hidden items-center gap-1.5 sm:flex">
                      <span className="inline-flex min-h-[34px] items-center gap-1 rounded-md border border-[var(--border-default)] bg-white px-2.5 text-[12px] font-semibold text-[var(--text-primary)]">
                        <Banknote className="h-3.5 w-3.5 text-[var(--brand-jade)]" />
                        Thu
                      </span>
                      <span className="inline-flex min-h-[34px] items-center gap-1 rounded-md border border-[var(--border-default)] bg-white px-2.5 text-[12px] font-semibold text-[var(--brand-jade)]">
                        <QrCode className="h-3.5 w-3.5" />
                        QR
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DebtCustomerDrawer
        open={Boolean(activeCustomer)}
        onClose={() => setSelectedCustomerId(null)}
        customer={activeCustomer}
        profile={profile}
        onDataUpdated={invalidateAfterMutation}
      />
    </div>
  );
}

export default function DebtsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1160px] px-4 py-8 text-[14px] text-[var(--text-secondary)]">
          Đang tải sổ nợ...
        </div>
      }
    >
      <DebtsContent />
    </Suspense>
  );
}
