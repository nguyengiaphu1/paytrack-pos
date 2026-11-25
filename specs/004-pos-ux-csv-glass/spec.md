# Feature Specification: POS UX Polish, Analytics Hierarchy, CSV Shop Import & Neutral Geometric Glassmorphism

**Feature Branch**: `feat/004-pos-ux-csv-glass`

**Created**: 2026-11-25

**Status**: Draft

**Input**: User description: "Add/Adjust these features: 1. Remove the 'Món lẻ' and replace it with 'Thêm món' (originally 'Thêm SP'); 2. When pressing 'Chọn khách', do not pop the keyboard up instantly which covers the entire box and the user cannot see anything, instead either raise the modal box up while keeping the keyboard popped up automatically or just let the user pop the keyboard up manually by pressing the input box; 3. Fix the 'Thống kê' tab, right now it's just a mess full of 'equally important' box that should be resized and/or removed/optimized; 4. Allow the user to upload the csv file as attached and automatically integrated those information (regarding shop) into their account so that they don't have to manually enter data; 5. Make the system-wide design be Glassmorphism (not green glass), apply the 60-30-10 rule, which means glassmorphism for most tiles, except for important buttons. Feel free to adjust the design guardrails; 6. Replace the current background with a background featuring solid dark charcoal or off-white base layered with crisp geometric patterns or solid vector shapes (Dark Mode: Matte Obsidian #0C100E or Deep Slate #0F172A paired with crisp white or mint dot-grids at 8% opacity; Light Mode: Soft Limestone #F2F5F3 or Warm Gray #ECEFED paired with dark forest-gray grid lines at 7% opacity)."

## Clarifications

### Session 2026-11-25

- Q: When multiple rows in an uploaded CSV belong to the same customer on the same day, how should the importer create orders in Sổ bán? → A: Group rows with the same date, customer, payment status, and payment account into one multi-item order by default, with a preview toggle to switch to 1 order per row.
- Q: How should the CSV importer handle adding items from the spreadsheet into the POS product catalog when an item already exists or appears at different prices across rows? → A: Auto-create missing products using the lowest positive row price as default selling/cost price, and leave already-existing catalog products unchanged.
- Q: Below the redesigned Hero KPIs and main Revenue/Cash trend chart on the "Thống kê" tab, how should the secondary breakdown cards (`Phương thức thanh toán` and `Tuổi nợ`) be handled alongside `Nợ nhiều nhất` and `Món bán chạy`? → A: Remove standalone `Phương thức thanh toán` and `Tuổi nợ` cards; embed a compact cash-vs-transfer progress bar inside the `Thực thu` card, leaving only Hero KPIs, main trend chart, `Nợ nhiều nhất`, and `Món bán chạy`.
- Q: Which exact Light Mode and Dark Mode base color pairing should we lock in for the geometric pattern backdrop? → A: Light Mode Warm Gray (`#ECEFED`) with dark forest-gray grid lines (`rgba(15, 23, 20, 0.07)`); Dark Mode Matte Obsidian (`#0C100E`) with crisp white dot-grid (`rgba(255, 255, 255, 0.08)`).
- Q: When tapping "Chọn khách" on a phone, which keyboard behavior do you prefer? → A: Do not auto-open the keyboard on modal open; display the customer list immediately and open the keyboard only when the user manually taps the search input (keeping the modal viewport-safe when typing).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bulk Import Shop Ledger from CSV (Priority: P1)

A shop owner who has been tracking daily orders, costs, payments, and customer debts in a spreadsheet (such as `ThuChi.csv` with columns for Date, Item, Cost `Out`, Paid `In`, Unpaid/Debt `Tồn`, Customer, Payment Receiver `Người nhận CK`, and optional status such as `Done`) uploads that CSV file directly into PayTrack POS. Before anything is saved, the owner sees a clear Vietnamese import preview summarizing detected customers, products, orders, total revenue, total cost, total unpaid debt, inferred year (adjustable if needed), and any skipped blank, incomplete, or summary-total rows. Upon confirming, the system automatically integrates all valid shop records—creating missing customers, adding missing products with their selling and cost prices, recording historical orders with accurate dates and payment accounts, and updating customer debt balances—so the shop owner can immediately continue working across POS, Sales Ledger, Debt Ledger, and Analytics without retyping a single row.

