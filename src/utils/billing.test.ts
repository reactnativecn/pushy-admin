import { describe, expect, test } from 'bun:test';
import {
  DEFAULT_MONTHLY_PRICE_FACTOR,
  getBillingOptions,
  resolveBillingPlan,
} from './billing';

describe('resolveBillingPlan', () => {
  test('uses annual price divided by the default factor for one month', () => {
    const plan = resolveBillingPlan(800, 1, DEFAULT_MONTHLY_PRICE_FACTOR);

    expect(plan.amount).toBe(100);
    expect(plan.monthlyPrice).toBe(100);
    expect(plan.annualPrice).toBe(800);
    expect(plan.billingMonths).toBe(1);
    expect(plan.billingCycle).toBe('month');
    expect(plan.switchedToAnnual).toBe(false);
  });

  test('switches to annual billing once monthly total reaches annual price', () => {
    const plan = resolveBillingPlan(800, 8, DEFAULT_MONTHLY_PRICE_FACTOR);

    expect(plan.amount).toBe(800);
    expect(plan.requestedMonths).toBe(8);
    expect(plan.billingMonths).toBe(12);
    expect(plan.billingCycle).toBe('year');
    expect(plan.switchedToAnnual).toBe(true);
  });
});

describe('getBillingOptions', () => {
  test('removes month counts that would use annual billing', () => {
    const options = getBillingOptions({
      annualPrice: 800,
      monthlyPriceFactor: DEFAULT_MONTHLY_PRICE_FACTOR,
    });

    expect(JSON.stringify(options.map((option) => option.value))).toBe(
      JSON.stringify([1, 2, 3, 4, 5, 6, 7, 12]),
    );
    expect(options.at(-1)?.billingCycle).toBe('year');
  });

  test('honors custom monthly price factors', () => {
    const options = getBillingOptions({
      annualPrice: 800,
      monthlyPriceFactor: 10,
    });

    expect(JSON.stringify(options.map((option) => option.value))).toBe(
      JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 12]),
    );
  });
});
