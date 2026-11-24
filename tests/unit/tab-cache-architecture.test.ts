import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');

function readRel(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('slow-tab-navigation cache & single-realtime architecture', () => {
  it('wraps app routes in PosDataProvider with initialProfile and loading skeleton', () => {
    const layout = readRel('src/app/(app)/layout.tsx');
    expect(layout).toContain('<PosDataProvider initialProfile={typedProfile}>');
    expect(fs.existsSync(path.join(ROOT, 'src/app/(app)/loading.tsx'))).toBe(true);
  });

  it('consolidates Realtime into a single shell-sync channel inside PosDataProvider', () => {
    const provider = readRel('src/components/providers/PosDataProvider.tsx');
    expect(provider).toContain("channelName: 'shell-sync'");
    expect(provider).toContain('ensurePosCatalog');
    expect(provider).toContain('ensureCustomers');
    expect(provider).toContain('ensureOrders');
    expect(provider).toContain('ensureProfile');
    expect(provider).toContain('getCachedAnalytics');
    expect(provider).toContain('invalidateAfterMutation');

    // None of the 5 tab pages should open duplicate useRealtimeSync channels
    const tabPages = [
      'src/app/(app)/page.tsx',
      'src/app/(app)/debts/page.tsx',
      'src/app/(app)/orders/page.tsx',
      'src/app/(app)/stats/page.tsx',
      'src/app/(app)/settings/page.tsx',
    ];
    for (const file of tabPages) {
      const content = readRel(file);
      expect(content, `${file} should use usePosData`).toContain('usePosData');
      expect(content, `${file} must not open duplicate useRealtimeSync`).not.toContain(
        'useRealtimeSync'
      );
    }
  });

  it('enables Next.js link prefetching in AppShell and configures sin1 region in vercel.json', () => {
    const shell = readRel('src/components/shell/AppShell.tsx');
    expect(shell).toContain('prefetch={true}');
    expect(shell).toContain('useShellPosData');

    const vercelConfig = JSON.parse(readRel('vercel.json')) as { regions?: string[] };
    expect(vercelConfig.regions).toContain('sin1');
  });
});