**Why this priority**: Eliminating manual data migration removes the single biggest adoption barrier for an active home-shop owner transitioning from a spreadsheet to PayTrack POS.

**Independent Test**: Can be fully tested by uploading the provided `ThuChi.csv` file into an account, inspecting the preview counts and financial totals (revenue 48,320,000đ, cost 37,234,000đ, paid 320,000đ, unpaid debt 48,000,000đ, profit 11,086,000đ across 57 valid item rows with the incomplete row and bottom totals row cleanly excluded), confirming the import, and verifying that customers, products, orders, debt balances, and analytics reflect the exact imported figures.

**Acceptance Scenarios**:

1. **Given** a signed-in shop owner with a CSV ledger file in the `ThuChi.csv` format (with `D/M` dates carried forward onto blank date rows, thousand-VND numbers in `Out`, `In`, and `Tồn`, customer names, and `Người nhận CK` receivers), **When** the owner selects and uploads the file, **Then** the system parses the file and displays a preview showing the count of new vs. existing customers, new vs. existing products, orders to be created, total revenue, total cost, total paid, total unpaid debt, an adjustable year selector for year-less dates, and a list of any skipped rows with clear reasons.
2. **Given** the CSV contains a paid row (populated `In`, empty `Tồn`, optional `Done` status) and unpaid rows (empty `In`, populated `Tồn`), **When** the owner confirms the import, **Then** paid rows are saved as fully paid orders with zero remaining debt, unpaid rows are saved as unpaid orders that add to each customer's outstanding debt balance, and partially paid rows (both `In` and `Tồn` populated) are saved as partial orders with exact paid and remaining amounts.
3. **Given** the CSV contains a payment receiver name that matches one of the shop's canonical accounts (ignoring extra whitespace or casing, e.g., `"Thanh "`, `"Kiều Thương"`) as well as a custom receiver name outside the canonical list (e.g., `"Trần Huyền"`), **When** imported, **Then** canonical names map directly to their matching payment account and non-canonical names map to `"Khác"` with the original receiver name preserved in the payment account note.
4. **Given** the CSV contains blank trailing rows, an incomplete item row with no price or customer (e.g., `"2 túi mm mint"`), and a bottom totals/summary row (e.g., `,,37234,320,48000,,11086,,`), **When** parsed, **Then** blank rows and summary-total rows are automatically excluded (never creating a customer named `"11086"`), and incomplete rows are flagged as skipped in the preview without blocking the rest of the import.
5. **Given** the owner has already imported `ThuChi.csv` once and later re-uploads the same file (or an updated file containing previously imported rows plus new rows), **When** parsed and confirmed, **Then** existing customers and products are matched and reused without creating duplicates, and previously imported orders are detected and skipped by default so customer debts and revenue totals are never double-counted.

---

### User Story 2 - Streamlined POS Product Toolbar ("Thêm món" Replaces "Món lẻ") (Priority: P1)

When operating the POS workspace on a phone or desktop, the shop owner sees a clean search bar paired directly with a single **"Thêm món"** button (replacing the previous **"Món lẻ"** button and consolidating the old **"Thêm SP"** button). Tapping **"Thêm món"** immediately opens the permanent product creation modal so every new item sold is saved into the catalog for quick reuse, with no separate "Món lẻ" button cluttering the toolbar or secondary controls.

**Why this priority**: The POS screen is the owner's most-used daily surface; removing an unused one-off flow ("Món lẻ") and promoting catalog creation ("Thêm món") directly into the top toolbar saves taps on every new product launch.

**Independent Test**: Can be fully tested on both mobile and desktop viewports by opening the POS tab, verifying "Món lẻ" and "Thêm SP" no longer appear anywhere in the catalog toolbar or management tray, tapping "Thêm món" right beside the search bar, creating a new product, and seeing it appear in the catalog ready to add to an order.

**Acceptance Scenarios**:

1. **Given** the shop owner is on the POS workspace (mobile or desktop), **When** viewing the product search bar and catalog controls, **Then** the "Món lẻ" button is completely removed and replaced in that right-hand search-bar position by **"Thêm món"**.
2. **Given** the shop owner taps **"Thêm món"** next to the search bar, **When** the modal opens and the owner fills in product details and saves, **Then** the product is saved to the shop's catalog (the same flow previously triggered by "Thêm SP") and appears immediately in the product list.
3. **Given** the shop owner opens the catalog management controls (mobile "Quản lý" tray or desktop filter row), **When** viewing available controls, **Then** there is no duplicate "Thêm SP" or "Thêm món" button—only non-redundant catalog management actions (such as Edit mode and Show Hidden items when applicable).

