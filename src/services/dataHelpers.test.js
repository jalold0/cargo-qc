import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  applyPriorityRules,
  getPriorityByWaitingDays,
  getWaitingDays,
  parseTrackNumbers,
  publicUser,
  toDateKey,
} from './dataHelpers';

describe('publicUser', () => {
  it('removes password field from user object', () => {
    const user = { id: 1, username: 'jaloldin', password: 'secret', role: 'admin' };
    const safe = publicUser(user);
    expect(safe).toEqual({ id: 1, username: 'jaloldin', role: 'admin' });
    expect(safe.password).toBeUndefined();
  });

  it('returns null for null/undefined input', () => {
    expect(publicUser(null)).toBeNull();
    expect(publicUser(undefined)).toBeNull();
  });

  it('does not mutate the original user', () => {
    const user = { id: 1, password: 'secret' };
    publicUser(user);
    expect(user.password).toBe('secret');
  });
});

describe('toDateKey', () => {
  it('formats a Date into YYYY-MM-DD', () => {
    expect(toDateKey(new Date('2026-05-24T15:30:00Z'))).toBe('2026-05-24');
  });

  it('returns empty string for invalid input', () => {
    expect(toDateKey('')).toBe('');
    expect(toDateKey(null)).toBe('');
    expect(toDateKey('not-a-date')).toBe('');
  });

  it('accepts ISO string input', () => {
    expect(toDateKey('2026-01-15T10:00:00Z')).toBe('2026-01-15');
  });
});

describe('parseTrackNumbers', () => {
  it('splits by commas, semicolons, whitespace', () => {
    expect(parseTrackNumbers('ABC123, DEF456;GHI789  JKL000')).toEqual([
      'ABC123',
      'DEF456',
      'GHI789',
      'JKL000',
    ]);
  });

  it('removes duplicates', () => {
    expect(parseTrackNumbers('ABC, ABC, ABC, DEF')).toEqual(['ABC', 'DEF']);
  });

  it('returns empty array for empty input', () => {
    expect(parseTrackNumbers('')).toEqual([]);
    expect(parseTrackNumbers(null)).toEqual([]);
    expect(parseTrackNumbers(undefined)).toEqual([]);
  });

  it('trims individual tokens', () => {
    expect(parseTrackNumbers('  ABC  ,  DEF  ')).toEqual(['ABC', 'DEF']);
  });
});

describe('getPriorityByWaitingDays', () => {
  it('returns "Past" for 0-1 days', () => {
    expect(getPriorityByWaitingDays(0)).toBe('Past');
    expect(getPriorityByWaitingDays(1)).toBe('Past');
  });

  it("returns 'O'rta' for 2-4 days", () => {
    expect(getPriorityByWaitingDays(2)).toBe("O'rta");
    expect(getPriorityByWaitingDays(4)).toBe("O'rta");
  });

  it('returns "Yuqori" for 5+ days', () => {
    expect(getPriorityByWaitingDays(5)).toBe('Yuqori');
    expect(getPriorityByWaitingDays(100)).toBe('Yuqori');
  });
});

describe('getWaitingDays', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 for invalid input', () => {
    expect(getWaitingDays(null)).toBe(0);
    expect(getWaitingDays('')).toBe(0);
    expect(getWaitingDays('not-a-date')).toBe(0);
  });

  it('counts whole days between created date and today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-24T12:00:00Z'));
    expect(getWaitingDays('2026-05-20')).toBe(4);
    expect(getWaitingDays('2026-05-24')).toBe(0);
  });
});

describe('applyPriorityRules', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('skips entries with status "Yopildi"', () => {
    const closed = { id: 1, status: 'Yopildi', date: '2020-01-01' };
    const [result] = applyPriorityRules([closed]);
    expect(result).toBe(closed);
    expect(result.priority).toBeUndefined();
  });

  it('assigns priority based on waiting days for open entries', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-24T12:00:00Z'));
    const entries = [
      { id: 1, status: 'Jarayonda', date: '2026-05-24' }, // 0 → Past
      { id: 2, status: 'Jarayonda', date: '2026-05-22' }, // 2 → O'rta
      { id: 3, status: 'Jarayonda', date: '2026-05-10' }, // 14 → Yuqori
    ];
    const result = applyPriorityRules(entries);
    expect(result[0].priority).toBe('Past');
    expect(result[1].priority).toBe("O'rta");
    expect(result[2].priority).toBe('Yuqori');
  });
});
