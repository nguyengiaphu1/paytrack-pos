import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PushSubscriptionRecord, ShopProfile } from '@/types/database';

const mocks = vi.hoisted(() => ({
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: mocks.setVapidDetails,
    sendNotification: mocks.sendNotification,
  },
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}));

interface PendingReminderRow {
  id: string;
  user_id: string;
  customer_id: string;
  message: string | null;
  target_url: string;
  customers: { name: string; total_debt: number } | Array<{ name: string; total_debt: number }> | null;
}

interface DueCustomerRow {
  id: string;
  name: string;
  total_debt: number;
  next_due_date: string | null;
}

interface UpdateCall {
  table: string;
  payload: Record<string, unknown>;
  id: string;
}

interface DeleteCall {
  table: string;
  id: string;
}

function makeFakeAdmin(seed: {
  pendingReminders?: PendingReminderRow[];
  subscriptionsByUser?: Record<string, PushSubscriptionRecord[]>;
  profiles?: ShopProfile[];
  dueCustomersByUser?: Record<string, DueCustomerRow[]>;
  errors?: Partial<Record<'debt_reminders' | 'push_subscriptions' | 'shop_profiles' | 'customers', string>>;
}) {
  const updates: UpdateCall[] = [];
  const deletes: DeleteCall[] = [];

  const client = {
    from(table: string) {
      return {
        select() {
          const filters: Record<string, unknown> = {};
          const builder = {
            eq(col: string, val: unknown) {
              filters[col] = val;
              return builder;
            },
            gt() {
              return builder;
            },
            not() {
              return builder;
            },
            lte() {
              return builder;
            },
            limit() {
              return resolveSelect();
            },
            then(onFulfilled: (value: { data: unknown[] | null; error: { message: string } | null }) => unknown) {
              return Promise.resolve(resolveSelect()).then(onFulfilled);
            },
          };

          function resolveSelect(): { data: unknown[] | null; error: { message: string } | null } {
            const errMessage = seed.errors?.[table as keyof NonNullable<typeof seed.errors>];
            if (errMessage) {
              return { data: null, error: { message: errMessage } };
            }
            if (table === 'debt_reminders') {
              const rows = seed.pendingReminders ?? [];
              const filtered = filters.user_id
                ? rows.filter((r) => r.user_id === filters.user_id)
                : rows;
              return { data: filtered, error: null };
            }
            if (table === 'push_subscriptions') {
              const userId = String(filters.user_id ?? '');
              return { data: seed.subscriptionsByUser?.[userId] ?? [], error: null };
            }
            if (table === 'shop_profiles') {
              const rows = seed.profiles ?? [];
              const filtered = filters.user_id
                ? rows.filter((p) => p.user_id === filters.user_id)
                : rows;
              return { data: filtered, error: null };
            }
            if (table === 'customers') {
              const userId = String(filters.user_id ?? '');
              return { data: seed.dueCustomersByUser?.[userId] ?? [], error: null };
            }
            return { data: [], error: null };
          }

          return builder;
        },
        update(payload: Record<string, unknown>) {
          return {
            async eq(_col: string, id: string) {
              updates.push({ table, payload, id });
              return { error: null };
            },
          };
        },
        delete() {
          return {
            async eq(_col: string, id: string) {
              deletes.push({ table, id });
              return { error: null };
            },
          };
        },
      };
    },
  };

  return { client, updates, deletes };
}

function makeSub(id: string, userId = 'user-1'): PushSubscriptionRecord {
  return {
    id,
    user_id: userId,
    endpoint: `https://push.example/${id}`,
    p256dh: 'key-p256dh',
    auth: 'key-auth',
    device_label: 'iPhone PWA',
    created_at: '2026-11-17T00:00:00Z',
    last_seen_at: '2026-11-17T00:00:00Z',
  };
}