---

### User Story 3 - Unobstructed Mobile Customer Selection ("Chọn khách") (Priority: P1)

When the shop owner taps **"Chọn khách"** (or **"Đổi"**) on a mobile phone, the customer selection sheet opens cleanly displaying recent customers, the customer list, debt badges, and the search box—without forcibly popping up the mobile on-screen keyboard and obscuring the list. The owner can immediately tap a recent or visible customer with one tap, or deliberately tap the search input when they want to type a name, phone number, or address, at which point the keyboard opens while keeping the search box and matching results clearly visible.

**Why this priority**: Auto-popping the virtual keyboard on mobile currently blocks the entire customer picker sheet, making a core 1-second POS action frustrating and unusable on phones.

**Independent Test**: Can be fully tested on a mobile viewport (touch device or mobile browser) by tapping "Chọn khách", confirming the search field is not auto-focused on open so the customer list and recent buyers are immediately visible and tappable, and then manually tapping the search input to verify typing and filtering work smoothly without the modal being hidden behind the keyboard.

**Acceptance Scenarios**:

1. **Given** the shop owner is on the POS screen on a phone and taps **"Chọn khách"**, **When** the customer selection modal opens, **Then** the search input is NOT automatically focused, the mobile keyboard does NOT pop up automatically, and the full customer list (including recent buyers and walk-in option) is immediately visible and interactive.
2. **Given** the customer selection modal is open, **When** the owner manually taps the search input box, **Then** the keyboard appears, the search input and top filtered results remain clearly visible within the available viewport height, and tapping a matching customer selects them and closes the modal.
3. **Given** the owner is on a desktop device using a physical keyboard or taps to open the customer picker, **When** they tap/click the search input and type a unique match then press Enter, **Then** keyboard search and selection continue to work cleanly without regressions.

---

### User Story 4 - Redesigned Analytics Hierarchy ("Thống kê") (Priority: P2)

When the shop owner opens the **"Thống kê"** tab to review daily, weekly, or monthly performance, instead of facing a noisy wall of 7 equally-sized KPI tiles and equally-weighted panels, they see a clear visual hierarchy tailored to retail decision-making:
- **Primary Hero Summary**: Prominently sized focal metrics for **Lãi (Profit)** and **Giá bán (Revenue)** with their supporting breakdown tucked cleanly inline (`Giá vốn` and `Số đơn`), so the owner grasps business performance in under 2 seconds.
- **Secondary Cash & Debt Strip**: Compact, clearly subordinate indicators for **Thực thu (Cash Collected)** and **Tổng nợ (Total Outstanding Debt)** with period `Nợ mới` shown inline as context rather than competing as separate full-size boxes.
- **Dominant Trend Visual**: The revenue vs. cash collected chart spans cleanly below the summary as the primary visual anchor.
- **Focused Actionable Lists Only**: The standalone **Phương thức thanh toán** and **Tuổi nợ** boxes are removed completely; cash-vs-transfer share is tucked into a compact progress bar inside the **Thực thu** card, leaving only the two actionable lists (**Nợ nhiều nhất** with direct tap-to-collect links and **Món bán chạy**) below the trend chart.

**Why this priority**: Turning the analytics tab from a cluttered flat grid into an opinionated visual hierarchy lets the owner read profit, revenue, cash flow, and overdue risks at a glance during busy evenings.

**Independent Test**: Can be fully tested on mobile (`375px`) and desktop (`1280px+`) by opening the "Thống kê" tab with populated orders and debts, confirming no flat 7-equal-KPI grid or standalone Payment Breakdown / Debt Aging boxes exist, verifying primary metrics are visually larger and distinct from secondary metrics (including the inline cash-vs-transfer bar inside Thực thu), and verifying all key numbers remain accurate when switching date presets or payment account filters.

**Acceptance Scenarios**:

