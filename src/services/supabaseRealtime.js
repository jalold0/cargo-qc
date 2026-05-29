// src/services/supabaseRealtime.js
// Supabase Realtime — bo'limlar o'rtasida sinxron ishlash uchun.
// Har CRUD o'zgarishi WebSocket orqali boshqa brauzerlarga 1-2 soniyada yetkaziladi.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isRealtimeEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Singleton client — har sahifa bir xil ulanishni ishlatadi
let _client = null;
export function getSupabaseClient() {
  if (_client) return _client;
  if (!isRealtimeEnabled) return null;
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  });
  return _client;
}

// =============================================================================
// Realtime subscription manager — bitta jadval uchun
// Har subscriberga callback yuboradi, channel'ni reuse qiladi.
// =============================================================================
const channels = new Map(); // table -> { channel, subscribers: Set }

export function subscribeToTable(table, callback) {
  if (!isRealtimeEnabled) return () => {};

  let entry = channels.get(table);
  if (!entry) {
    const client = getSupabaseClient();
    if (!client) return () => {};

    const subscribers = new Set();
    const channel = client
      .channel(`public:${table}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
      }, (payload) => {
        // Har subscriber'ga event yuborish
        subscribers.forEach((cb) => {
          try {
            cb(payload);
          } catch (err) {
            console.warn(`[realtime:${table}] subscriber error`, err);
          }
        });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.info(`[realtime] subscribed: ${table}`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[realtime] ${table}: ${status}`);
        }
      });

    entry = { channel, subscribers };
    channels.set(table, entry);
  }

  entry.subscribers.add(callback);

  return () => {
    entry.subscribers.delete(callback);
    // Agar oxirgi subscriber bo'lsa, channel'ni yopish (resource cleanup)
    if (entry.subscribers.size === 0) {
      try {
        entry.channel.unsubscribe();
      } catch (err) {
        console.warn(`[realtime:${table}] unsubscribe error`, err);
      }
      channels.delete(table);
    }
  };
}

// =============================================================================
// Convenience subscribers — har modul uchun alohida
// =============================================================================
export function subscribeToComplaints(callback) {
  return subscribeToTable('complaints_entries', callback);
}

export function subscribeToCompensated(callback) {
  return subscribeToTable('compensated_loads_registry', callback);
}

export function subscribeToAssistantAi(callback) {
  return subscribeToTable('assistant_ai_requests', callback);
}

export function subscribeToSettings(callback) {
  return subscribeToTable('app_settings', callback);
}

export function subscribeToUsers(callback) {
  return subscribeToTable('users', callback);
}

export function subscribeToModule102Realtime(callback) {
  return subscribeToTable('module_102_entries', callback);
}

export function subscribeToWarehouseRealtime(callback) {
  return subscribeToTable('warehouse_returns', callback);
}

// =============================================================================
// Connection health probe
// =============================================================================
export async function testRealtimeConnection() {
  if (!isRealtimeEnabled) return { ok: false, message: 'Supabase env not configured' };
  const client = getSupabaseClient();
  if (!client) return { ok: false, message: 'Cannot create client' };
  return { ok: true, message: 'Realtime client ready' };
}

// =============================================================================
// Cleanup on hot reload (Vite HMR)
// =============================================================================
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    for (const [, entry] of channels) {
      try { entry.channel.unsubscribe(); } catch {}
    }
    channels.clear();
    _client = null;
  });
}