function makeProfile(overrides: Partial<ShopProfile> = {}): ShopProfile {
  return {
    id: 'prof-1',
    user_id: 'user-1',
    shop_name: 'Tạp Hóa Mẹ',
    phone: null,
    address: null,
    bank_bin: null,
    bank_name: null,
    bank_account_no: null,
    bank_account_name: null,
    reminder_digest_enabled: true,
    reminder_default_hour: '08:30',
    last_digest_sent_date: null,
    default_invoice_format: 'a5',
    default_show_cumulative_debt: true,
    default_show_qr_on_invoice: true,
    created_at: '2026-11-17T00:00:00Z',
    updated_at: '2026-11-17T00:00:00Z',
    ...overrides,
  };
}

describe('scheduled push notifications & reminder cron', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-public-key';
    process.env.VAPID_PRIVATE_KEY = 'test-private-key';
    delete process.env.VAPID_SUBJECT;
  });

  it('normalizes Asia/Ho_Chi_Minh HH:MM including midnight hour', async () => {
    const { getCurrentTimeHHMM_VN } = await import('@/lib/reminders-cron');
    // 2026-11-17T17:05:00Z = 2026-11-18 00:05 Asia/Ho_Chi_Minh (UTC+7)
    const midnightVN = new Date('2026-11-17T17:05:00.000Z');
    expect(getCurrentTimeHHMM_VN(midnightVN)).toBe('00:05');

    // 2026-11-17T01:45:00Z = 2026-11-17 08:45 Asia/Ho_Chi_Minh
    const morningVN = new Date('2026-11-17T01:45:00.000Z');
    expect(getCurrentTimeHHMM_VN(morningVN)).toBe('08:45');
  });

  it('sends Web Push with urgency=high, TTL=86400, valid subject fallback, and cleans 410 endpoints', async () => {
    const fake = makeFakeAdmin({});
    mocks.createAdminClient.mockReturnValue(fake.client);

    mocks.sendNotification
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(Object.assign(new Error('Gone'), { statusCode: 410 }))
      .mockRejectedValueOnce(Object.assign(new Error('Upstream error'), { statusCode: 500 }));

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { sendPushToSubscriptions } = await import('@/lib/push');

    const result = await sendPushToSubscriptions(
      [makeSub('s1'), makeSub('s2'), makeSub('s3')],
      {
        title: 'Nhắc nợ',
        body: 'Cô Lan còn nợ 100.000đ',
        url: '/debts?customer=c1',
      }
    );

    expect(mocks.setVapidDetails).toHaveBeenCalledWith(
      'https://paytrack-pos.vercel.app',
      'test-public-key',
      'test-private-key'
    );
    expect(mocks.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'https://push.example/s1' }),
      expect.any(String),
      { TTL: 86400, urgency: 'high' }
    );
    expect(result.sent).toBe(1);
    expect(result.removed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors).toEqual([{ statusCode: 500, message: 'Upstream error' }]);
    expect(fake.deletes).toEqual([{ table: 'push_subscriptions', id: 's2' }]);
    errSpy.mockRestore();
  });

  it('does not mark debt_reminders as sent when user has no subscriptions or push fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Case A: zero subscriptions
    const fakeNoSubs = makeFakeAdmin({
      pendingReminders: [
        {
          id: 'rem-1',
          user_id: 'user-1',
          customer_id: 'cust-1',
          message: 'Nhắc cô Lan',
          target_url: '/debts?customer=cust-1',
          customers: { name: 'Cô Lan', total_debt: 250000 },
        },
      ],
      subscriptionsByUser: {},
      profiles: [],
    });
    mocks.createAdminClient.mockReturnValue(fakeNoSubs.client);

    const { runReminderCron } = await import('@/lib/reminders-cron');
    const resNoSubs = await runReminderCron(new Date('2026-11-17T02:00:00.000Z'));

    expect(resNoSubs.customSent).toBe(0);
    expect(resNoSubs.customFailed).toBe(1);
    expect(fakeNoSubs.updates).toHaveLength(0);

    // Case B: push fails (500) -> sent === 0 -> keep pending
    mocks.sendNotification.mockRejectedValueOnce(
      Object.assign(new Error('Push provider down'), { statusCode: 500 })
    );
    const fakeFailPush = makeFakeAdmin({
      pendingReminders: [
        {
          id: 'rem-2',
          user_id: 'user-1',
          customer_id: 'cust-1',
          message: null,
          target_url: '/debts?customer=cust-1',
          customers: { name: 'Cô Lan', total_debt: 250000 },
        },
      ],
      subscriptionsByUser: { 'user-1': [makeSub('sub-1')] },
      profiles: [],
    });
    mocks.createAdminClient.mockReturnValue(fakeFailPush.client);

    const resFail = await runReminderCron(new Date('2026-11-17T02:00:00.000Z'));
    expect(resFail.customSent).toBe(0);
    expect(resFail.customFailed).toBe(1);
    expect(fakeFailPush.updates).toHaveLength(0);

    warnSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('marks reminder sent when delivered and dismisses reminders when customer debt is 0', async () => {
    mocks.sendNotification.mockResolvedValueOnce({});
    const fake = makeFakeAdmin({
      pendingReminders: [
        {
          id: 'rem-paid',
          user_id: 'user-1',
          customer_id: 'cust-paid',
          message: 'Đã trả xong',
          target_url: '/debts?customer=cust-paid',
          customers: { name: 'Chú Ba', total_debt: 0 },
        },
        {
          id: 'rem-due',
          user_id: 'user-1',
          customer_id: 'cust-due',
          message: '',
          target_url: '/debts?customer=cust-due',
          customers: { name: 'Cô Tư', total_debt: 500000 },
        },
      ],
      subscriptionsByUser: { 'user-1': [makeSub('sub-1')] },
      profiles: [],
    });
    mocks.createAdminClient.mockReturnValue(fake.client);

    const { runReminderCron } = await import('@/lib/reminders-cron');
    const res = await runReminderCron(new Date('2026-11-17T02:00:00.000Z'));

    expect(res.customSent).toBe(1);
    expect(res.customFailed).toBe(0);
    expect(fake.updates).toEqual([
      {
        table: 'debt_reminders',
        id: 'rem-paid',
        payload: { status: 'dismissed' },
      },
      {
        table: 'debt_reminders',
        id: 'rem-due',
        payload: expect.objectContaining({ status: 'sent' }),
      },
    ]);
  });

  it('updates last_digest_sent_date ONLY when due customers exist and push succeeds', async () => {
    // Morning 09:00 VN = 02:00Z
    const morning = new Date('2026-11-17T02:00:00.000Z');

    // Case 1: 0 due customers -> must NOT lock last_digest_sent_date
    const fakeEmpty = makeFakeAdmin({
      pendingReminders: [],
      profiles: [makeProfile({ reminder_default_hour: '08:30', last_digest_sent_date: null })],
      dueCustomersByUser: { 'user-1': [] },
      subscriptionsByUser: { 'user-1': [makeSub('sub-1')] },
    });
    mocks.createAdminClient.mockReturnValue(fakeEmpty.client);

    const { runReminderCron } = await import('@/lib/reminders-cron');
    const resEmpty = await runReminderCron(morning);
    expect(resEmpty.digestSent).toBe(0);
    expect(fakeEmpty.updates).toHaveLength(0);

    // Case 2: 1 due customer and push succeeds -> updates last_digest_sent_date
    mocks.sendNotification.mockResolvedValueOnce({});
    const fakeWithDue = makeFakeAdmin({
      pendingReminders: [],
      profiles: [makeProfile({ reminder_default_hour: '08:30', last_digest_sent_date: null })],
      dueCustomersByUser: {
        'user-1': [
          {
            id: 'c1',
            name: 'Cô Lan',
            total_debt: 120000,
            next_due_date: '2026-11-17',
          },
        ],
      },
      subscriptionsByUser: { 'user-1': [makeSub('sub-1')] },
    });
    mocks.createAdminClient.mockReturnValue(fakeWithDue.client);

    const resWithDue = await runReminderCron(morning);
    expect(resWithDue.digestSent).toBe(1);
    expect(fakeWithDue.updates).toEqual([
      {
        table: 'shop_profiles',
        id: 'prof-1',
        payload: { last_digest_sent_date: resWithDue.todayVN },
      },
    ]);
  });

  it('derives todayVN from passed now across VN midnight and normalizes single-digit HH:MM', async () => {
    const { getTodayVN } = await import('@/lib/vietnamese');
    const { normalizeHHMM, runReminderCron } = await import('@/lib/reminders-cron');

    const vnMidnightAfter = new Date('2026-11-17T17:05:00.000Z'); // 2026-11-18 00:05 VN
    expect(getTodayVN(vnMidnightAfter)).toBe('2026-11-18');
    expect(normalizeHHMM('8:30')).toBe('08:30');
    expect(normalizeHHMM('bad', '09:00')).toBe('09:00');

    const fake = makeFakeAdmin({ pendingReminders: [], profiles: [] });
    mocks.createAdminClient.mockReturnValue(fake.client);
    const res = await runReminderCron(vnMidnightAfter);
    expect(res.todayVN).toBe('2026-11-18');
    expect(res.nowHHMM).toBe('00:05');
  });

  it('throws an explicit error when Supabase query fails instead of silently returning 0', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fakeErr = makeFakeAdmin({
      errors: { debt_reminders: 'invalid service_role key' },
    });
    mocks.createAdminClient.mockReturnValue(fakeErr.client);

    const { runReminderCron } = await import('@/lib/reminders-cron');
    await expect(runReminderCron(new Date('2026-11-17T02:00:00.000Z'))).rejects.toThrow(
      'Không thể truy vấn debt_reminders: invalid service_role key'
    );
    errSpy.mockRestore();
  });

  it('scopes reminders and daily digest strictly to userId when options.userId is provided', async () => {
    mocks.sendNotification.mockResolvedValue({});
    const fake = makeFakeAdmin({
      pendingReminders: [
        {
          id: 'rem-u1',
          user_id: 'user-1',
          customer_id: 'c1',
          message: 'Nhắc user 1',
          target_url: '/debts?customer=c1',
          customers: { name: 'Cô Lan', total_debt: 100000 },
        },
        {
          id: 'rem-u2',
          user_id: 'user-2',
          customer_id: 'c2',
          message: 'Nhắc user 2',
          target_url: '/debts?customer=c2',
          customers: { name: 'Chú Ba', total_debt: 200000 },
        },
      ],
      profiles: [
        makeProfile({ id: 'p1', user_id: 'user-1', reminder_default_hour: '08:30' }),
        makeProfile({ id: 'p2', user_id: 'user-2', reminder_default_hour: '08:30' }),
      ],
      dueCustomersByUser: {
        'user-1': [{ id: 'c1', name: 'Cô Lan', total_debt: 100000, next_due_date: '2026-11-17' }],
        'user-2': [{ id: 'c2', name: 'Chú Ba', total_debt: 200000, next_due_date: '2026-11-17' }],
      },
      subscriptionsByUser: {
        'user-1': [makeSub('sub-1', 'user-1')],
        'user-2': [makeSub('sub-2', 'user-2')],
      },
    });
    mocks.createAdminClient.mockReturnValue(fake.client);

    const { runReminderCron } = await import('@/lib/reminders-cron');
    const res = await runReminderCron(new Date('2026-11-17T02:00:00.000Z'), {
      userId: 'user-1',
    });

    expect(res.customSent).toBe(1);
    expect(res.digestSent).toBe(1);
    expect(fake.updates.map((u) => u.id)).toEqual(['rem-u1', 'p1']);
  });
});
