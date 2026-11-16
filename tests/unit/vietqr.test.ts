import { describe, expect, it } from 'vitest';
import {
  buildVietQRPayload,
  computeCRC16CCITT,
  sanitizeVietQRMemo,
} from '@/lib/vietqr';

describe('VietQR EMVCo / Napas 247 payload builder', () => {
  it('calculates standard EMVCo CRC-16/CCITT-FALSE', () => {
    expect(computeCRC16CCITT('123456789')).toBe('29B1');
  });

  it('sanitizes Vietnamese customer memos to uppercase ASCII <= 25 chars', () => {
    expect(sanitizeVietQRMemo('PT ĐH1024 Cô Lan Nguyễn Thị')).toBe('PT DH1024 CO LAN NGUYEN T');
    expect(sanitizeVietQRMemo('   ')).toBe('PAYTRACK');
  });

  it('builds a valid dynamic Napas 247 QR string with exact VND amount and CRC', () => {
    const payload = buildVietQRPayload({
      bankBin: '970436',
      accountNo: '0123456789',
      amount: 185000,
      memo: 'PT DH1024 Cô Lan',
    });

    expect(payload.startsWith('000201010212')).toBe(true);
    expect(payload).toContain('A000000727');
    expect(payload).toContain('970436');
    expect(payload).toContain('0123456789');
    expect(payload).toContain('QRIBFTTA');
    expect(payload).toContain('5303704');
    expect(payload).toContain('5406185000');
    expect(payload).toContain('5802VN');
    expect(payload).toContain('0816PT DH1024 CO LAN');

    const bodyWithoutCrc = payload.slice(0, -4);
    const crc = payload.slice(-4);
    expect(computeCRC16CCITT(bodyWithoutCrc)).toBe(crc);
  });

  it('rejects invalid bank BIN or non-positive amounts', () => {
    expect(() =>
      buildVietQRPayload({
        bankBin: '123',
        accountNo: '0123456789',
        amount: 50000,
        memo: 'TEST',
      })
    ).toThrow();

    expect(() =>
      buildVietQRPayload({
        bankBin: '970436',
        accountNo: '0123456789',
        amount: 0,
        memo: 'TEST',
      })
    ).toThrow();
  });
});
