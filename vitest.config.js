import { defineConfig } from 'vitest/config';

// ============================================================
// Vitest konfiguratsiyasi
// ------------------------------------------------------------
// Faqat pure funksiyalar uchun unit testlar. localStorage,
// React DOM yoki boshqa global'larga muhtoj test yo'q —
// shu sababli `environment: 'node'` (eng tez).
// ============================================================

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js', 'src/**/*.test.jsx'],
    globals: false,
  },
});
