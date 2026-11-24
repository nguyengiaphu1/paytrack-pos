'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  Banknote,
  ChevronRight,
  Clock,
  MapPin,
  Phone,
  Search,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { formatDateVN, formatVND, getTodayVN, stripVietnamese } from '@/lib/vietnamese';
import { usePosData } from '@/components/providers/PosDataProvider';
import { DebtCustomerDrawer } from '@/components/debts/DebtCustomerDrawer';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { DebtsPageSkeleton, FetchErrorCard } from '@/components/ui/PageSkeletons';

type DebtFilter = 'debtors' | 'due' | 'all';

function DebtsContent() {
  const searchParams = useSearchParams();
  const deepCustomerId = searchParams.get('customer');
  const deepFilter = searchParams.get('filter');

  const {
    customers,
    customersLoaded,
    customersError,
    profile,
    ensureCustomers,
    refreshCustomers,
    invalidateAfterMutation,
  } = usePosData();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<DebtFilter>(
    deepFilter === 'due' ? 'due' : 'debtors'
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    deepCustomerId
  );
  const [openCollectDirectly, setOpenCollectDirectly] = useState(false);

  useEffect(() => {
    void ensureCustomers();
  }, [ensureCustomers]);

  useEffect(() => {
    if (!deepCustomerId && deepFilter !== 'due') return;
    const id = setTimeout(() => {
      if (deepCustomerId) {
        setOpenCollectDirectly(false);
        setSelectedCustomerId(deepCustomerId);
      }
      if (deepFilter === 'due') setFilter('due');
    }, 0);
    return () => clearTimeout(id);
  }, [deepCustomerId, deepFilter]);

  const loading = !customersLoaded && !customersError;
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
      if (q) {
        const hay = stripVietnamese(`${c.name} ${c.phone ?? ''} ${c.address ?? ''}`);
        if (!hay.includes(q) && !c.search_text.includes(q)) return false;
      }
      return true;
    });
  }, [customers, filter, query, todayVN]);

  const activeCustomer =
    customers.find((c) => c.id === selectedCustomerId) ?? null;

  return (
    <div className="mx-auto max-w-[1160px] px-3 py-4 sm:px-6 lg:py-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-[20px] font-bold tracking-[-0.015em] text-[var(--text-primary)] lg:text-[24px]">
          Công nợ
        </h1>
        {!loading && !customersError && summary.totalShopDebt > 0 && (
          <span className="glass-badge-debt inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span>{summary.debtorCount} khách đang nợ</span>
          </span>
        )}
      </div>

      {customersError && !customersLoaded ? (
        <FetchErrorCard
          title="Chưa tải được công nợ"
          message={customersError}
          onRetry={() => void refreshCustomers()}
        />
      ) : loading ? (
        <DebtsPageSkeleton />
      ) : (
        <>
          {/* Elevated 3D Liquid Glass KPI Strip */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="glass-card col-span-2 min-w-0 rounded-[22px] p-4 sm:col-span-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-semibold text-[var(--text-secondary)]">
                  Tổng phải thu
                </p>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${
                    summary.totalShopDebt > 0 ? 'glass-badge-debt' : 'glass-badge-paid'
                  }`}
                >
                  <Banknote className="h-3.5 w-3.5 shrink-0" />
                  <span>{summary.totalShopDebt > 0 ? 'Cần thu' : 'Hết nợ'}</span>
                </span>
              </div>
              <p
                className={`font-mono-tabular mt-2 break-words text-[20px] font-bold sm:text-[24px] ${
                  summary.totalShopDebt > 0
                    ? 'text-[var(--status-debt)]'
                    : 'text-[var(--brand-jade-text)]'
                }`}
              >
                {formatVND(summary.totalShopDebt)}
              </p>
            </div>

            <div className="glass-card min-w-0 rounded-[22px] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[12px] font-semibold text-[var(--text-secondary)]">
                  Khách đang nợ
                </p>
                <span
                  aria-hidden="true"
                  className="glass-icon-orb flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] text-[var(--brand-jade-text)]"
                >
                  <Users className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="font-mono-tabular mt-2 text-[20px] font-bold text-[var(--text-primary)] sm:text-[24px]">
                {summary.debtorCount}
              </p>
            </div>

            <div className="glass-card min-w-0 rounded-[22px] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[12px] font-semibold text-[var(--text-secondary)]">
                  Đến/quá hạn
                </p>
                <span
                  aria-hidden="true"
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] ${
                    summary.dueOrOverdueCount > 0 ? 'glass-badge-overdue' : 'glass-badge-neutral'
                  }`}
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                </span>
              </div>
              <p
                className={`font-mono-tabular mt-2 text-[20px] font-bold sm:text-[24px] ${
                  summary.dueOrOverdueCount > 0
                    ? 'text-[var(--status-overdue)]'
                    : 'text-[var(--text-primary)]'
                }`}
              >
                {summary.dueOrOverdueCount}
              </p>
            </div>
          </div>

          {/* Floating Frosted Search & Filter Bar */}
          <div className="glass-surface mb-4 flex flex-col gap-3 rounded-[22px] p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-[380px]">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm tên, SĐT, địa chỉ..."
                aria-label="Tìm khách công nợ"
                className="glass-input min-h-[46px] w-full rounded-[14px] pr-3.5 pl-10 text-[16px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
              />
            </div>

            <div
              role="group"
              aria-label="Lọc danh sách công nợ"
              className="flex flex-wrap gap-2"
            >
              {(
                [
                  ['debtors', 'Đang nợ', summary.debtorCount],
                  ['due', 'Đến hạn', summary.dueOrOverdueCount],
                  ['all', 'Tất cả', customers.length],
                ] as const
              ).map(([key, label, count]) => {
                const active = filter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(key)}
                    className={`press-tactile inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-[13px] ${
                      active ? 'glass-chip-active font-bold' : 'glass-chip font-semibold'
                    }`}
                  >
                    <span>{label}</span>
                    <span className="font-mono-tabular text-[12px] opacity-80">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Customer Debt Cards */}
          {filtered.length === 0 ? (
            <EmptyStateCard
              icon={Users}
              title={
                query.trim()
                  ? `Không thấy "${query}"`
                  : filter === 'debtors'
                    ? 'Không có khách nợ'
                    : filter === 'due'
                      ? 'Không có khách đến hạn'
                      : 'Chưa có khách hàng'
              }
              action={
                filter !== 'all' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setFilter('all');
                    }}
                    className="glass-btn-secondary press-tactile inline-flex min-h-[48px] items-center gap-2 rounded-full px-5 text-[14px] font-semibold"
                  >
                    <Users className="h-4 w-4 text-[var(--brand-jade-text)]" />
                    <span>Xem tất cả</span>
                  </button>
                ) : (
                  <Link
                    href="/"
                    className="glass-btn-primary press-tactile inline-flex min-h-[48px] items-center gap-2 rounded-full px-5 text-[14px] font-semibold"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    <span>Bán hàng</span>
                  </Link>
                )
              }
            />
          ) : (
            <div className="space-y-2.5">
              {filtered.map((cust) => {
                const isOverdue =
                  cust.total_debt > 0 && cust.next_due_date && cust.next_due_date < todayVN;
                const isDueToday =
                  cust.total_debt > 0 && cust.next_due_date && cust.next_due_date === todayVN;
                const isUpcoming =
                  cust.total_debt > 0 && cust.next_due_date && !isOverdue && !isDueToday;

                return (
                  <article
                    key={cust.id}
                    onClick={() => {
                      setOpenCollectDirectly(false);
                      setSelectedCustomerId(cust.id);
                    }}
                    className="glass-card glass-card-interactive cursor-pointer rounded-[20px] p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="max-w-full break-words text-[16px] font-bold text-[var(--text-primary)]">
                            {cust.name}
                          </h2>
                          {isOverdue && (
                            <span className="glass-badge-overdue inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              <span>Quá hạn · {formatDateVN(cust.next_due_date)}</span>
                            </span>
                          )}
                          {isDueToday && (
                            <span className="glass-badge-debt inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold">
                              <Clock className="h-3.5 w-3.5 shrink-0" />
                              <span>Đến hạn hôm nay</span>
                            </span>
                          )}
                          {isUpcoming && (
                            <span className="glass-badge-neutral inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium">
                              <Clock className="h-3.5 w-3.5 shrink-0" />
                              <span>Hẹn {formatDateVN(cust.next_due_date)}</span>
                            </span>
                          )}
                          {cust.total_debt <= 0 && (
                            <span className="glass-badge-paid inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold">
                              Đã hết nợ
                            </span>
                          )}
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--text-secondary)]">
                          <span className="font-mono-tabular inline-flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 shrink-0 opacity-75" />
                            <span>{cust.phone || 'Chưa có SĐT'}</span>
                          </span>
                          {cust.address && (
                            <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 shrink-0 opacity-75" />
                              <span className="truncate">{cust.address}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="glass-divider flex flex-wrap items-center justify-between gap-2.5 border-t pt-3 sm:shrink-0 sm:border-t-0 sm:pt-0 sm:pl-3">
                        <div className="min-w-0 sm:text-right">
                          <p className="text-[12px] font-medium text-[var(--text-secondary)] sm:hidden">
                            {cust.total_debt > 0 ? 'Còn nợ' : 'Công nợ'}
                          </p>
                          <p
                            className={`font-mono-tabular text-[16px] font-bold sm:text-[20px] ${
                              cust.total_debt > 0
                                ? 'text-[var(--status-debt)]'
                                : 'text-[var(--brand-jade-text)]'
                            }`}
                          >
                            {formatVND(cust.total_debt)}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {cust.total_debt > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenCollectDirectly(true);
                                setSelectedCustomerId(cust.id);
                              }}
                              className="glass-btn-primary press-tactile inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold"
                            >
                              <Banknote className="h-4 w-4 shrink-0" />
                              <span>Thu nợ</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenCollectDirectly(false);
                              setSelectedCustomerId(cust.id);
                            }}
                            className="glass-btn-secondary press-tactile inline-flex min-h-[44px] items-center gap-1 rounded-full px-3.5 text-[13px] font-semibold"
                          >
                            <span>Chi tiết</span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      <DebtCustomerDrawer
        open={Boolean(activeCustomer)}
        onClose={() => {
          setSelectedCustomerId(null);
          setOpenCollectDirectly(false);
        }}
        customer={activeCustomer}
        profile={profile}
        initialOpenCollect={openCollectDirectly}
        onDataUpdated={invalidateAfterMutation}
      />
    </div>
  );
}

export default function DebtsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1160px] px-3 py-4 sm:px-6 lg:py-5">
          <DebtsPageSkeleton />
        </div>
      }
    >
      <DebtsContent />
    </Suspense>
  );
}
