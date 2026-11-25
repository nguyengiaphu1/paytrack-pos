import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');

function readRel(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('Accessibility & ModalDialog guards (Impeccable Audit Step 4)', () => {
  it('implements ModalDialog with ARIA semantics, Escape stack handling, Tab focus trap, and scroll lock', () => {
    const modal = readRel('src/components/ui/ModalDialog.tsx');
    expect(modal).toContain('role="dialog"');
    expect(modal).toContain('aria-modal="true"');
    expect(modal).toContain('aria-labelledby={ariaLabelledBy}');
    expect(modal).toContain('openDialogStack');
    expect(modal).toContain('export function hasOpenModalDialog()');
    expect(modal).toContain("e.key === 'Escape'");
    expect(modal).toContain("e.key === 'Tab'");
    expect(modal).toContain("document.body.style.overflow = 'hidden'");
    expect(modal).toContain('previouslyFocused.focus(');
  });

  it('wires ModalDialog with ariaLabelledBy across all 13 app dialogs and drawers', () => {
    const wiredDialogs: Array<[string, string, string?]> = [
      ['src/app/(app)/page.tsx', 'mobile-cart-sheet-title', 'src/components/pos/CartPanel.tsx'],
      ['src/components/pos/CustomerPicker.tsx', 'customer-picker-modal-title'],
      ['src/components/pos/CheckoutModal.tsx', 'checkout-modal-title'],
      ['src/components/pos/QuickItemModal.tsx', 'quick-item-modal-title'],
      ['src/components/pos/ProductFormModal.tsx', 'product-form-modal-title'],
      ['src/components/welcome/WelcomeOnboardingModal.tsx', 'welcome-onboarding-title'],
      ['src/components/invoice/InvoicePreviewModal.tsx', 'invoice-preview-modal-title'],
      ['src/components/qr/VietQRModal.tsx', 'vietqr-modal-title'],
      ['src/components/orders/OrderLedgerEditModal.tsx', 'order-ledger-edit-title'],
      ['src/app/(app)/orders/page.tsx', 'order-detail-modal-title'],
      ['src/components/debts/DebtCustomerDrawer.tsx', 'debt-customer-drawer-title'],
      ['src/components/debts/ReminderModal.tsx', 'reminder-modal-title'],
      ['src/components/debts/CollectDebtModal.tsx', 'collect-debt-modal-title'],
    ];

    for (const [relPath, headingId, titleOwnerPath] of wiredDialogs) {
      const src = readRel(relPath);
      expect(src, `${relPath} must use <ModalDialog>`).toContain('<ModalDialog');
      expect(src, `${relPath} must set ariaLabelledBy="${headingId}"`).toContain(
        `ariaLabelledBy="${headingId}"`
      );
      const titleSrc = titleOwnerPath ? readRel(titleOwnerPath) : src;
      expect(
        titleSrc,
        `${titleOwnerPath ?? relPath} must expose matching heading id "${headingId}"`
      ).toContain(headingId);
    }
  });

  it('associates form labels with htmlFor/id and exposes role="alert" on POS and secondary modals', () => {
    const pairs: Array<[string, string]> = [
      ['src/components/pos/CustomerPicker.tsx', 'cust-new-name'],
      ['src/components/pos/QuickItemModal.tsx', 'quick-item-name'],
      ['src/components/pos/ProductFormModal.tsx', 'prod-name'],
      ['src/components/pos/CheckoutModal.tsx', 'checkout-new-cust-name'],
      ['src/components/welcome/WelcomeOnboardingModal.tsx', 'welcome-shop-name'],
      ['src/app/(app)/settings/page.tsx', 'settings-shop-name'],
      ['src/components/orders/OrderLedgerEditModal.tsx', 'ledger-edit-customer-name'],
      ['src/components/debts/CollectDebtModal.tsx', 'collect-paid-date'],
      ['src/components/debts/ReminderModal.tsx', 'reminder-date'],
    ];
    for (const [relPath, fieldId] of pairs) {
      const src = readRel(relPath);
      expect(src, `${relPath} must wire htmlFor="${fieldId}"`).toContain(`htmlFor="${fieldId}"`);
      expect(src, `${relPath} must wire id="${fieldId}"`).toContain(`id="${fieldId}"`);
    }
  });

  it('provides ProductCatalog search aria-label, modal-safe "/" shortcut, category aria-pressed, and live announcements', () => {
    const catalog = readRel('src/components/pos/ProductCatalog.tsx');
    expect(catalog).toContain('aria-label="Tìm món hàng"');
    expect(catalog).toContain('hasOpenModalDialog()');
    expect(catalog).toContain("e.key !== '/'");
    expect(catalog).toContain('aria-pressed={activeCategory === cat}');
    expect(catalog).toContain('role="status"');
    expect(catalog).toContain('aria-live="polite"');
  });

  it('enforces Step 5 mobile 375px layout guards and desktop sticky cart dock clearance', () => {
    const pos = readRel('src/app/(app)/page.tsx');
    expect(pos).not.toContain('glass-surface');

    const catalog = readRel('src/components/pos/ProductCatalog.tsx');
    expect(catalog).toContain('overflow-x-auto touch-pan-x');
    expect(catalog).toContain('hiddenCount > 0 || showHidden');
    expect(catalog).toContain('aria-pressed={editMode}');
    expect(catalog).not.toContain('border-l border-[var(--border-default)] text-[var(--text-secondary)]');

    const cart = readRel('src/components/pos/CartPanel.tsx');
    expect(cart).toContain('lg:max-h-[calc(100dvh-168px)]');
    expect(cart).toContain('min-h-0 flex-1 overflow-y-auto');
  });

  it('enforces >= 12px Vietnamese legibility floor across all UI components and styles', () => {
    const srcFiles: string[] = [];
    function walk(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(ts|tsx|css)$/.test(entry.name)) srcFiles.push(full);
      }
    }
    walk(path.join(ROOT, 'src'));

    for (const file of srcFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const rel = path.relative(ROOT, file);
      const subFloor = content.match(/text-\[([1-9]|1[01])px\]|font-size:\s*([1-9]|1[01])px\b/);
      expect(subFloor, `${rel} must not use sub-12px font size (${subFloor?.[0]})`).toBeNull();
    }
  });

  it('uses intentional prefers-reduced-motion degradation, skip link, dynamic html-to-image & qrcode, and split ShellPosContext', () => {
    const css = readRel('src/app/globals.css');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).not.toContain('0.01ms');

    const shell = readRel('src/components/shell/AppShell.tsx');
    expect(shell).toContain('href="#main-content"');
    expect(shell).toContain('id="main-content"');
    expect(shell).toContain('useShellPosData');
    expect(shell).not.toContain('usePosData(');

    const invoice = readRel('src/components/invoice/InvoicePreviewModal.tsx');
    expect(invoice).toContain("import('html-to-image')");
    expect(invoice).not.toContain("from 'html-to-image'");

    const receipt = readRel('src/components/invoice/ReceiptTemplate.tsx');
    expect(receipt).toContain("import('qrcode')");
    expect(receipt).not.toContain("from 'qrcode'");

    const qr = readRel('src/components/qr/VietQRModal.tsx');
    expect(qr).toContain("import('html-to-image')");
    expect(qr).not.toContain("from 'html-to-image'");
    expect(qr).toContain("import('qrcode')");
    expect(qr).not.toContain("from 'qrcode'");
  });

  it('exposes aria-pressed on toggle groups and live status semantics on AppShell SyncStatusPill', () => {
    const shell = readRel('src/components/shell/AppShell.tsx');
    expect(shell).toContain('role="status"');
    expect(shell).toContain('aria-live="polite"');
    expect(shell).toContain('Đã đồng bộ');

    for (const relPath of [
      'src/components/pos/CheckoutModal.tsx',
      'src/components/ui/PaymentAccountSelector.tsx',
      'src/components/invoice/InvoicePreviewModal.tsx',
      'src/components/qr/VietQRModal.tsx',
      'src/components/debts/CollectDebtModal.tsx',
    ]) {
      expect(readRel(relPath), `${relPath} must use aria-pressed on toggle buttons`).toContain(
        'aria-pressed='
      );
    }

    const checkout = readRel('src/components/pos/CheckoutModal.tsx');
    expect(checkout).toContain("if (e.key === 'Enter')");
    expect(checkout).toContain('void handleQuickCreateCustomer()');

    const invoice = readRel('src/components/invoice/InvoicePreviewModal.tsx');
    expect(invoice).toContain('hasBalanceDue');
  });

  it('enforces P1 audit fixes: keyboard-accessible /orders rows & decoupled mobile cards, QtyNumberInput focus rings, and bounded backdrop-filter on repeating cards/chips', () => {
    const orders = readRel('src/app/(app)/orders/page.tsx');
    expect(orders).toContain('Xem chi tiết đơn ${order.order_code}');
    expect(orders).not.toContain('role="button"\n                  tabIndex={0}');

    for (const relPath of [
      'src/components/pos/ProductCatalog.tsx',
      'src/components/pos/CartPanel.tsx',
      'src/components/pos/QuickItemModal.tsx',
    ]) {
      const src = readRel(relPath);
      expect(src, `${relPath} must use inset focus-visible ring on QtyNumberInput`).toContain(
        'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-jade)]'
      );
    }

    const css = readRel('src/app/globals.css');
    expect(css).toContain('.glass-solid-control:focus-within');
    expect(css).toContain('contain: layout style;');

    const cardRule = css.match(/\.glass-card\s*\{[^}]*\}/)?.[0] ?? '';
    expect(cardRule).not.toContain('backdrop-filter');

    const chipRule = css.match(/\.glass-chip\s*\{[^}]*\}/)?.[0] ?? '';
    expect(chipRule).not.toContain('backdrop-filter');

    // WCAG AA >= 5.1:1 gradient top stops and opaque-tinted badge tokens
    expect(css).toContain('--brand-jade: #127A59;');
    expect(css).toContain('--status-debt: #8A3B04;');
    expect(css).toContain('--status-overdue: #9F1616;');
    expect(css).toContain('--status-overdue: #FCA5A5;');
    expect(css).not.toContain('rgba(22, 166, 124, 0.88)');
    expect(css).not.toContain('rgba(32, 188, 142, 0.88)');
  });

  it('enforces P2/P3 audit fixes: no unused JetBrains_Mono, dynamic Recharts with reduced-motion, distinct PaymentBreakdownChart transfer color, 44px mobile product steppers, complete reduced-transparency, and zero transition-all in TSX', () => {
    const layout = readRel('src/app/layout.tsx');
    expect(layout).not.toContain('JetBrains_Mono');
    expect(layout).not.toContain('--font-mono');

    const stats = readRel('src/app/(app)/stats/page.tsx');
    expect(stats).toContain("import dynamic from 'next/dynamic'");
    expect(stats).toContain("import('@/components/stats/RevenueCashChart')");
    expect(stats).not.toContain("from '@/components/stats/RevenueCashChart'");

    const revChart = readRel('src/components/stats/RevenueCashChart.tsx');
    expect(revChart).toContain('prefers-reduced-motion: reduce');
    expect(revChart).toContain('isAnimationActive={!reducedMotion}');

    const breakdown = readRel('src/components/stats/PaymentBreakdownChart.tsx');
    expect(breakdown).toContain('var(--chart-transfer)');
    expect(breakdown).toContain('gap-0.5');

    const catalog = readRel('src/components/pos/ProductCatalog.tsx');
    expect(catalog).toContain('if (!inCart)');
    expect(catalog).not.toContain('flex h-11 w-10 items-center');

    const css = readRel('src/app/globals.css');
    expect(css).toContain('--chart-transfer: #0284C7;');
    expect(css).toContain('--chart-transfer: #38BDF8;');
    expect(css).toContain('.glass-btn-primary::before,');
    expect(css).toContain('.glass-icon-orb::before {');

    const tsxFiles: string[] = [];
    function walk(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx$/.test(entry.name)) tsxFiles.push(full);
      }
    }
    walk(path.join(ROOT, 'src'));
    for (const file of tsxFiles) {
      const content = fs.readFileSync(file, 'utf8');
      expect(content, `${path.relative(ROOT, file)} must not use transition-all`).not.toContain(
        'transition-all'
      );
    }
  });

  it('enforces POS critique 6-step remediation (layout, harden, quieter, distill, clarify, polish)', () => {
    const css = readRel('src/app/globals.css');
    expect(css).toContain('.scroll-fade-x');

    const pos = readRel('src/app/(app)/page.tsx');
    expect(pos).toContain('Chốt đơn');
    expect(pos).toContain('onOpenCustomerPicker');

    const catalog = readRel('src/components/pos/ProductCatalog.tsx');
    expect(catalog).toContain('mobile-catalog-manage-tray');
    expect(catalog).toContain('aria-label="Xóa từ khóa tìm món"');
    expect(catalog).not.toContain('glass-pill-jade');

    const shell = readRel('src/components/shell/AppShell.tsx');
    expect(shell).toContain('glass-chip-active font-semibold');
    expect(shell).not.toContain('glass-pill-jade');
    expect(shell).toContain('ThemeQuickToggle responsiveLabel');

    const cart = readRel('src/components/pos/CartPanel.tsx');
    expect(cart).toContain('role="status"');
    expect(cart).toContain('Ctrl+↵');
    expect(cart).not.toContain('glass-pill-jade');

    const checkout = readRel('src/components/pos/CheckoutModal.tsx');
    expect(checkout).toContain('closeOnBackdrop={Boolean(savedOrder)}');
    expect(checkout).toContain('checkout-items-breakdown');
    expect(checkout).toContain('Cần chọn khách hàng để ghi nợ');
    expect(checkout).toContain('ring-2 ring-[var(--brand-jade)]');
    expect(checkout).toContain('ring-2 ring-[var(--status-debt)]');
    expect(checkout).toContain('Gần đây');

    const picker = readRel('src/components/pos/CustomerPicker.tsx');
    expect(picker).toContain('Gần đây');
    expect(picker).toContain('aria-label="Xóa từ khóa tìm khách hàng"');
    expect(picker).toContain('aria-label="Đóng"\n            className="glass-solid-control');

    const quick = readRel('src/components/pos/QuickItemModal.tsx');
    expect(quick).toContain('closeOnBackdrop={false}');
    expect(quick).toContain('scrollIntoView');
    expect(quick).toContain('aria-invalid=');
    expect(quick).toContain('không lưu vào danh mục trừ khi bật bên dưới');

    const prodForm = readRel('src/components/pos/ProductFormModal.tsx');
    expect(prodForm).toContain('closeOnBackdrop={false}');
    expect(prodForm).toContain('scrollIntoView');
    expect(prodForm).toContain('aria-invalid=');

    const accSelector = readRel('src/components/ui/PaymentAccountSelector.tsx');
    expect(accSelector).toContain('grid grid-cols-2 gap-2');
    expect(accSelector).not.toContain('glass-pill-jade');
  });
});
