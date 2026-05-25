import { describe, it, expect } from 'vitest';
import {
  isAssistantAiSeedRecord,
  mergeAssistantAiRequests,
  normalizeAssistantAiRequest,
  resolveAssistantAiFreshness,
} from './assistantAiNormalizer';

describe('normalizeAssistantAiRequest', () => {
  it('generates ID when missing', () => {
    const result = normalizeAssistantAiRequest({ trackCode: 'ABC' });
    expect(result.id).toMatch(/^assistant-ai-/);
  });

  it('preserves existing ID', () => {
    const result = normalizeAssistantAiRequest({ id: 'fixed-id' });
    expect(result.id).toBe('fixed-id');
  });

  it("maps legacy status 'Yangi' to 'Qabul qildi'", () => {
    const result = normalizeAssistantAiRequest({ status: 'Yangi' });
    expect(result.status).toBe('Qabul qildi');
  });

  it('keeps valid statuses unchanged', () => {
    expect(normalizeAssistantAiRequest({ status: 'Jarayonda' }).status).toBe('Jarayonda');
    expect(normalizeAssistantAiRequest({ status: 'Yopildi' }).status).toBe('Yopildi');
  });

  it("falls back to 'Qabul qildi' for unknown status", () => {
    expect(normalizeAssistantAiRequest({ status: 'Nonsense' }).status).toBe('Qabul qildi');
  });

  it('trims all string fields', () => {
    const result = normalizeAssistantAiRequest({
      trackCode: '  ABC123  ',
      phone: '  998901234567  ',
      fullName: '  John  ',
    });
    expect(result.trackCode).toBe('ABC123');
    expect(result.phone).toBe('998901234567');
    expect(result.fullName).toBe('John');
  });

  it("defaults source to 'telegram_bot'", () => {
    expect(normalizeAssistantAiRequest({}).source).toBe('telegram_bot');
  });

  it('preserves custom source', () => {
    expect(normalizeAssistantAiRequest({ source: 'web' }).source).toBe('web');
  });

  it('sets createdAt/updatedAt timestamps', () => {
    const result = normalizeAssistantAiRequest({});
    expect(result.createdAt).toBeDefined();
    expect(result.updatedAt).toBeDefined();
  });

  it('handles invalid input safely', () => {
    expect(() => normalizeAssistantAiRequest(null)).not.toThrow();
    expect(() => normalizeAssistantAiRequest(undefined)).not.toThrow();
    expect(() => normalizeAssistantAiRequest('not an object')).not.toThrow();
  });
});

describe('isAssistantAiSeedRecord', () => {
  it("detects seed records 'assistant-ai-1' and 'assistant-ai-2'", () => {
    expect(isAssistantAiSeedRecord({ id: 'assistant-ai-1' })).toBe(true);
    expect(isAssistantAiSeedRecord({ id: 'assistant-ai-2' })).toBe(true);
    expect(isAssistantAiSeedRecord({ id: 'ASSISTANT-AI-1' })).toBe(true);
  });

  it('returns false for real records', () => {
    expect(isAssistantAiSeedRecord({ id: 'assistant-ai-1234567890-abc' })).toBe(false);
    expect(isAssistantAiSeedRecord({ id: 'real-id' })).toBe(false);
  });

  it('handles missing id', () => {
    expect(isAssistantAiSeedRecord({})).toBe(false);
    expect(isAssistantAiSeedRecord(null)).toBe(false);
  });
});

describe('resolveAssistantAiFreshness', () => {
  it("prefers updatedAt over createdAt", () => {
    const ms = resolveAssistantAiFreshness({
      createdAt: '2026-01-01',
      updatedAt: '2026-05-24',
    });
    expect(ms).toBe(new Date('2026-05-24').getTime());
  });

  it('falls back to createdAt when no updatedAt', () => {
    const ms = resolveAssistantAiFreshness({ createdAt: '2026-01-01' });
    expect(ms).toBe(new Date('2026-01-01').getTime());
  });

  it('returns 0 when no dates', () => {
    expect(resolveAssistantAiFreshness({})).toBe(0);
    expect(resolveAssistantAiFreshness(null)).toBe(0);
  });
});

describe('mergeAssistantAiRequests', () => {
  it('skips seed records', () => {
    const result = mergeAssistantAiRequests(
      [{ id: 'assistant-ai-1', trackCode: 'X' }],
      [{ id: 'assistant-ai-2', trackCode: 'Y' }],
    );
    expect(result).toEqual([]);
  });

  it('merges by ID, keeps newer version', () => {
    const local = {
      id: 'shared',
      trackCode: 'ABC',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };
    const remote = {
      id: 'shared',
      trackCode: 'ABC',
      createdAt: '2026-01-01',
      updatedAt: '2026-05-24',
      comment: 'updated remotely',
    };
    const result = mergeAssistantAiRequests([local], [remote]);
    expect(result).toHaveLength(1);
    expect(result[0].comment).toBe('updated remotely');
  });

  it('sorts by createdAt descending', () => {
    const older = { id: 'old', createdAt: '2026-01-01' };
    const newer = { id: 'new', createdAt: '2026-05-24' };
    const result = mergeAssistantAiRequests([older], [newer]);
    expect(result[0].id).toBe('new');
    expect(result[1].id).toBe('old');
  });

  it('handles empty arrays', () => {
    expect(mergeAssistantAiRequests([], [])).toEqual([]);
    expect(mergeAssistantAiRequests()).toEqual([]);
  });
});
