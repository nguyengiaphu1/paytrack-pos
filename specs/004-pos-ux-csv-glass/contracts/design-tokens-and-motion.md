# UI Design Tokens & Motion Contract

**Feature**: `004-pos-ux-csv-glass` | **Applies to**: `src/app/globals.css`, `src/lib/theme.ts`, `DESIGN.md`, `.impeccable/design.json`, `src/components/shell/AppShell.tsx`, `src/components/ui/ModalDialog.tsx`

## 1. Strict 60–30–10 Neutral Glassmorphism Token Contract

### 60% Architectural Geometric Pattern Backdrop
| Mode | Solid Base (`--bg-canvas`) | Geometric Pattern Layer (`body::before`) | Browser `theme-color` |
|---|---|---|---|
| **Light** | `#ECEFED` (Warm Gray) | Crisp dark forest-gray `28px × 28px` orthogonal grid lines (`rgba(15, 23, 20, 0.07)`) | `#ECEFED` |
| **Dark** | `#0C100E` (Matte Obsidian) | Crisp white `24px × 24px` dot-grid (`rgba(255, 255, 255, 0.08)`) | `#0C100E` |

- `body::after` is neutralized/removed (no soft radial blobs or green color washes).

### 30% Neutral Frosted Glassmorphism Tiles (Zero Green Glass)
| Utility | Light Mode Glass Fill | Dark Mode Glass Fill | Backdrop Blur | Border / Highlight |
|---|---|---|---|---|
| `.glass-dock` | `rgba(255, 255, 255, 0.72)` | `rgba(22, 27, 25, 0.72)` | `blur(24px) saturate(165%)` | Neutral hairline `1px` specular bevel (zero jade tint) |
| `.glass-surface` | `rgba(255, 255, 255, 0.70)` | `rgba(22, 27, 25, 0.68)` | `blur(18px) saturate(155%)` | Neutral hairline specular bevel |
| `.glass-panel` | `rgba(255, 255, 255, 0.74)` | `rgba(20, 25, 23, 0.72)` | `blur(18px) saturate(155%)` | Neutral hairline specular bevel |
| `.glass-card` | `rgba(255, 255, 255, 0.68)` | `rgba(24, 30, 27, 0.66)` | `blur(12px) saturate(145%)` + `contain: layout style` | Neutral hairline specular bevel |
| `.glass-modal` | `rgba(255, 255, 255, 0.86)` | `rgba(20, 25, 23, 0.88)` | `blur(26px) saturate(170%)` | Neutral hairline specular bevel |
| `.glass-well` | `rgba(15, 23, 20, 0.045)` | `rgba(0, 0, 0, 0.34)` | None (recessed tray inside glass) | Inset neutral hairline |
| `.glass-chip` | `rgba(255, 255, 255, 0.62)` | `rgba(30, 37, 34, 0.64)` | None (lightweight pill) | Neutral subtle rim |
| `.glass-chip-active` | `rgba(255, 255, 255, 0.96)` + `#0B111A` text + crisp `1.5px` neutral charcoal rim | `rgba(255, 255, 255, 0.14)` + `#F4F6F8` text + crisp `rgba(255, 255, 255, 0.34)` rim | None / subtle frost | **ZERO green glass fill or jade bevel** |
| `.glass-icon-orb` | Neutral frosted white `rgba(255, 255, 255, 0.82)` | Neutral frosted obsidian `rgba(34, 42, 39, 0.78)` | None | Neutral specular rim (**ZERO green glass**) |

### 10% Solid Opaque Accent (Important Buttons & Semantic Status Only)
| Utility | Surface | Ink | Contrast Target | Usage Rule |
|---|---|---|---|---|
| `.glass-btn-primary` | Solid `#0E6B4E` (Light) / `#127A59` (Dark), hover `#0A563F` / `#0E6347` | `#FFFFFF` | `>= 5.1:1` (WCAG AA) | Reserved strictly for primary forward actions (`Chốt đơn`, `Thu nợ`, `Lưu`, `Nhập dữ liệu`, `Bán hàng`) |
| `.glass-btn-danger` | Solid `#B91C1C` / `#DC2626` | `#FFFFFF` | `>= 5.5:1` | Destructive confirmation actions (`Hủy đơn`, `Xóa`) |
| `.glass-badge-paid` / `-debt` / `-overdue` | High-contrast semantic tinted pills | `--status-paid`, `--status-debt`, `--status-overdue` | `>= 4.5:1` | Compact status labels only |

- **Print & Share Isolation**: `.print-surface-light` forces opaque `#FFFFFF` background, `#141A21` ink, `backdrop-filter: none`, and hides geometric patterns in `@media print`.
- **Reduced Transparency**: `@media (prefers-reduced-transparency: reduce)` switches all glass surfaces to opaque `--bg-surface` (`#FFFFFF` / `#161B19`) with `1px solid var(--border-default)`.

## 2. Motion & Transition Contract

| Animation Class | Keyframes | Duration & Easing | Reduced-Motion Behavior |
|---|---|---|---|
| `.animate-modal-in` | `opacity: 0; transform: translateY(28px) scale(0.985)` → `opacity: 1; transform: translateY(0) scale(1)` | `260ms cubic-bezier(0.22, 1, 0.36, 1)` | `paytrack-fade-in 120ms ease-out` |
| `.animate-sheet-up` | `opacity: 0; transform: translateY(44px)` → `opacity: 1; transform: translateY(0)` | `280ms cubic-bezier(0.22, 1, 0.36, 1)` | `paytrack-fade-in 120ms ease-out` |
| `.animate-tab-slide-left` | `opacity: 0; transform: translateX(28px)` → `opacity: 1; transform: translateX(0)` | `240ms cubic-bezier(0.22, 1, 0.36, 1)` (fill: `backwards`, cleared `onAnimationEnd`) | `paytrack-fade-in 120ms ease-out` |
| `.animate-tab-slide-right` | `opacity: 0; transform: translateX(-28px)` → `opacity: 1; transform: translateX(0)` | `240ms cubic-bezier(0.22, 1, 0.36, 1)` (fill: `backwards`, cleared `onAnimationEnd`) | `paytrack-fade-in 120ms ease-out` |

### Tab Direction Rule (`AppShell.tsx`)
- Tab index order: `0: '/'`, `1: '/debts'`, `2: '/orders'`, `3: '/stats'`, `4: '/settings'`.
- Switching from lower index → higher index triggers `.animate-tab-slide-left` (new view glides in from right toward left).
- Switching from higher index → lower index triggers `.animate-tab-slide-right` (new view glides in from left toward right).
- Animation class clears on `onAnimationEnd` so `transform: none` restores full `position: sticky` behavior on `CartPanel` and `/orders` table headers.
