import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');

function readRel(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectSourceFiles(full));
    } else if (entry.isFile() && /\.(ts|tsx|css)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

const BANNED_AI_SLOP_TOKENS = [
  'backdrop-blur',
  'shadow-lg',
  'rounded-2xl',
  'rounded-3xl',
  'indigo-',
  'purple-',
  'bg-clip-text',
  'Sparkles',
  'animate-bounce',
  'tracking-widest',
];

describe('ux-polish-theme design, dark-mode, and welcome architectural guards', () => {
  it('defines dark-mode palette, smooth transition window, print light isolation, and reduced-motion rules in globals.css', () => {
    const css = readRel('src/app/globals.css');
    expect(css).toContain(':root[data-theme="dark"]');
    expect(css).toContain('.theme-transitioning');
    expect(css).toContain('280ms');
    expect(css).toContain('.print-surface-light');
    expect(css).toContain('color-scheme: light');
    expect(css).toContain('.skeleton-shimmer');
    expect(css).toContain('.press-tactile');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('wires pre-hydration THEME_BOOTSTRAP_SCRIPT and ThemeProvider in root layout', () => {
    const layout = readRel('src/app/layout.tsx');
    expect(layout).toContain('THEME_BOOTSTRAP_SCRIPT');
    expect(layout).toContain('suppressHydrationWarning');
    expect(layout).toContain('<ThemeProvider>');
  });

  it('wires BrandLoadingScreen and layout-matched page skeletons + FetchErrorCard retry across all 5 routes', () => {
    expect(readRel('src/app/loading.tsx')).toContain('BrandLoadingScreen');
    expect(readRel('src/app/(app)/loading.tsx')).toContain('PosWorkspaceSkeleton');

    expect(readRel('src/app/(app)/page.tsx')).toContain('PosWorkspaceSkeleton');
    expect(readRel('src/app/(app)/page.tsx')).toContain('FetchErrorCard');

    expect(readRel('src/app/(app)/debts/page.tsx')).toContain('DebtsPageSkeleton');
    expect(readRel('src/app/(app)/debts/page.tsx')).toContain('FetchErrorCard');

    expect(readRel('src/app/(app)/orders/page.tsx')).toContain('OrdersPageSkeleton');
    expect(readRel('src/app/(app)/orders/page.tsx')).toContain('FetchErrorCard');

    expect(readRel('src/app/(app)/stats/page.tsx')).toContain('StatsPageSkeleton');
    expect(readRel('src/app/(app)/stats/page.tsx')).toContain('FetchErrorCard');

    expect(readRel('src/app/(app)/settings/page.tsx')).toContain('SettingsPageSkeleton');
    expect(readRel('src/app/(app)/settings/page.tsx')).toContain('FetchErrorCard');
  });

  it('isolates print/PNG receipt and VietQR export surfaces with .print-surface-light', () => {
    expect(readRel('src/components/invoice/InvoicePreviewModal.tsx')).toContain(
      'print-surface-light'
    );
    expect(readRel('src/components/invoice/ReceiptTemplate.tsx')).toContain('print-surface-light');
    expect(readRel('src/components/qr/VietQRModal.tsx')).toContain('print-surface-light');
  });

  it('wires 3-layer Welcome architecture safely without blocking returning sales', () => {
    const login = readRel('src/app/login/page.tsx');
    expect(login).toContain('ThemeQuickToggle');

    const appLayout = readRel('src/app/(app)/layout.tsx');
    expect(appLayout).toContain('welcome_v2_seen');

    const shell = readRel('src/components/shell/AppShell.tsx');
    expect(shell).toContain('WelcomeOnboardingModal');
    expect(shell).toContain('ThemeQuickToggle');

    const home = readRel('src/app/(app)/page.tsx');
    expect(home).toContain('DailyWelcomeBanner');

    const settings = readRel('src/app/(app)/settings/page.tsx');
    expect(settings).toContain('SettingsThemeSelector');
    expect(settings).toContain('Xem lại hướng dẫn bắt đầu');
  });

  it('contains zero banned AI-slop tokens anywhere inside src/', () => {
    const files = collectSourceFiles(path.join(ROOT, 'src'));
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const rel = path.relative(ROOT, file);
      for (const token of BANNED_AI_SLOP_TOKENS) {
        expect(content, `${rel} must not contain banned token "${token}"`).not.toContain(token);
      }
    }
  });

  it('defines every var(--*) custom property referenced across src/ inside globals.css', () => {
    const css = readRel('src/app/globals.css');
    const defined = new Set([...css.matchAll(/--([a-z0-9-]+)\s*:/gi)].map((m) => `--${m[1]}`));
    defined.add('--font-sans');
    defined.add('--font-mono');

    const files = collectSourceFiles(path.join(ROOT, 'src'));
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const rel = path.relative(ROOT, file);
      for (const match of content.matchAll(/var\((--[a-z0-9-]+)\)/gi)) {
        expect(defined.has(match[1]), `${rel} references undefined CSS variable ${match[1]}`).toBe(
          true
        );
      }
    }
  });

  it('keeps input, select, and textarea elements at >= 16px font size to prevent iOS Safari zoom', () => {
    const files = collectSourceFiles(path.join(ROOT, 'src')).filter((f) =>
      /\.(ts|tsx)$/.test(f)
    );
    for (const file of files) {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      const rel = path.relative(ROOT, file);
      for (let i = 0; i < lines.length; i++) {
        if (/<(input|select|textarea)\b/.test(lines[i])) {
          const snippet = lines.slice(i, i + 12).join(' ');
          const end = snippet.indexOf('/>');
          const block = end >= 0 ? snippet.slice(0, end) : snippet;
          if (/type="checkbox"|type="radio"/.test(block)) continue;
          const smallMatch = block.match(/text-\[(1[0-5])px\]|text-(xs|sm)\b/);
          expect(
            smallMatch,
            `${rel}:${i + 1} uses ${smallMatch?.[0]} on form control (< 16px triggers iOS zoom)`
          ).toBeNull();
        }
      }
    }
  });

  it('keeps interactive controls at >= 44px touch target height (Constitution I)', () => {
    const files = collectSourceFiles(path.join(ROOT, 'src')).filter((f) =>
      /\.(ts|tsx)$/.test(f)
    );
    for (const file of files) {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      const rel = path.relative(ROOT, file);
      for (let i = 0; i < lines.length; i++) {
        if (/<(button|Link|a|input|select|textarea|label)\b/.test(lines[i])) {
          const snippet = lines.slice(i, i + 12).join(' ');
          const smallMinH = snippet.match(/min-h-\[([1-9]|[1-3]\d|4[0-3])px\]/);
          expect(
            smallMinH,
            `${rel}:${i + 1} uses ${smallMinH?.[0]} on interactive control (< 44px violates Constitution I)`
          ).toBeNull();
        }
      }
    }
  });

  it('does not remount SettingsFormBody on profile.updated_at and keeps save feedback by submit button', () => {
    const settings = readRel('src/app/(app)/settings/page.tsx');
    expect(settings).not.toContain('key={profile?.updated_at');
    const submitIdx = settings.indexOf('Lưu tất cả cài đặt');
    const lastSavedMsgIdx = settings.lastIndexOf('{savedMsg && (');
    expect(submitIdx).toBeGreaterThan(-1);
    expect(lastSavedMsgIdx).toBeGreaterThan(-1);
    expect(lastSavedMsgIdx).toBeLessThan(submitIdx);
  });
});

