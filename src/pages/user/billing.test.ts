import { describe, expect, test } from 'bun:test';
import { resolveMonthlyPrice } from './billing';

describe('resolveMonthlyPrice', () => {
  test('divides the annual price by the default factor', () => {
    expect(resolveMonthlyPrice(800)).toBe(100);
    expect(resolveMonthlyPrice(100)).toBe(12.5);
  });

  test('rounds to 2 decimal places', () => {
    expect(resolveMonthlyPrice(1)).toBe(0.13);
    expect(resolveMonthlyPrice(0)).toBe(0);
  });
});