1. **Given** the shop owner opens **"Thống kê"** with orders in the selected period, **When** scanning the top of the page, **Then** they see a clear hierarchy of at most 2 primary hero metric blocks (Revenue and Profit, with order count and cost context integrated inline) above a compact secondary row for Cash Collected (with an inline cash-vs-transfer mix bar) and Total Outstanding Debt (with new period debt integrated inline)—eliminating the old 7-equal-box KPI clutter.
2. **Given** the shop owner switches date presets (`Hôm nay`, `7 ngày`, `30 ngày`, `Tháng này`, `Tùy chọn`) or filters by a specific payment account, **When** data updates, **Then** hero metrics, secondary cash/debt figures, trend chart, and rankings update consistently without layout shifting or text overflow on mobile or desktop.
3. **Given** the shop owner scrolls below the main trend chart, **When** viewing the lower analytics sections, **Then** standalone `Phương thức thanh toán` and `Tuổi nợ` cards do not appear—only the actionable **Nợ nhiều nhất** and **Món bán chạy** panels are shown.

---

### User Story 5 - System-Wide Neutral Glassmorphism with Strict 60–30–10 Hierarchy (Priority: P2)

Across every screen, modal, drawer, and navigation surface in PayTrack POS, the visual language follows authentic **neutral glassmorphism** under a disciplined **60–30–10** balance—completely eliminating "green glass" tinted cards, green-washed chips, or jade-tinted structural panes:
- **60% Background Canvas**: The geometric architectural backdrop (defined in User Story 6).
- **30% Neutral Translucent Glass Tiles**: Cards, panels, modals, navigation dock, filter bars, KPI tiles, and secondary interactive surfaces render as crisp frosted neutral glass (frosted translucent off-white in Light Mode, frosted translucent charcoal/slate in Dark Mode) with delicate neutral edge highlights and soft shadows, allowing the geometric backdrop to subtly refract through without any green tint.
- **10% Solid Accent for Important Buttons & Key Indicators**: Solid, opaque, high-contrast brand accent fills are reserved strictly for important primary action buttons (such as `Chốt đơn`, `Thu nợ`, `Lưu`, `Nhập dữ liệu`) and concise semantic status badges/figures (paid/profit, debt amber, overdue crimson). Selected tabs, category filters, and secondary toggles use clean neutral contrast rather than green-tinted glass.
- Receipts and payment QR cards remain solid opaque light paper for crisp sharing and printing.

**Why this priority**: Removing unintended green-tinted glass restores crisp visual calm, legibility, and clear action hierarchy so important buttons immediately pop against neutral frosted tiles.

**Independent Test**: Can be fully tested by auditing all 5 routes (`Bán hàng`, `Sổ bán`, `Công nợ`, `Thống kê`, `Cài đặt`), login screen, and primary modals in both Light Mode and Dark Mode to verify that tiles render as neutral frosted glass without green tint, important primary buttons stand out with solid accent contrast, text contrast meets WCAG AA readability, and receipts/VietQR retain solid opaque paper surfaces.

**Acceptance Scenarios**:

1. **Given** the user views any primary screen in Light Mode or Dark Mode, **When** inspecting cards, panels, modals, filter bars, and the floating dock, **Then** those tiles appear as neutral frosted translucent glass (off-white frosted in Light Mode; charcoal/slate frosted in Dark Mode) with zero green-tinted glass wash.
2. **Given** the user views a screen with primary actions (such as Checkout, Collect Debt, Save, Import CSV), **When** comparing primary buttons to surrounding tiles and secondary controls, **Then** primary buttons render as solid, high-contrast, opaque accent controls that visually anchor the 10% accent budget while secondary buttons and tiles stay neutral glass.
3. **Given** the user opens a receipt preview or VietQR modal (in either Light Mode or Dark Mode), **When** viewing or exporting the receipt/QR card, **Then** the printable/shareable document surface remains solid opaque white paper with crisp dark ink while the outer modal frame uses neutral glassmorphism.
4. **Given** the user has system reduced-transparency accessibility preferences enabled, **When** browsing the app, **Then** glass tiles gracefully fall back to clean opaque neutral surfaces without losing border definition or contrast.

---

### User Story 6 - Crisp Architectural Geometric Pattern Backdrop (Light & Dark Modes) (Priority: P2)

The app's full-screen background replaces the previous soft radial light-beam wallpaper with a crisp, solid architectural base layered with subtle geometric patterns so translucent neutral glass tiles stand out with unmistakable depth and separation:
- **Dark Mode**: Solid Matte Obsidian (`#0C100E`) base layered with a crisp, subtle white dot-grid pattern (`rgba(255, 255, 255, 0.08)`).
- **Light Mode**: Solid Warm Gray (`#ECEFED`) base layered with crisp, subtle dark forest-gray geometric grid lines (`rgba(15, 23, 20, 0.07)`).
The background remains fixed and calm during scrolling across mobile and desktop viewports, and browser/PWA chrome theme colors stay harmonized with the solid base in both modes.

