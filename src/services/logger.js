// src/services/logger.js
// Markazlashtirilgan logger.
// - Development'da: console.log/warn/error to'liq chiqadi
// - Production'da: console.log/info/debug DROPPED (vite.config esbuild drop)
//   lekin console.warn/error qoladi
// - Kelajakda Sentry/LogRocket/Datadog'ga osongina ulash mumkin
//
// Foydalanish:
//   import { logger } from '../services/logger';
//   logger.info('User logged in', { userId });
//   logger.warn('Sales data not synced');
//   logger.error('Failed to save', error);

const IS_DEV = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

// Tashqi log service (Sentry / LogRocket / etc.) ulanishi uchun hook
let externalSink = null;

export function setExternalLogSink(fn) {
  if (typeof fn === 'function') {
    externalSink = fn;
  } else {
    externalSink = null;
  }
}

function emit(level, ...args) {
  // External (xato monitoring) servisga yuborish — warn va error uchun
  if (externalSink && (level === 'warn' || level === 'error')) {
    try {
      externalSink({ level, args, timestamp: new Date().toISOString() });
    } catch {
      // sink xatosini yutib yuboramiz — loop oldini olish
    }
  }

  // Brauzer console — DEV'da debug ham chiqadi, prod'da faqat warn/error
  if (level === 'error' && typeof console !== 'undefined') {
    console.error(...args);
  } else if (level === 'warn' && typeof console !== 'undefined') {
    console.warn(...args);
  } else if (IS_DEV && typeof console !== 'undefined') {
    if (level === 'info') console.info(...args);
    else if (level === 'debug') console.debug(...args);
    else console.log(...args);
  }
}

export const logger = {
  debug: (...args) => emit('debug', ...args),
  info: (...args) => emit('info', ...args),
  log: (...args) => emit('info', ...args),
  warn: (...args) => emit('warn', ...args),
  error: (...args) => emit('error', ...args),
};

export default logger;
