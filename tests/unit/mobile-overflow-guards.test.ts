import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');

function readRel(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('mobile-text-overflow responsive guards (375px viewport)', () => {
  it('renders StatsPage KPI cards cleanly with mobile-safe text sizing and wrapping', () => {
    const stats = readRel('src/app/(app)/stats/page.tsx');
    expect(stats).toContain('text-[16px] font-bold');
    expect(stats).toContain('break-words');
    expect(stats).toContain('min-w-0');
  });

  it('stacks or wraps cramped mobile grids in DebtCustomerDrawer, ReminderModal, and QuickItemModal', () => {
    const drawer = readRel('src/components/debts/DebtCustomerDrawer.tsx');
    expect(drawer).toContain('grid-cols-2 gap-2 sm:grid-cols-3');
    expect(drawer).toContain('col-span-2 flex min-h-[48px]');

    const reminderModal = readRel('src/components/debts/ReminderModal.tsx');
    expect(reminderModal).toContain('grid-cols-1 gap-2.5 sm:grid-cols-2');
    expect(reminderModal).toContain('min-w-0 flex-1 items-center');
    expect(reminderModal).toContain('min-w-0 truncate');

    const quickItem = readRel('src/components/pos/QuickItemModal.tsx');
    expect(quickItem).toContain('grid-cols-1 gap-3 sm:grid-cols-2');
    expect(quickItem).toContain('min-w-0');
  });

  it('keeps Orders 12-column desktop table isolated behind lg:block and mobile cards overflow-safe', () => {
    const orders = readRel('src/app/(app)/orders/page.tsx');
    expect(orders).toContain('hidden overflow-x-auto');
    expect(orders).toContain('lg:hidden');
    expect(orders).toContain('min-w-0');
  });

  it('hardens ReceiptTemplate table layout and AppShell mobile navigation against text clipping', () => {
    const receipt = readRel('src/components/invoice/ReceiptTemplate.tsx');
    expect(receipt).toContain('table-fixed');
    expect(receipt).toContain('break-words');

    const shell = readRel('src/components/shell/AppShell.tsx');
    expect(shell).toContain('shrink-0 items-center gap-1.5 whitespace-nowrap');
    expect(shell).toContain('max-w-full truncate');
  });

  it('keeps iOS >= 16px input font-size rule intact in globals.css', () => {
    const css = readRel('src/app/globals.css');
    expect(css).toContain('font-size: 16px;');
  });
});