**Why this priority**: Glassmorphism relies on crisp underlying visual texture to read as glass; subtle geometric grid lines and dot-grids make neutral translucent cards pop effortlessly without adding visual noise or color cast.

**Independent Test**: Can be fully tested in both Light Mode and Dark Mode across desktop and mobile viewports by inspecting the canvas behind cards and the floating dock, confirming the exact solid base tones and subtle geometric grid/dot patterns render crisply without banding, color cast, or text readability interference, and that switching themes transitions cleanly.

**Acceptance Scenarios**:

1. **Given** the user activates **Light Mode**, **When** viewing any page in the app, **Then** the background displays a solid Warm Gray (`#ECEFED`) base layered with crisp dark forest-gray geometric grid lines (`rgba(15, 23, 20, 0.07)`), providing clean separation beneath neutral frosted glass cards.
2. **Given** the user activates **Dark Mode**, **When** viewing any page in the app, **Then** the background displays a solid Matte Obsidian (`#0C100E`) base layered with a crisp white dot-grid (`rgba(255, 255, 255, 0.08)`), providing clean depth beneath neutral frosted glass cards.
3. **Given** the user scrolls long lists (such as the Sales Ledger or Product Catalog) on mobile or desktop, **When** scrolling, **Then** the geometric backdrop remains crisp and unobtrusive while translucent glass chrome visibly glides over the pattern without distracting flicker or legibility loss.

---

### Edge Cases

- **CSV Date Inference & Multi-Row Grouping**:
  - When a CSV row has a blank `Date` cell, it inherits the most recent non-empty date above it; if the very first data row lacks a date, it defaults to the import date (with a preview warning).
  - When `Date` is formatted as `D/M` (e.g., `2/11`, `10/11`) without a year, the importer infers a sensible default year (current calendar year, or editable by the user in the preview modal) and validates day/month order (`DD/MM`).
  - When multiple consecutive or same-day rows share the same date, customer, payment status, and payment account (e.g., `Diệu` buying `Kẹo gấu` and `Kem nẻ` on `2/11`), the system groups them cleanly into a single multi-item order (preserving each individual item name, selling price, and cost price) so the ledger stays organized while keeping exact totals.
- **CSV Missing/Malformed Rows & Encoding**:
  - Files with Windows CRLF (`\r\n`), UTF-8 BOM, extra trailing commas, or leading/trailing whitespace in headers or cell values (e.g., `"Item "`, `"In "`, `"Tồn "`, `"Thanh Lê "`) parse cleanly without error.
  - Rows with no prices and no customer (e.g., line 55 `,2 túi mm mint,,,,,,,`) are reported as skipped incomplete rows in the preview rather than failing the whole import or creating zero-value broken orders.
  - Bottom totals/summary rows (empty date and empty item with aggregated numeric columns like `,,37234,320,48000,,11086,,`) are automatically detected and excluded from import.
  - Unpaid rows (`Tồn > 0`) that are missing a customer name are flagged as skipped/invalid in the preview (since debt cannot be assigned to an anonymous walk-in customer), while paid rows without a customer can import as walk-in (`Khách lẻ`).
  - Non-CSV files, empty files, or CSVs missing required recognizable columns show a clear Vietnamese validation message without altering existing account data.
- **CSV Price Unit Handling & Product Deduplication**:
  - Values in `Out`, `In`, and `Tồn` follow thousand-VND (`K`) shorthand (e.g., `355` = `355,000đ`, `1090` = `1,090,000đ`). If a CSV already uses full VND amounts (e.g., `>= 100,000` like `460000` or `460.000`), the preview lets the user toggle/confirm unit interpretation (`Nghìn đồng (K)` default vs. `Đồng (VND)`).
  - When the same product appears multiple times in the CSV at different totals (e.g., `Dầu gội Head` once at `425`/`530` and once at `2125`/`2750` for multi-unit bundles), the catalog product is created once (without duplicates) using the lowest positive unit price as default catalog price, while each historical order preserves the exact row's selling price and cost price.
