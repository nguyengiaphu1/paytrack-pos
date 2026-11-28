'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { CheckCircle2, Palette, RotateCcw } from 'lucide-react';
import {
  DEFAULT_THEME_PALETTE,
  ensureAccessibleWhiteTextAccent,
  getContrastRatio,
  hexToHsv,
  hsvToHex,
  isDefaultThemePalette,
  isValidHex,
  normalizeHex,
  type CustomThemePalette,
} from '@/lib/theme-palette';

type PaletteSlot = 'base60' | 'surface30' | 'accent10';

const WHEEL_SIZE = 248;
const WHEEL_RADIUS = WHEEL_SIZE / 2;

const SLOT_META: Array<{
  key: PaletteSlot;
  ratio: string;
  label: string;
  hint: string;
}> = [
  { key: 'base60', ratio: '60%', label: 'Nền chính', hint: 'Nền dịu mắt' },
  { key: 'surface30', ratio: '30%', label: 'Màu kính', hint: 'Ánh kính nổi' },
  { key: 'accent10', ratio: '10%', label: 'Điểm nhấn', hint: 'Nút bấm chính' },
];

interface HexColorWheelProps {
  palette: CustomThemePalette;
  onChange: (next: CustomThemePalette) => void;
  onReset: () => void;
}

/**
 * Interactive 248px circular HSV color wheel with live pointer-capture dragging,
 * lightness/brightness slider, 60-30-10 role selector, and direct #HEX entry.
 */
