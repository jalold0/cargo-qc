// ============================================================
// appVersion.js — app versiyasi va build sanasi
// ------------------------------------------------------------
// Vite build paytida `__APP_VERSION__` va `__APP_BUILD_DATE__`
// global o'zgaruvchilar o'rniga package.json'dan kelgan haqiqiy
// qiymatlar qo'yiladi (vite.config.js → define).
//
// Foydalanish:
//   import { APP_VERSION, APP_BUILD_DATE } from '../services/appVersion';
//   <span>v{APP_VERSION}</span>
// ============================================================

/* global __APP_VERSION__, __APP_BUILD_DATE__ */

export const APP_VERSION =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

export const APP_BUILD_DATE =
  typeof __APP_BUILD_DATE__ !== 'undefined'
    ? __APP_BUILD_DATE__
    : new Date().toISOString().slice(0, 10);

// Major.Minor.Patch ajratish (kelajakda kerak bo'lsa)
export function parseSemver(version) {
  const match = String(version).match(/^(\d+)\.(\d+)\.(\d+)(?:-([\w.-]+))?$/);
  if (!match) return { major: 0, minor: 0, patch: 0, pre: '' };
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    pre: match[4] || '',
  };
}

// Format: "v1.1.0 · 2026-05-24"
export function formatVersionLabel({ withDate = true } = {}) {
  if (withDate) return `v${APP_VERSION} · ${APP_BUILD_DATE}`;
  return `v${APP_VERSION}`;
}