- **CSV Re-Import / Partial Failure Resilience**:
  - Re-uploading the same CSV skips already-imported orders by default (matching date, normalized customer name, total amount, and item fingerprint) and shows the skipped duplicate count in the preview.
  - If a network interruption occurs mid-import, already-imported orders remain valid and re-uploading the same file safely imports only the remaining unimported orders without duplicating prior ones.
- **Mobile Viewport & Keyboard Edge Cases on "Chọn khách"**:
  - When switching inside the customer modal from the search list to **"Thêm khách mới"** (Create New Customer), the form remains scrollable and usable when the user taps form fields and the mobile keyboard opens.
  - Opening the modal on small screens (`375px × 667px`) never traps the close button or action footer off-screen.
- **Reduced Transparency & Print Surface Protection**:
  - Users with reduced transparency enabled still see crisp border separation between tiles and the geometric background.
  - Printing or exporting a receipt/VietQR PNG never bleeds geometric grid lines or dark-mode glass into the document.

## Requirements *(mandatory)*

### Functional Requirements

#### POS Toolbar & Mobile Customer Picker
- **FR-001**: The POS product toolbar MUST completely remove the **"Món lẻ"** button and quick-item trigger from the catalog bar.
- **FR-002**: The POS product toolbar MUST place **"Thêm món"** (formerly labeled **"Thêm SP"**) directly in the right-hand search-bar slot previously occupied by "Món lẻ", visible and reachable in 1 tap on both mobile and desktop viewports.
- **FR-003**: Triggering **"Thêm món"** MUST open the catalog product creation flow and persist the new product into the shop's catalog without duplicating the button elsewhere in the catalog management tray.
- **FR-004**: Opening the **"Chọn khách"** customer selection modal MUST NOT automatically focus the search input field, ensuring the mobile virtual keyboard does not pop up automatically and cover the customer list.
- **FR-005**: The user MUST be able to manually tap/click the search input inside the customer selection modal to bring up the keyboard and filter customers while keeping the search field and top matching results comfortably visible above the keyboard.

#### Analytics ("Thống kê") Hierarchy
- **FR-006**: The **"Thống kê"** tab MUST organize KPI metrics into a clear multi-tier visual hierarchy rather than a flat row of equally sized tiles:
  - Primary tier: Prominent hero metrics for **Giá bán** (with `Số đơn` inline) and **Lãi** (with `Giá vốn` and margin context inline).
  - Secondary tier: Compact, subordinate indicators for **Thực thu** (with an inline cash-vs-transfer mix bar) and **Tổng nợ** (with period `Nợ mới` inline).
- **FR-007**: The **"Thống kê"** tab MUST remove the standalone **Phương thức thanh toán** and **Tuổi nợ** cards, displaying the primary trend chart (`Doanh thu & Thực thu`) as the main visual focal point beneath the KPI summary followed strictly by the two actionable lists (**Nợ nhiều nhất** with direct tap-to-collect links and **Món bán chạy**).
- **FR-008**: All analytics sections MUST remain legible, overflow-free, and responsive across mobile (`375px`) and desktop (`1280px+`) viewports across all date presets and payment account filters.

#### Automated Shop CSV Import
- **FR-009**: Signed-in shop owners MUST be able to upload a `.csv` file (accessible from **Cài đặt** and directly from **Sổ bán**) to automatically import their shop's historical ledger data into their account.
- **FR-010**: The CSV parser MUST support the `ThuChi.csv` ledger layout (`Date`, `Item`, `Out`, `In`, `Tồn`, `Customer`, `Người nhận CK`, and optional trailing status column), tolerating header/cell whitespace, UTF-8 BOM, CRLF/LF line endings, blank spacer columns, and Vietnamese diacritics.
- **FR-011**: The CSV importer MUST carry forward the most recent non-empty `Date` onto subsequent rows with blank `Date` cells, parse `DD/MM` (and `DD/MM/YYYY`) dates with an adjustable year selector defaulting sensibly to the active/recent year, and automatically ignore blank rows and bottom summary/totals rows.
- **FR-012**: The CSV importer MUST translate monetary columns accurately into exact integer VND amounts (defaulting to thousand-VND `K` units matching `ThuChi.csv`, with a preview toggle for full-VND files):
  - `Out` maps to item/order cost price (`Giá vốn`).
  - `In` maps to paid amount (`Đã thu`).
  - `Tồn` maps to unpaid/remaining amount (`Còn nợ`).
  - Total order selling price equals `In + Tồn`, determining payment status automatically (`paid` when `Tồn = 0` and `In > 0`, `unpaid` when `In = 0` and `Tồn > 0`, `partial` when both `> 0`).
