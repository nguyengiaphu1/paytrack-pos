/**
 * Translates raw Supabase / PostgREST / Fetch / Auth errors into direct,
 * natural Vietnamese retail messages while preserving intentional Vietnamese copy.
 */
export function formatErrorMessageVN(
  err: unknown,
  fallback = 'Có lỗi xảy ra, vui lòng thử lại.'
): string {
  const raw =
    typeof err === 'string'
      ? err.trim()
      : err instanceof Error
        ? err.message.trim()
        : err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
          ? err.message.trim()
          : '';

  if (!raw) return fallback;

  const code =
    err && typeof err === 'object' && 'code' in err && typeof err.code === 'string'
      ? err.code
      : '';

  const lower = raw.toLowerCase();

  // Network / offline / timeout failures
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('load failed') ||
    lower.includes('fetch failed') ||
    lower.includes('err_internet_disconnected')
  ) {
    return 'Mất kết nối mạng — kiểm tra Wi-Fi hoặc 4G rồi thử lại.';
  }

  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('aborted')) {
    return 'Kết nối quá chậm, vui lòng thử lại.';
  }

  // Auth / session expiry
  if (
    lower.includes('jwt expired') ||
    lower.includes('invalid jwt') ||
    lower.includes('session_not_found') ||
    lower.includes('not authenticated') ||
    lower.includes('auth session missing')
  ) {
    return 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.';
  }

  // Postgres / PostgREST error codes
  if (code === '42501' || lower.includes('row-level security') || lower.includes('permission denied')) {
    return 'Không có quyền thực hiện thao tác này, vui lòng đăng nhập lại.';
  }

  if (code === '23505' || lower.includes('duplicate key')) {
    return 'Dữ liệu bị trùng lặp, vui lòng kiểm tra lại.';
  }

  if (code === '23503' || lower.includes('foreign key constraint')) {
    return 'Dữ liệu liên kết không còn tồn tại, vui lòng tải lại trang.';
  }

  if (code === '23514' || lower.includes('check constraint')) {
    if (lower.includes('customer_id') || lower.includes('debt') || lower.includes('paid_amount')) {
      return 'Đơn ghi nợ bắt buộc phải chọn khách hàng.';
    }
    return 'Giá trị nhập chưa hợp lệ, vui lòng kiểm tra lại.';
  }

  if (code === 'PGRST116' || lower.includes('json object requested, multiple')) {
    return 'Không tìm thấy bản ghi cần xử lý, vui lòng tải lại.';
  }

  // Preserve intentional Vietnamese messages (contains Vietnamese diacritics)
  if (/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(raw)) {
    return raw;
  }

  // Hide raw technical English messages behind clean Vietnamese fallback
  return fallback;
}
