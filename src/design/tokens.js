// ============================================================
// Design Tokens — Cargo QC dizayn tizimi
// ------------------------------------------------------------
// Ranglar, spacing, typography va boshqa atomic dizayn
// qiymatlarining yagona manbasi. JS kodi ham, Tailwind ham
// shu yerdagi qiymatlardan foydalanadi (tailwind.config.js
// shu fayldan import qiladi).
//
// QOIDA: yangi rang, hajm yoki radius qo'shish kerak bo'lsa,
// avval shu yerga qo'shing. Hech qachon `style={{ color: ... }}`
// yoki `text-[#abcdef]` arbitrary qiymat ishlatmang.
// ============================================================

// ------------------------------------------------------------
// COLORS — semantik tarmoq ranglari
// ------------------------------------------------------------

export const colors = {
  // Brand — asosiy harakat rangi (CTA, link, focus)
  brand: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1', // base
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },

  // Neutral — matn, ramka, fon
  neutral: {
    0: '#ffffff',
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },

  // Semantic — holat ranglari
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
  },
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },
};

// Status badge'lari uchun qisqartirilgan rang
export const statusColors = {
  new: colors.info[500],
  in_progress: colors.warning[500],
  resolved: colors.success[500],
  cancelled: colors.neutral[500],
  closed: colors.neutral[500],
  pending: colors.warning[500],
  approved: colors.success[500],
  rejected: colors.danger[500],
};

// ------------------------------------------------------------
// SPACING — 4px grid (Material Design / Tailwind asosi)
// ------------------------------------------------------------

export const spacing = {
  0: '0',
  1: '0.25rem', // 4px
  2: '0.5rem', // 8px
  3: '0.75rem', // 12px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  8: '2rem', // 32px
  10: '2.5rem', // 40px
  12: '3rem', // 48px
  16: '4rem', // 64px
  20: '5rem', // 80px
};

// ------------------------------------------------------------
// TYPOGRAPHY
// ------------------------------------------------------------

export const fontFamily = {
  sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
  mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
};

export const fontSize = {
  xs: ['0.75rem', { lineHeight: '1rem' }], // 12/16
  sm: ['0.875rem', { lineHeight: '1.25rem' }], // 14/20
  base: ['1rem', { lineHeight: '1.5rem' }], // 16/24
  lg: ['1.125rem', { lineHeight: '1.75rem' }], // 18/28
  xl: ['1.25rem', { lineHeight: '1.75rem' }], // 20/28
  '2xl': ['1.5rem', { lineHeight: '2rem' }], // 24/32
  '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30/36
  '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36/40
};

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

// ------------------------------------------------------------
// RADII — yumshoq, yagona radius pog'onasi
// ------------------------------------------------------------

export const radii = {
  none: '0',
  sm: '0.25rem', // 4px — kichik badge, chip
  md: '0.5rem', // 8px — input, button
  lg: '0.75rem', // 12px — card, modal
  xl: '1rem', // 16px — large card
  '2xl': '1.5rem', // 24px — hero card
  full: '9999px', // pill, avatar
};

// ------------------------------------------------------------
// SHADOWS — depth uchun
// ------------------------------------------------------------

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  // Focus ring
  focus: '0 0 0 3px rgb(99 102 241 / 0.4)',
};

// ------------------------------------------------------------
// Z-INDEX — qatlamlar
// ------------------------------------------------------------

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  toast: 400,
  modal: 500,
  popover: 600,
  tooltip: 700,
};

// ------------------------------------------------------------
// MOTION — anatomik o'lchamlar (transition davomiyligi)
// ------------------------------------------------------------

export const motion = {
  fast: '120ms',
  base: '200ms',
  slow: '320ms',
  easing: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    decel: 'cubic-bezier(0, 0, 0.2, 1)',
    accel: 'cubic-bezier(0.4, 0, 1, 1)',
  },
};

// ------------------------------------------------------------
// BREAKPOINTS — Tailwind defaults bilan mos
// ------------------------------------------------------------

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// ============================================================
// Yagona eksport — qulaylik uchun
// ============================================================
export const tokens = {
  colors,
  statusColors,
  spacing,
  fontFamily,
  fontSize,
  fontWeight,
  radii,
  shadows,
  zIndex,
  motion,
  breakpoints,
};

export default tokens;
