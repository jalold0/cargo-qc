import { colors, fontFamily, fontSize, fontWeight, radii, shadows } from './src/design/tokens.js';

// ============================================================
// Tailwind konfiguratsiyasi — design tokens'dan import qiladi
// ------------------------------------------------------------
// QOIDA: yangi rang, hajm yoki radius qo'shish kerak bo'lsa,
// src/design/tokens.js'ga qo'shing. Bu fayl shu yerdan import
// qiladi — yagona manba (single source of truth).
// ============================================================

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Design tokens'dan
        brand: colors.brand,
        // Eski "primary" — backward compatibility
        primary: colors.brand,
        // Semantic ranglar
        success: colors.success,
        warning: colors.warning,
        danger: colors.danger,
        info: colors.info,
        // Status palette (mavjud kodda ishlatiladi)
        status: {
          new: colors.info[500],
          in_progress: colors.warning[500],
          resolved: colors.success[500],
          cancelled: colors.neutral[500],
        },
        // Trek bosqich ranglari (alohida palitra)
        stage: {
          china: '#f59e0b',
          transit: '#8b5cf6',
          tashkent: '#3b82f6',
          branch: '#06b6d4',
          courier: '#10b981',
          delivered: '#059669',
        },
      },
      fontFamily,
      fontSize,
      fontWeight,
      borderRadius: radii,
      boxShadow: {
        ...shadows,
        // Tailwind default'larni saqlab qolish
        DEFAULT: shadows.md,
      },
      animation: {
        'fade-in': 'fadeIn 200ms cubic-bezier(0.4,0,0.2,1)',
        'slide-up': 'slideUp 320ms cubic-bezier(0,0,0.2,1)',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};