- **FR-013**: The CSV importer MUST map `Người nhận CK` values to canonical shop payment accounts (trimmed, case/diacritic-tolerant), automatically falling back to `"Khác"` with the original receiver name preserved in the payment account note when the receiver is not in the canonical 9-account list.
- **FR-014**: Before writing any records, the system MUST present an interactive **Import Preview** showing:
  - Detected customers (new vs. matched existing), products (new vs. matched existing), and orders to create (plus skipped duplicate count).
  - Exact financial totals (Total Revenue, Total Cost, Estimated Profit, Total Paid, Total Unpaid Debt).
  - Editable options for inferred Year, Amount Unit (`Nghìn đồng (K)` vs. `Đồng`), and same-day/same-customer row grouping (enabled by default).
  - Transparent warnings listing any skipped incomplete rows (such as unpriced memo rows) with line numbers and reasons.
- **FR-015**: Upon user confirmation, the system MUST reliably create missing customers, create missing catalog products (using the lowest positive row selling and cost price for items appearing multiple times, while leaving already-existing catalog products unchanged), create historical orders (grouping rows sharing the same date, normalized customer name, payment status, and payment account into one multi-item order by default, or 1 order per row if the user turns off grouping in the preview) with line items and cost snapshots, record initial payments for paid/partial orders, and accurately recalculate every affected customer's total outstanding debt balance—all strictly scoped to the authenticated shop owner's account.
- **FR-016**: After import completes, the system MUST display a clear Vietnamese completion summary (imported customers, products, orders, skipped items) and immediately refresh the live POS, Sales Ledger, Debt Ledger, and Analytics views without requiring a manual page reload.
- **FR-017**: Re-uploading the same CSV file MUST NOT create duplicate customers, duplicate products, or duplicate orders by default (existing customers/products are matched by normalized name; already-imported orders are detected and skipped).

#### System-Wide Neutral Glassmorphism & Geometric Backdrop
- **FR-018**: The system-wide visual design MUST apply a disciplined **60–30–10** hierarchy across all routes and modals:
  - **60%**: Solid architectural canvas with crisp geometric pattern.
  - **30%**: Neutral translucent frosted glassmorphism for cards, panels, modals, drawers, filter bars, KPI boxes, and the floating navigation dock—with **zero green-tinted glass** on tiles or structural chrome.
  - **10%**: Solid, opaque, high-contrast brand accent color reserved strictly for important primary action buttons and concise semantic status indicators.
- **FR-019**: Light Mode MUST render a solid Warm Gray (`#ECEFED`) background layered with crisp dark forest-gray geometric grid lines (`rgba(15, 23, 20, 0.07)`).
- **FR-020**: Dark Mode MUST render a solid Matte Obsidian (`#0C100E`) background layered with a crisp white dot-grid pattern (`rgba(255, 255, 255, 0.08)`).
- **FR-021**: All interactive text, neutral glass surfaces, solid accent buttons, and status badges MUST maintain WCAG AA legibility (`>= 4.5:1` for normal text, `>= 3:1` for large text/controls) in both Light Mode and Dark Mode, support reduced-transparency fallbacks, preserve `>= 16px` input font sizes and `>= 44px` touch targets, and keep receipt/VietQR print surfaces as solid opaque white paper.
- **FR-022**: Project design guidelines and visual quality checks MUST be updated to reflect and enforce the new neutral 60–30–10 glassmorphism and geometric backdrop system (removing outdated green-glass or soft radial-wallpaper assumptions).
- **FR-023**: Interactive transitions MUST provide crisp, purposeful motion: opening any modal or sheet MUST smoothly slide up into view (`260–300ms` ease-out), and switching between top-level navigation tabs (`Bán hàng`, `Công nợ`, `Sổ bán`, `Thống kê`, `Cài đặt`) MUST slide the incoming tab view directionally left or right based on navigation order while gracefully falling back to gentle opacity fades under reduced-motion preferences and never breaking sticky panels or headers.

### Key Entities *(include if feature involves data)*

