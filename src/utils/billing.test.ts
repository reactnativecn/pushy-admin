import { describe, expect, test } from 'bun:test';
import {
  DEFAULT_MONTHLY_PRICE_FACTOR,
  getAnnualSavings,
  getBillingOptions,
  parseBillingMonths,
  resolveBillingPlan,
  resolveMonthlyPrice,
  resolveMonthlyPriceFactor,
} from './billing';

// ─── resolveMonthlyPriceFactor ──────────────────────────────────────

describe('resolveMonthlyPriceFactor', () => {
  test('returns default factor when no value provided', () => {
    expect(resolveMonthlyPriceFactor()).toBe(DEFAULT_MONTHLY_PRICE_FACTOR);
  });

  test('returns default factor for undefined', () => {
    expect(resolveMonthlyPriceFactor(undefined)).toBe(
      DEFAULT_MONTHLY_PRICE_FACTOR,
    );
  });

  test('returns default factor for 0', () => {
    expect(resolveMonthlyPriceFactor(0)).toBe(DEFAULT_MONTHLY_PRICE_FACTOR);
  });

  test('returns default factor for negative number', () => {
    expect(resolveMonthlyPriceFactor(-5)).toBe(DEFAULT_MONTHLY_PRICE_FACTOR);
  });

  test('returns default factor for NaN', () => {
    expect(resolveMonthlyPriceFactor(NaN)).toBe(DEFAULT_MONTHLY_PRICE_FACTOR);
  });

  test('returns default factor for Infinity', () => {
    expect(resolveMonthlyPriceFactor(Infinity)).toBe(
      DEFAULT_MONTHLY_PRICE_FACTOR,
    );
  });

  test('returns default factor for string', () => {
    expect(resolveMonthlyPriceFactor('abc')).toBe(
      DEFAULT_MONTHLY_PRICE_FACTOR,
    );
  });

  test('returns custom factor for valid positive number', () => {
    expect(resolveMonthlyPriceFactor(10)).toBe(10);
  });

  test('returns custom factor for decimal', () => {
    expect(resolveMonthlyPriceFactor(8.5)).toBe(8.5);
  });
});

// ─── resolveMonthlyPrice ────────────────────────────────────────────

describe('resolveMonthlyPrice', () => {
  test('divides annual price by default factor', () => {
    expect(resolveMonthlyPrice(800)).toBe(100);
  });

  test('divides annual price by custom factor', () => {
    expect(resolveMonthlyPrice(1000, 10)).toBe(100);
  });

  test('rounds to 2 decimal places', () => {
    expect(resolveMonthlyPrice(100, 3)).toBe(33.33);
  });

  test('handles zero annual price', () => {
    expect(resolveMonthlyPrice(0)).toBe(0);
  });

  test('handles large values', () => {
    expect(resolveMonthlyPrice(120000, 12)).toBe(10000);
  });

  test('rounds correctly at boundary', () => {
    expect(resolveMonthlyPrice(100)).toBe(12.5);
  });

  test('handles rounding edge case with EPSILON', () => {
    expect(resolveMonthlyPrice(1, 3)).toBe(0.33);
  });
});

// ─── parseBillingMonths ─────────────────────────────────────────────

describe('parseBillingMonths', () => {
  test('parses valid number', () => {
    expect(parseBillingMonths(6)).toBe(6);
  });

  test('parses numeric string', () => {
    expect(parseBillingMonths('3')).toBe(3);
  });

  test('truncates decimal', () => {
    expect(parseBillingMonths(3.7)).toBe(3);
  });

  test('truncates decimal string', () => {
    expect(parseBillingMonths('5.9')).toBe(5);
  });

  test('returns fallback for 0', () => {
    expect(parseBillingMonths(0)).toBe(1);
  });

  test('returns fallback for negative', () => {
    expect(parseBillingMonths(-1)).toBe(1);
  });

  test('returns fallback for NaN', () => {
    expect(parseBillingMonths(NaN)).toBe(1);
  });

  test('returns fallback for Infinity', () => {
    expect(parseBillingMonths(Infinity)).toBe(1);
  });

  test('returns fallback for non-numeric string', () => {
    expect(parseBillingMonths('abc')).toBe(1);
  });

  test('returns custom fallback', () => {
    expect(parseBillingMonths('abc', 12)).toBe(12);
  });

  test('returns default fallback for null', () => {
    expect(parseBillingMonths(null)).toBe(1);
  });

  test('returns default fallback for undefined', () => {
    expect(parseBillingMonths(undefined)).toBe(1);
  });

  test('returns fallback for empty string', () => {
    expect(parseBillingMonths('')).toBe(1);
  });
});

