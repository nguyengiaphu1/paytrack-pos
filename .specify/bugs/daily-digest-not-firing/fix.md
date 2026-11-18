# Bug Fix: Sửa lỗi mất thông báo khi lưu cài đặt & đổi giờ Báo tổng hợp khách đến hạn mỗi ngày không gửi push

- **Slug**: daily-digest-not-firing
- **Fixed**: 2026-11-17T16:48:30-08:00
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Đã khắc phục triệt để 2 lỗi trên trang **Cài đặt cửa hàng** (`/settings`): bỏ `key={profile?.updated_at}` khiến `SettingsFormBody` bị remount và xóa mất `savedMsg` khi lưu (đồng thời hiển thị thông báo đã lưu ngay phía trên nút **Lưu tất cả cài đặt**), và tự động reset `last_digest_sent_date` về `null` khi chủ tiệm đổi giờ hoặc bật lại **Báo tổng hợp khách đến hạn mỗi ngày** sang khung giờ sắp tới trong cùng ngày (ví dụ `07:30 PM` / `19:30`), kèm trạng thái chẩn đoán `digestStatus` trong `PushNotificationSetup`.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/lib/vietnamese.ts` | modified | Thêm `getCurrentTimeHHMM_VN`, `normalizeHHMM` (hỗ trợ cả AM/PM), và `shouldResetDigestSentDate` dùng chung cho client/server |
| `src/lib/reminders-cron.ts` | modified | Dùng lại & re-export `getCurrentTimeHHMM_VN`, `normalizeHHMM` từ `src/lib/vietnamese.ts` |
| `src/app/(app)/settings/page.tsx` | modified | Bỏ `key={profile?.updated_at}`, giữ state khi lưu, reset `last_digest_sent_date: null` khi đổi lịch sang giờ sắp tới hôm nay, phát event `paytrack:profile-saved`, hiện thông báo lưu ngay trên nút **Lưu tất cả cài đặt** và ghi chú trạng thái ở mục 5 |
| `src/app/api/push/subscribe/route.ts` | modified | `GET` trả thêm `digestStatus` (`enabled`, `hour`, `sentToday`) |
| `src/components/pwa/PushNotificationSetup.tsx` | modified | Lắng nghe `paytrack:profile-saved`, hiển thị `Tổng hợp mỗi ngày: HH:MM (...)`, và giải thích rõ nguyên nhân khi bấm **Gửi lịch đến hạn ngay** |
| `tests/unit/reminders-cron.test.ts` | modified | Thêm unit test cho `shouldResetDigestSentDate`, `normalizeHHMM` AM/PM và digest lúc `19:30` VN (`12:30Z`) |
| `tests/unit/ux-guards.test.ts` | modified | Thêm guard test chặn `key={profile?.updated_at}` và kiểm tra `savedMsg` hiển thị cạnh nút lưu |
| `PROJECT_CONTEXT.md` | modified | Cập nhật Sections 4, 6 & `Recent Changelog` theo rule bảo trì |

## Diff Highlights (optional)

```tsx
// src/app/(app)/settings/page.tsx
<SettingsFormBody
  profile={profile}
  setProfileLocal={setProfileLocal}
  onReplayOnboarding={openOnboarding}
/>
```

```ts
// src/lib/vietnamese.ts
export function shouldResetDigestSentDate(params: { ... }): boolean {
  if (!params.nextEnabled) return false;
  const now = params.now ?? new Date();
  if (params.lastDigestSentDate !== getTodayVN(now)) return false;
  const scheduleChanged = nextHHMM !== prevHHMM || !params.prevEnabled;
  if (!scheduleChanged) return false;
  return nextHHMM >= getCurrentTimeHHMM_VN(now);
}
```

## Tests Added or Updated

- `tests/unit/reminders-cron.test.ts::resets last_digest_sent_date only when rescheduling or re-enabling digest for an upcoming VN hour today` — xác nhận chỉ reset `last_digest_sent_date` khi đổi sang giờ tương lai trong ngày hoặc bật lại digest, không reset nhầm gây gửi trùng khi sửa thông tin khác.
- `tests/unit/reminders-cron.test.ts::fires daily digest at 19:30 VN (07:30 PM) once last_digest_sent_date is cleared` — xác nhận `runReminderCron` lúc `19:30` VN (`12:30Z`) gửi digest và ghi `last_digest_sent_date`.
- `tests/unit/ux-guards.test.ts::does not remount SettingsFormBody on profile.updated_at and keeps save feedback by submit button` — khóa chống hồi quy lỗi remount làm mất thông báo lưu.

## Local Verification

- Commands run:
  - `node --input-type=module` (kiểm tra `normalizeHHMM`, `getCurrentTimeHHMM_VN`, `shouldResetDigestSentDate`, và cấu trúc `settings/page.tsx`) → `NODE_ASSERTIONS_PASSED`
  - `node --input-type=module` (kiểm tra lại các rule trong `ux-guards.test.ts`: banned tokens, `var(--*)` CSS tokens, input `>= 16px`, interactive control `>= 44px`) → `UX_GUARDS_PASSED`
- Lưu ý môi trường sandbox: `node_modules` chưa được cài và `registry.npmjs.org` bị proxy chặn (`403`), nên cần chạy `npm run typecheck && npm run lint && npm test && npm run build` ở môi trường có sẵn `node_modules` / npm registry (hoặc Vercel CI) trong bước `/speckit-bug-test`.

## Deviations from Assessment

- Tách `normalizeHHMM`, `getCurrentTimeHHMM_VN` và `shouldResetDigestSentDate` vào `src/lib/vietnamese.ts` (và re-export từ `src/lib/reminders-cron.ts`) thay vì đặt trong `src/lib/reminders-cron.ts`, vì `reminders-cron.ts` import `createAdminClient` (`@/lib/supabase/admin`) nên không được phép import vào Client Component (`src/app/(app)/settings/page.tsx`).

## Follow-ups

- Chạy `/speckit-bug-test slug=daily-digest-not-firing`, xác nhận `npm run typecheck && npm run lint && npm test && npm run build` pass và test thực tế trên máy sau khi deploy bản sửa.
