import { describe, it, expect } from 'vitest';
import {
  normalizeCompensatedPaymentStatus,
  normalizeCompensatedRecoveryStatus,
  normalizeCompensatedRegistry,
  normalizeOptionalRegistryDate,
  normalizePaymentAmount,
} from './compensatedNormalizer';

describe('normalizeOptionalRegistryDate', () => {
  it('returns ISO string for parseable dates', () => {
    const result = normalizeOptionalRegistryDate('2026-05-24');
    expect(result).toBe(new Date('2026-05-24').toISOString());
  });

  it('returns empty string for falsy input', () => {
    expect(normalizeOptionalRegistryDate('')).toBe('');
    expect(normalizeOptionalRegistryDate(null)).toBe('');
    expect(normalizeOptionalRegistryDate(undefined)).toBe('');
  });

  it('returns trimmed original for unparseable input', () => {
    expect(normalizeOptionalRegistryDate('   not-a-date   ')).toBe('not-a-date');
  });
});

describe('normalizePaymentAmount', () => {
  it('converts numeric strings to numbers', () => {
    expect(normalizePaymentAmount('1500000')).toBe(1500000);
    expect(normalizePaymentAmount('1 500 000')).toBe(1500000);
    expect(normalizePaymentAmount("1 500 000 so'm")).toBe(1500000);
  });

  it('handles decimal comma (European format)', () => {
    expect(normalizePaymentAmount('1500,50')).toBe(1500.5);
  });

  it('returns empty string for null/empty input', () => {
    expect(normalizePaymentAmount(null)).toBe('');
    expect(normalizePaymentAmount(undefined)).toBe('');
    expect(normalizePaymentAmount('')).toBe('');
  });

  it('returns 0 for fully non-numeric input (Number("") === 0)', () => {
    // Eslatma: stripping non-digits dan keyin '' qoladi va Number('') === 0,
    // shu sababli "abc" kabi input 0 qaytaradi.
    expect(normalizePaymentAmount('  abc  ')).toBe(0);
  });
});

describe('normalizeCompensatedPaymentStatus', () => {
  it('maps various spellings to canonical "To\'langan"', () => {
    expect(normalizeCompensatedPaymentStatus('tolangan')).toBe("To'langan");
    expect(normalizeCompensatedPaymentStatus("To'langan")).toBe("To'langan");
    expect(normalizeCompensatedPaymentStatus('оплачено')).toBe("To'langan");
  });

  it('maps to "Tasdiqlangan"', () => {
    expect(normalizeCompensatedPaymentStatus('Tasdiqlangan')).toBe('Tasdiqlangan');
    expect(normalizeCompensatedPaymentStatus('подтверждено')).toBe('Tasdiqlangan');
  });

  it('maps to "Rad etilgan"', () => {
    expect(normalizeCompensatedPaymentStatus('Rad etilgan')).toBe('Rad etilgan');
    expect(normalizeCompensatedPaymentStatus('отказано')).toBe('Rad etilgan');
  });

  it('defaults to "Kutmoqda" for empty input', () => {
    expect(normalizeCompensatedPaymentStatus('')).toBe('Kutmoqda');
    expect(normalizeCompensatedPaymentStatus(null)).toBe('Kutmoqda');
  });

  it('falls back to trimmed original for unknown text', () => {
    expect(normalizeCompensatedPaymentStatus('CustomLabel')).toBe('CustomLabel');
  });
});

describe('normalizeCompensatedRecoveryStatus', () => {
  it("defaults to 'Qabul qilindi' (new flow)", () => {
    expect(normalizeCompensatedRecoveryStatus('')).toBe('Qabul qilindi');
    expect(normalizeCompensatedRecoveryStatus(null)).toBe('Qabul qilindi');
  });

  it("recognizes 'Yopildi'", () => {
    expect(normalizeCompensatedRecoveryStatus('Yopildi')).toBe('Yopildi');
    expect(normalizeCompensatedRecoveryStatus('closed')).toBe('Yopildi');
    expect(normalizeCompensatedRecoveryStatus('закрыто')).toBe('Yopildi');
  });

  it("recognizes 'Jarayonda'", () => {
    expect(normalizeCompensatedRecoveryStatus('Jarayonda')).toBe('Jarayonda');
    expect(normalizeCompensatedRecoveryStatus('in progress')).toBe('Jarayonda');
  });

  it("recognizes 'Qabul qilindi'", () => {
    expect(normalizeCompensatedRecoveryStatus('Qabul qilindi')).toBe('Qabul qilindi');
    expect(normalizeCompensatedRecoveryStatus('accepted')).toBe('Qabul qilindi');
  });
});

describe('normalizeCompensatedRegistry', () => {
  it('filters out items without trackCode', () => {
    const result = normalizeCompensatedRegistry([
      { trackCode: 'ABC' },
      { trackCode: '' },
      { someOtherField: 'value' },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].trackCode).toBe('ABC');
  });

  it('CRITICAL: preserves workflow fields (Bug #51 regression test)', () => {
    const input = [
      {
        trackCode: 'ABC',
        assignedTo: 'Jaloldin Mirzakbarov',
        assignedToId: 1,
        assignedAt: '2026-05-24T10:00:00Z',
        workflowComment: 'Mijoz bilan bog\'lanildi',
        receiptFile: { url: '/receipts/abc.pdf' },
      },
    ];
    const [out] = normalizeCompensatedRegistry(input);
    expect(out.assignedTo).toBe('Jaloldin Mirzakbarov');
    expect(out.assignedToId).toBe(1);
    expect(out.assignedAt).toBe('2026-05-24T10:00:00Z');
    expect(out.workflowComment).toBe("Mijoz bilan bog'lanildi");
    expect(out.receiptFile).toEqual({ url: '/receipts/abc.pdf' });
  });

  it('preserves CRM-104 fields (javobgar, barakaStatus, enteredDate104)', () => {
    const input = [
      {
        trackCode: 'ABC',
        javobgar: 'Saidali',
        barakaStatus: 'Tasdiqlangan',
        enteredDate104: '2026-05-20',
      },
    ];
    const [out] = normalizeCompensatedRegistry(input);
    expect(out.javobgar).toBe('Saidali');
    expect(out.barakaStatus).toBe('Tasdiqlangan');
    expect(out.enteredDate104).toBe('2026-05-20');
  });

  it('reads phone/customer via multiple field aliases', () => {
    const input = [
      { trackCode: 'A', phone: '+998', customer: 'John' },
      { trackCode: 'B', telefon: '+998998', mijoz: 'Jane' },
    ];
    const result = normalizeCompensatedRegistry(input);
    expect(result[0].phone).toBe('+998');
    expect(result[0].customer).toBe('John');
    expect(result[1].phone).toBe('+998998');
    expect(result[1].customer).toBe('Jane');
  });

  it('generates ID when missing', () => {
    const [out] = normalizeCompensatedRegistry([{ trackCode: 'ABC' }]);
    expect(out.id).toMatch(/^compensated-registry-/);
  });

  it("defaults paymentStatus to 'Kutmoqda' and recovery to 'Qabul qilindi'", () => {
    const [out] = normalizeCompensatedRegistry([{ trackCode: 'X' }]);
    expect(out.paymentStatus).toBe('Kutmoqda');
    expect(out.foundResolutionStatus).toBe('Qabul qilindi');
  });

  it('handles null/undefined input safely', () => {
    expect(normalizeCompensatedRegistry(null)).toEqual([]);
    expect(normalizeCompensatedRegistry(undefined)).toEqual([]);
    expect(normalizeCompensatedRegistry()).toEqual([]);
  });
});
