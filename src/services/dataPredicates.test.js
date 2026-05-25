import { describe, it, expect } from 'vitest';
import {
  compareTrackEntryOrder,
  isCompensatedProblemType,
  isCompensatedRecoveredProblemType,
  isDepartmentLeadRole,
  isIsfandiyorLabel,
  isJaloldinMirzakbarovUser,
  isLegacyAdminUser,
  normalizeAssignmentPersonKey,
  normalizePersonLabel,
  normalizeTrackCode,
  resolveEntryOrderTime,
  DEPARTMENT_ASSIGNMENT_NAME_ALIASES,
} from './dataPredicates';

describe('normalizePersonLabel', () => {
  it('lowercases, trims, collapses whitespace', () => {
    expect(normalizePersonLabel('  John   Doe  ')).toBe('john doe');
    expect(normalizePersonLabel('JALOLDIN')).toBe('jaloldin');
  });

  it('handles null/undefined', () => {
    expect(normalizePersonLabel(null)).toBe('');
    expect(normalizePersonLabel(undefined)).toBe('');
  });
});

describe('isIsfandiyorLabel', () => {
  it('matches name case-insensitively', () => {
    expect(isIsfandiyorLabel('Isfandiyor Hodimov')).toBe(true);
    expect(isIsfandiyorLabel('  ISFANDIYOR  ')).toBe(true);
  });

  it('returns false for other names', () => {
    expect(isIsfandiyorLabel('Saidali')).toBe(false);
    expect(isIsfandiyorLabel('')).toBe(false);
  });
});

describe('normalizeTrackCode', () => {
  it('trims and lowercases', () => {
    expect(normalizeTrackCode('  ABC123XYZ  ')).toBe('abc123xyz');
  });

  it('returns empty string for null/undefined', () => {
    expect(normalizeTrackCode(null)).toBe('');
    expect(normalizeTrackCode(undefined)).toBe('');
  });
});

describe('isCompensatedProblemType', () => {
  it('matches "qoplab berilgan"', () => {
    expect(isCompensatedProblemType('Qoplab berilgan')).toBe(true);
    expect(isCompensatedProblemType('QOPLAB BERILGAN xato')).toBe(true);
  });

  it('returns false for unrelated problem types', () => {
    expect(isCompensatedProblemType('Yo\'qolgan yuk')).toBe(false);
  });
});

describe('isCompensatedRecoveredProblemType', () => {
  it('matches "vozvrat"', () => {
    expect(isCompensatedRecoveredProblemType('Vozvrat muammolari')).toBe(true);
  });

  it('returns false otherwise', () => {
    expect(isCompensatedRecoveredProblemType('Yo\'qolgan yuk')).toBe(false);
  });
});

describe('isDepartmentLeadRole', () => {
  it('matches admin/manager/menejer', () => {
    expect(isDepartmentLeadRole('admin')).toBe(true);
    expect(isDepartmentLeadRole('ADMIN')).toBe(true);
    expect(isDepartmentLeadRole('manager')).toBe(true);
    expect(isDepartmentLeadRole('menejer')).toBe(true);
  });

  it('rejects other roles', () => {
    expect(isDepartmentLeadRole('operator')).toBe(false);
    expect(isDepartmentLeadRole('supervisor')).toBe(false);
    expect(isDepartmentLeadRole(undefined)).toBe(false);
  });
});

describe('isLegacyAdminUser', () => {
  it('detects username "admin"', () => {
    expect(isLegacyAdminUser({ username: 'admin' })).toBe(true);
    expect(isLegacyAdminUser({ username: 'ADMIN' })).toBe(true);
  });

  it('detects full_name "admin"', () => {
    expect(isLegacyAdminUser({ full_name: 'Admin' })).toBe(true);
  });

  it('rejects real users', () => {
    expect(
      isLegacyAdminUser({ username: 'jaloldin.mirzakbarov', full_name: 'Jaloldin Mirzakbarov' }),
    ).toBe(false);
  });
});

describe('isJaloldinMirzakbarovUser', () => {
  it('matches various spellings of Jaloldin', () => {
    expect(isJaloldinMirzakbarovUser({ full_name: 'Jaloldin Mirzakbarov' })).toBe(true);
    expect(isJaloldinMirzakbarovUser({ full_name: 'Jaloliddin Mirzakbarov' })).toBe(true);
    expect(isJaloldinMirzakbarovUser({ username: 'jaloldin.mirzakbarov' })).toBe(true);
  });

  it('rejects other users', () => {
    expect(isJaloldinMirzakbarovUser({ full_name: 'Saidali' })).toBe(false);
    expect(isJaloldinMirzakbarovUser({ full_name: '' })).toBe(false);
  });
});

describe('DEPARTMENT_ASSIGNMENT_NAME_ALIASES', () => {
  it('maps known aliases to canonical names', () => {
    expect(DEPARTMENT_ASSIGNMENT_NAME_ALIASES.jaloliddin).toBe('Jaloldin Mirzakbarov');
    expect(DEPARTMENT_ASSIGNMENT_NAME_ALIASES.admin).toBe('Jaloldin Mirzakbarov');
    expect(DEPARTMENT_ASSIGNMENT_NAME_ALIASES.saidali).toBe('Saidali');
  });
});

describe('normalizeAssignmentPersonKey', () => {
  it('lowercases and strips apostrophes/quotes', () => {
    expect(normalizeAssignmentPersonKey('Jaloldin Mirzakbarov')).toBe('jaloldin mirzakbarov');
    // Apostrophe avval o'chiriladi, keyin bo'sh belgi ham qo'shilmaydi:
    expect(normalizeAssignmentPersonKey("Ulug'bek")).toBe('ulugbek');
  });

  it('returns empty string for null/undefined', () => {
    expect(normalizeAssignmentPersonKey(null)).toBe('');
  });
});

describe('resolveEntryOrderTime', () => {
  it('uses date as primary sort key', () => {
    expect(resolveEntryOrderTime({ date: '2026-05-24' })).toBe(
      new Date('2026-05-24').getTime(),
    );
  });

  it('falls back to importedAt when no date', () => {
    expect(resolveEntryOrderTime({ importedAt: '2026-05-24' })).toBe(
      new Date('2026-05-24').getTime(),
    );
  });

  it('returns MAX_SAFE_INTEGER when no parseable field', () => {
    expect(resolveEntryOrderTime({})).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe('compareTrackEntryOrder', () => {
  it('sorts by date ascending', () => {
    const older = { id: '1', date: '2026-05-20', archiveStatus: 'active' };
    const newer = { id: '2', date: '2026-05-24', archiveStatus: 'active' };
    expect(compareTrackEntryOrder(older, newer)).toBeLessThan(0);
    expect(compareTrackEntryOrder(newer, older)).toBeGreaterThan(0);
  });

  it('active entries come before archived when dates equal', () => {
    const active = { id: '1', date: '2026-05-24', archiveStatus: 'active' };
    const archived = { id: '2', date: '2026-05-24', archiveStatus: 'archived' };
    expect(compareTrackEntryOrder(active, archived)).toBeLessThan(0);
  });
});