- **CSV Import Batch (Transient Preview & Execution Payload)**: Represents a parsed spreadsheet file containing normalized rows, inferred/selected year, unit scale (`K` vs. `VND`), grouping preference, summary totals (revenue, cost, paid, debt, profit), duplicate detections, and skipped-row warnings prior to committing.
- **Imported Shop Record Mapping**:
  - **Customer**: Matched or newly created buyer record (normalized name for deduplication; debt balance automatically updated from imported unpaid/partial orders).
  - **Product**: Matched or newly created catalog item (normalized name, default unit, selling price, cost price).
  - **Order & Order Items**: Historical sales ledger entry created from one CSV row or a grouped set of same-day/same-customer/same-payment rows, carrying purchased date, line items with selling and cost prices, payment status (paid, partially paid, or unpaid), payment account & note, and paid date (when paid).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uploading the provided 65-line `ThuChi.csv` file completes parsing and renders an accurate preview in under 2 seconds, and confirming imports 100% of the 57 valid item rows with exact financial reconciliation (Revenue = 48,320,000đ, Cost = 37,234,000đ, Paid = 320,000đ, Unpaid Debt = 48,000,000đ, Profit = 11,086,000đ) while excluding 100% of blank, incomplete, and bottom summary rows.
- **SC-002**: Re-uploading the same `ThuChi.csv` file results in 0 duplicate customers, 0 duplicate products, and 0 duplicate orders, preserving identical account totals.
- **SC-003**: On the POS workspace, 100% of "Món lẻ" toolbar triggers are removed and a shop owner can open the "Thêm món" catalog creation modal in 1 tap from the primary search toolbar on both mobile (`375px`) and desktop (`1280px+`).
- **SC-004**: On mobile devices, tapping "Chọn khách" immediately displays at least 4 customer rows (or recent buyers + list) unobstructed with 0 automatic virtual keyboard popups until the user explicitly taps the search box.
- **SC-005**: On the "Thống kê" tab, top-level KPI boxes are reduced from 7 equal-weight tiles to a clear 2-tier visual hierarchy (2 hero focal metrics + 2 compact secondary indicators), allowing users to identify revenue, profit, cash collected, and outstanding debt within 3 seconds without horizontal overflow on `375px` mobile screens.
- **SC-006**: Across all 5 main routes and core modals in both Light Mode and Dark Mode, 100% of non-primary tiles use neutral frosted glassmorphism (0 green-tinted glass tiles), primary action buttons maintain `>= 4.5:1` contrast as solid accent controls, and the geometric grid/dot backdrop renders cleanly without obscuring text or bleeding into printable receipts/VietQR cards.

## Assumptions

- **Single-Account Scope**: CSV import always integrates records strictly into the currently authenticated user's shop account; it never affects other users or wipes existing shop records.
- **Grouping Default**: By default, CSV rows sharing the exact same date, normalized customer name, payment status (paid vs. unpaid), and payment account are grouped into a single multi-item order (e.g., a customer buying 2–3 items on the same day becomes 1 clean order with 2–3 line items). Users can uncheck grouping in the preview if they prefer 1 order per CSV row.
- **Default Product Unit**: Since `ThuChi.csv` does not have a dedicated unit column, newly created catalog products from CSV default to unit `"cái"` (editable anytime in POS).
- **Default Payment Method for Imported Orders**: Paid rows with a `Người nhận CK` value default to bank transfer; unpaid rows (`Tồn > 0`, `In = 0`) default to debt while still preserving any noted `Người nhận CK` account so it carries forward when collecting debt later.
- **Year Inference for `D/M` Dates**: Because `ThuChi.csv` uses `2/11`, `3/11`, etc. without a year, the importer defaults to the current calendar year (or the previous year if the detected month is in the future relative to today) and lets the owner adjust the year in the preview before importing.
- **Keyboard Behavior Choice for "Chọn khách"**: Between raising the modal with an auto-opened keyboard vs. letting the user trigger the keyboard manually by tapping the input box, the default behavior is **manual keyboard trigger** (no auto-focus on modal open) because it works consistently across mobile and desktop devices without fighting operating-system keyboard animation quirks, while still keeping the modal height viewport-responsive when the user does tap the search box.
- **Design Guardrails Update**: Because the user explicitly authorized adjusting design guardrails for neutral 60–30–10 glassmorphism and the geometric pattern backdrop, the project's design guidelines and visual quality checks will be updated to match the new visual specification.