// ─── resolveBillingPlan (expanded) ──────────────────────────────────

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

  test('defaults to 12 months when no months specified', () => {
    const plan = resolveBillingPlan(800);
    expect(plan.billingMonths).toBe(12);
    expect(plan.billingCycle).toBe('year');
    expect(plan.switchedToAnnual).toBe(true);
  });

  test('throws for months less than 1 after parsing', () => {
    expect(() =>
      resolveBillingPlan(800, 0, DEFAULT_MONTHLY_PRICE_FACTOR),
    ).toThrow('Billing months must be a positive integer');
  });

  test('stores the monthly price factor in the plan', () => {
    const plan = resolveBillingPlan(800, 1, 10);
    expect(plan.monthlyPriceFactor).toBe(10);
  });

  test('calculates correct amount for 3 months', () => {
    const plan = resolveBillingPlan(800, 3, DEFAULT_MONTHLY_PRICE_FACTOR);
    expect(plan.amount).toBe(300);
    expect(plan.billingCycle).toBe('month');
    expect(plan.requestedMonths).toBe(3);
    expect(plan.billingMonths).toBe(3);
  });

  test('handles zero annual price gracefully', () => {
    const plan = resolveBillingPlan(0, 1, DEFAULT_MONTHLY_PRICE_FACTOR);
    expect(plan.amount).toBe(0);
    expect(plan.switchedToAnnual).toBe(false);
    expect(plan.billingCycle).toBe('month');
  });

  test('handles custom monthly price factor', () => {
    const plan = resolveBillingPlan(1200, 6, 10);
    expect(plan.monthlyPrice).toBe(120);
    expect(plan.amount).toBe(720);
    expect(plan.billingCycle).toBe('month');

    const plan2 = resolveBillingPlan(1200, 10, 10);
    expect(plan2.switchedToAnnual).toBe(true);
    expect(plan2.billingCycle).toBe('year');
  });

  test('requestedMonths is preserved in output', () => {
    const plan = resolveBillingPlan(800, 5, DEFAULT_MONTHLY_PRICE_FACTOR);
    expect(plan.requestedMonths).toBe(5);
  });
});

// ─── getAnnualSavings (expanded) ────────────────────────────────────

describe('getAnnualSavings', () => {
  test('returns annual savings compared with paying monthly', () => {
    const plan = resolveBillingPlan(800, 12, DEFAULT_MONTHLY_PRICE_FACTOR);
    const savings = getAnnualSavings(plan);

    expect(savings.amount).toBe(400);
    expect(savings.percent).toBe(33);
    expect(savings.discount).toBe(6.7);
  });

  test('does not show savings for monthly plans', () => {
    const plan = resolveBillingPlan(800, 1, DEFAULT_MONTHLY_PRICE_FACTOR);
    const savings = getAnnualSavings(plan);

    expect(savings.amount).toBe(0);
    expect(savings.percent).toBe(0);
    expect(savings.discount).toBe(0);
  });

  test('returns zero savings when annual price equals monthly total', () => {
    const plan = {
      amount: 1200,
      billingCycle: 'year' as const,
      billingMonths: 12,
      monthlyPrice: 100,
    };
    const savings = getAnnualSavings(plan);
    expect(savings.amount).toBe(0);
    expect(savings.percent).toBe(0);
  });

  test('returns zero for zero amount plan', () => {
    const plan = {
      amount: 0,
      billingCycle: 'year' as const,
      billingMonths: 12,
      monthlyPrice: 0,
    };
    const savings = getAnnualSavings(plan);
    expect(savings.amount).toBe(0);
    expect(savings.percent).toBe(0);
    expect(savings.discount).toBe(0);
  });
});

// ─── getBillingOptions (expanded) ───────────────────────────────────

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

  test('always includes annual option as last item', () => {
    const options = getBillingOptions({
      annualPrice: 2400,
      monthlyPriceFactor: 8,
    });

    const last = options.at(-1)!;
    expect(last.billingCycle).toBe('year');
    expect(last.value).toBe(12);
  });

  test('all monthly options have billingCycle month', () => {
    const options = getBillingOptions({
      annualPrice: 800,
      monthlyPriceFactor: 8,
    });

    for (const opt of options.slice(0, -1)) {
      expect(opt.billingCycle).toBe('month');
    }
  });

  test('options are ordered by value ascending', () => {
    const options = getBillingOptions({
      annualPrice: 800,
      monthlyPriceFactor: 8,
    });

    for (let i = 1; i < options.length; i++) {
      expect(options[i].value).toBeGreaterThan(options[i - 1].value);
    }
  });

  test('handles custom annualBillingMonths', () => {
    const options = getBillingOptions({
      annualBillingMonths: 6,
      annualPrice: 600,
      monthlyPriceFactor: 6,
    });

    // monthlyPrice = 600/6 = 100; months 1-5 stay monthly, month 6 switches to annual
    const values = options.map((o) => o.value);
    expect(values).toContain(1);
    expect(values).toContain(5);
    // Month 6 switches to annual (6*100 = 600 = annualPrice), so value is 12 (ANNUAL_BILLING_MONTHS)
    expect(values).not.toContain(6);
    expect(options.at(-1)?.billingCycle).toBe('year');
    expect(options.at(-1)?.value).toBe(12);
  });

  test('every option includes all BillingPlan fields', () => {
    const options = getBillingOptions({
      annualPrice: 800,
      monthlyPriceFactor: 8,
    });

    for (const opt of options) {
      expect(typeof opt.requestedMonths).toBe('number');
      expect(typeof opt.billingMonths).toBe('number');
      expect(typeof opt.billingCycle).toBe('string');
      expect(typeof opt.amount).toBe('number');
      expect(typeof opt.annualPrice).toBe('number');
      expect(typeof opt.monthlyPrice).toBe('number');
      expect(typeof opt.monthlyPriceFactor).toBe('number');
      expect(typeof opt.switchedToAnnual).toBe('boolean');
      expect(typeof opt.value).toBe('number');
    }
  });
});
