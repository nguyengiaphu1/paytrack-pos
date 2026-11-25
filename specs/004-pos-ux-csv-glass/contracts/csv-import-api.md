# API Contract: Shop Ledger CSV Import

**Endpoint**: `POST /api/import/csv`
**Auth**: Required — authenticated Supabase SSR session cookie (`supabase.auth.getUser()`; returns `401` if unauthenticated). Strictly enforces RLS (`auth.uid()`).

## Request Body (`application/json`)

```json
{
  "csvText": "Date,Item ,Out,In ,Tồn ,,Customer,Người nhận CK,\r\n...",
  "year": 2026,
  "unitMode": "k",
  "groupSameDayOrders": true,
  "skipDuplicates": true
}
```

### Request Validation Rules
- `csvText`: required non-empty string, max `2_000_000` bytes (`~2 MB`).
- `year`: integer `2000 <= year <= 2100` (defaults to inferred year if omitted).
- `unitMode`: `'k' | 'vnd'` (defaults to `'k'`).
- `groupSameDayOrders`: boolean (defaults to `true`).
- `skipDuplicates`: boolean (defaults to `true`).
- Max orders per request: `500` (returns `400` with Vietnamese guidance if exceeded).

## Success Response (`200 OK`)

```json
{
  "ok": true,
  "summary": {
    "createdCustomers": 40,
    "matchedCustomers": 0,
    "createdProducts": 46,
    "matchedProducts": 0,
    "createdOrders": 45,
    "skippedDuplicateOrders": 0,
    "skippedInvalidRows": 1,
    "ignoredSummaryRows": 1,
    "totals": {
      "totalRevenue": 48320000,
      "totalCost": 37234000,
      "totalProfit": 11086000,
      "totalPaid": 320000,
      "totalDebt": 48000000
    }
  },
  "warnings": [
    {
      "lineNumber": 55,
      "rawSummary": "2 túi mm mint",
      "reason": "Thiếu giá bán và tên khách hàng"
    }
  ]
}
```

## Error Responses

- `401 Unauthorized`: `{ "error": "Chưa đăng nhập" }`
- `400 Bad Request`: `{ "error": "File CSV không hợp lệ hoặc thiếu cột cần thiết (Item, Out/In/Tồn)." }`
- `500 Internal Server Error`: `{ "error": "<Vietnamese error message>", "partial": { "createdOrders": <n> } }` — if a mid-batch RPC fails, already-created orders remain valid and re-uploading with `skipDuplicates: true` resumes safely without double-counting.
