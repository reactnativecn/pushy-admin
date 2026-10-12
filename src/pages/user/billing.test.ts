import { describe, expect, test } from 'bun:test';
import { resources } from '@/i18n/resources';
import {
  getAnnualDiscount,
  isPurchasableTier,
  PURCHASABLE_TIER_LABEL_KEY,
  resolveMonthlyPrice,
} from './billing';

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

describe('getAnnualDiscount', () => {
  test('按 12 个月累计月付价计算折扣', () => {
    expect(getAnnualDiscount({ annualPrice: 1600, monthlyPrice: 200 })).toBe(
      '6.7',
    );
    expect(getAnnualDiscount({ annualPrice: 1200, monthlyPrice: 200 })).toBe(
      '5',
    );
  });

  test('支持报价给出的计费月数', () => {
    expect(
      getAnnualDiscount({
        annualPrice: 900,
        billingMonths: 10,
        monthlyPrice: 100,
      }),
    ).toBe('9');
  });

  test('年付不比月付便宜时不给折扣', () => {
    expect(
      getAnnualDiscount({ annualPrice: 2400, monthlyPrice: 200 }),
    ).toBeUndefined();
    expect(
      getAnnualDiscount({ annualPrice: 3000, monthlyPrice: 200 }),
    ).toBeUndefined();
  });
});

describe('purchasable tiers', () => {
  test('只认可购买的版本', () => {
    expect(isPurchasableTier('standard')).toBe(true);
    expect(isPurchasableTier('vip3')).toBe(true);
    expect(isPurchasableTier('free')).toBe(false);
    expect(isPurchasableTier('custom')).toBe(false);
    expect(isPurchasableTier('toString')).toBe(false);
    expect(isPurchasableTier(undefined)).toBe(false);
  });

  test('每个版本名称的文案 key 在两个语言包里都存在', () => {
    for (const locale of [resources.en, resources['zh-CN']]) {
      for (const key of Object.values(PURCHASABLE_TIER_LABEL_KEY)) {
        const value = key
          .split('.')
          .reduce<unknown>(
            (node, part) =>
              node && typeof node === 'object'
                ? (node as Record<string, unknown>)[part]
                : undefined,
            locale.translation,
          );
        expect(typeof value).toBe('string');
      }
    }
  });
});