export function HexColorWheel({ palette, onChange, onReset }: HexColorWheelProps) {
  const [activeSlot, setActiveSlot] = useState<PaletteSlot>('accent10');
  const [hexDraft, setHexDraft] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef(false);

  const activeHex = palette[activeSlot];
  const hsv = useMemo(() => hexToHsv(activeHex), [activeHex]);
  const [valueSlider, setValueSlider] = useState<number>(() => hsv.v);
  const effectiveV = hsv.s === 0 ? valueSlider : hsv.v;

  // Draw crisp Retina hue-saturation color disc
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pxSize = Math.round(WHEEL_SIZE * dpr);
    canvas.width = pxSize;
    canvas.height = pxSize;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = ctx.createImageData(pxSize, pxSize);
    const data = img.data;
    const cx = pxSize / 2;
    const cy = pxSize / 2;
    const radius = pxSize / 2 - 1;

    for (let y = 0; y < pxSize; y++) {
      const dy = y - cy;
      for (let x = 0; x < pxSize; x++) {
        const dx = x - cx;
        const dist = Math.hypot(dx, dy);
        const offset = (y * pxSize + x) * 4;

        if (dist > radius) {
          data[offset + 3] = 0;
          continue;
        }

        const angleRad = Math.atan2(dy, dx);
        const hue = ((angleRad * 180) / Math.PI + 360) % 360;
        const sat = Math.min(1, dist / radius);

        const c = sat;
        const hp = hue / 60;
        const xVal = c * (1 - Math.abs((hp % 2) - 1));
        const m = 1 - c;

        let r = 0;
        let g = 0;
        let b = 0;
        if (hp < 1) [r, g, b] = [c, xVal, 0];
        else if (hp < 2) [r, g, b] = [xVal, c, 0];
        else if (hp < 3) [r, g, b] = [0, c, xVal];
        else if (hp < 4) [r, g, b] = [0, xVal, c];
        else if (hp < 5) [r, g, b] = [xVal, 0, c];
        else [r, g, b] = [c, 0, xVal];

        // Smooth 1.5px anti-aliased edge
        const edgeAlpha = dist > radius - 1.5 ? Math.max(0, (radius - dist) / 1.5) : 1;

        data[offset] = Math.round((r + m) * 255);
        data[offset + 1] = Math.round((g + m) * 255);
        data[offset + 2] = Math.round((b + m) * 255);
        data[offset + 3] = Math.round(edgeAlpha * 255);
      }
    }

    ctx.putImageData(img, 0, 0);
  }, []);

  function commitSlotHex(nextHex: string) {
    setHexDraft(null);
    onChange({
      ...palette,
      presetId: 'custom',
      [activeSlot]: nextHex,
    });
  }

  function pickFromPointer(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const r = rect.width / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.min(r, Math.hypot(dx, dy));
    const angle = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    const sat = Math.round((dist / r) * 100);
    const vForSlot =
      activeSlot === 'base60'
        ? Math.max(84, effectiveV)
        : activeSlot === 'surface30'
          ? Math.max(58, effectiveV)
          : Math.max(24, effectiveV);
    setValueSlider(vForSlot);
    const picked = hsvToHex({ h: angle, s: sat, v: vForSlot });
    commitSlotHex(picked);
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    draggingRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic events
    }
    pickFromPointer(e.clientX, e.clientY);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!draggingRef.current) return;
    pickFromPointer(e.clientX, e.clientY);
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic events
    }
  }

  // Compute loupe position on the wheel from HSV
  const angleRad = (hsv.h * Math.PI) / 180;
  const knobDist = (hsv.s / 100) * (WHEEL_RADIUS - 6);
  const knobX = WHEEL_RADIUS + Math.cos(angleRad) * knobDist;
  const knobY = WHEEL_RADIUS + Math.sin(angleRad) * knobDist;

  const isDefault = isDefaultThemePalette(palette);
  const effectiveAccent = ensureAccessibleWhiteTextAccent(palette.accent10);
  const accentContrast = getContrastRatio(effectiveAccent, '#FFFFFF');
  const pureHueHex = hsvToHex({ h: hsv.h, s: hsv.s, v: 100 });

  return (
    <div className="glass-well space-y-4 rounded-[20px] p-3.5 sm:p-4">
      {/* Proportional 60-30-10 Live Ratio Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-[12px] font-semibold text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5 text-[var(--brand-jade-text)]" />
            <span>Tỷ lệ 60 – 30 – 10 trực tiếp</span>
          </span>
          {!isDefault && (
            <button
              type="button"
              onClick={onReset}
              className="glass-solid-control press-tactile inline-flex min-h-[44px] items-center gap-1 rounded-full px-3 text-[12px] font-semibold text-[var(--text-primary)]"
            >
              <RotateCcw className="h-3.5 w-3.5 text-[var(--brand-jade-text)]" />
              <span>Mặc định</span>
            </button>
          )}
        </div>
        <div
          role="img"
          aria-label={`Tỷ lệ màu: 60% ${palette.base60}, 30% ${palette.surface30}, 10% ${palette.accent10}`}
          className="flex h-4 w-full overflow-hidden rounded-full border border-[var(--border-default)]"
        >
          <div style={{ width: '60%', backgroundColor: palette.base60 }} />
          <div style={{ width: '30%', backgroundColor: palette.surface30 }} />
          <div style={{ width: '10%', backgroundColor: palette.accent10 }} />
        </div>
      </div>

      {/* 3 Role Selector Pills (60% / 30% / 10%) */}
      <div
        role="group"
        aria-label="Chọn lớp màu 60-30-10 để chỉnh"
        className="grid grid-cols-3 gap-1.5"
      >
        {SLOT_META.map((slot) => {
          const active = activeSlot === slot.key;
          const slotHex = palette[slot.key];
          return (
            <button
              key={slot.key}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setActiveSlot(slot.key);
                setHexDraft(null);
                setValueSlider(hexToHsv(palette[slot.key]).v);
              }}
              className={`press-tactile flex min-h-[56px] flex-col items-start justify-center rounded-[16px] px-2 py-1.5 text-left transition-[transform,background-color,color] sm:px-2.5 ${
                active
                  ? 'glass-chip-active ring-2 ring-[var(--brand-jade)]'
                  : 'glass-solid-control text-[var(--text-primary)]'
              }`}
            >
              <div className="flex w-full items-center justify-between gap-1">
                <span className="font-mono-tabular text-[12px] font-bold text-[var(--brand-jade-text)]">
                  {slot.ratio}
                </span>
                <span
                  aria-hidden="true"
                  style={{ backgroundColor: slotHex }}
                  className="h-4 w-4 shrink-0 rounded-full border border-[var(--border-default)]"
                />
              </div>
              <span className="mt-0.5 w-full truncate text-[12px] font-semibold text-[var(--text-primary)]">
                {slot.label}
              </span>
              <span className="font-mono-tabular w-full truncate text-[12px] text-[var(--text-secondary)]">
                {slotHex}
              </span>
            </button>
          );
        })}
      </div>

      {/* Large Circular Interactive Hex Color Wheel */}
      <div className="flex flex-col items-center gap-3.5">
        <div
          className="relative flex items-center justify-center rounded-full p-1.5"
          style={{ width: WHEEL_SIZE + 12, height: WHEEL_SIZE + 12 }}
        >
          <canvas
            ref={canvasRef}
            aria-label="Bánh xe chọn màu Hex hình tròn — chạm hoặc rê để chọn màu"
            role="slider"
            aria-valuemin={0}
            aria-valuemax={360}
            aria-valuenow={hsv.h}
            aria-valuetext={activeHex}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}
            className="block cursor-crosshair touch-none select-none rounded-full border border-[var(--border-default)]"
          />

          {/* Live Loupe / Thumb */}
          <span
            aria-hidden="true"
            style={{
              left: knobX + 6,
              top: knobY + 6,
              backgroundColor: activeHex,
            }}
            className="pointer-events-none absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_2px_8px_rgba(0,0,0,0.45)] ring-1 ring-black/30"
          />
        </div>

        {/* Brightness / Value Slider */}
        <div className="w-full space-y-1">
          <div className="flex items-center justify-between text-[12px] font-medium text-[var(--text-secondary)]">
            <label htmlFor="hex-wheel-brightness">Độ sáng màu</label>
            <span className="font-mono-tabular font-semibold text-[var(--text-primary)]">
              {effectiveV}%
            </span>
          </div>
          <input
            id="hex-wheel-brightness"
            type="range"
            min={14}
            max={98}
            value={effectiveV}
            onChange={(e) => {
              const nextV = Number(e.target.value);
              setValueSlider(nextV);
              commitSlotHex(hsvToHex({ h: hsv.h, s: hsv.s, v: nextV }));
            }}
            style={{
              background: `linear-gradient(to right, #141816, ${pureHueHex})`,
            }}
            className="min-h-[44px] w-full cursor-pointer appearance-none rounded-full bg-transparent accent-[var(--brand-jade)] [&::-webkit-slider-runnable-track]:h-3 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[var(--brand-jade)]"
          />
        </div>

        {/* Direct #HEX Input + Live WCAG AA Status */}
        <div className="flex w-full flex-wrap items-center gap-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span
              aria-hidden="true"
              style={{ backgroundColor: activeHex }}
              className="h-11 w-11 shrink-0 rounded-[14px] border border-[var(--border-default)]"
            />
            <input
              type="text"
              aria-label="Mã màu Hex"
              value={hexDraft ?? activeHex}
              maxLength={7}
              onChange={(e) => {
                const raw = e.target.value.toUpperCase();
                setHexDraft(raw);
                const candidate = raw.startsWith('#') ? raw : `#${raw}`;
                if (isValidHex(candidate)) {
                  const normalized = normalizeHex(candidate, activeHex);
                  setValueSlider(hexToHsv(normalized).v);
                  onChange({
                    ...palette,
                    presetId: 'custom',
                    [activeSlot]: normalized,
                  });
                }
              }}
              onBlur={() => setHexDraft(null)}
              placeholder={DEFAULT_THEME_PALETTE[activeSlot]}
              className="glass-input font-mono-tabular min-h-[44px] w-full min-w-0 rounded-[14px] px-3.5 text-[16px] font-semibold uppercase text-[var(--text-primary)] outline-none"
            />
          </div>

          <span className="glass-badge-paid inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>Chữ rõ {accentContrast.toFixed(1)}:1</span>
          </span>
        </div>
      </div>
    </div>
  );
}
