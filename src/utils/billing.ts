import dayjs, { type ConfigType } from 'dayjs';

export const DEFAULT_MONTHLY_PRICE_FACTOR = 8;
export const ANNUAL_BILLING_MONTHS = 12;

export type BillingCycle = 'month' | 'year';

export interface BillingPlan {
  requestedMonths: number;
  billingMonths: number;
  billingCycle: BillingCycle;
  amount: number;
  annualPrice: number;
  monthlyPrice: number;
  monthlyPriceFactor: number;
  switchedToAnnual: boolean;
}

export interface BillingOption extends BillingPlan {
  value: number;
}

export interface AnnualSavings {
  amount: number;
  percent: number;
  discount: number;
}

export interface ProratedUpgradeParams {
  currentAnnualPrice?: number | null;
  expiresAt?: ConfigType | null;
  now?: ConfigType;
  targetAnnualPrice: number;
}

export interface ProratedAdditiveParams {
  annualAmount?: number | null;
  expiresAt?: ConfigType | null;
  now?: ConfigType;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundDiscount(value: number) {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

function positiveFiniteNumber(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return value;
}

export function resolveMonthlyPriceFactor(configuredFactor?: unknown) {
  return positiveFiniteNumber(configuredFactor) || DEFAULT_MONTHLY_PRICE_FACTOR;
}

export function resolveMonthlyPrice(
  annualPrice: number,
  monthlyPriceFactor = DEFAULT_MONTHLY_PRICE_FACTOR,
) {
  return roundMoney(annualPrice / monthlyPriceFactor);
}

export function parseBillingMonths(value: unknown, fallback = 1) {
  const months = Number(value);
  if (!Number.isFinite(months) || months < 1) return fallback;
  return Math.trunc(months);
}

export function resolveBillingPlan(
  annualPriceValue: number,
  requestedMonths = ANNUAL_BILLING_MONTHS,
  monthlyPriceFactor = DEFAULT_MONTHLY_PRICE_FACTOR,
): BillingPlan {
  const months = parseBillingMonths(requestedMonths, 0);
  if (months < 1) {
    throw new Error('Billing months must be a positive integer');
  }

  const factor = resolveMonthlyPriceFactor(monthlyPriceFactor);
  const annualPrice = roundMoney(annualPriceValue);
  const monthlyPrice = resolveMonthlyPrice(annualPrice, factor);
  const monthlyAmount = roundMoney(monthlyPrice * months);
  const monthlyAmountCents = Math.round(monthlyAmount * 100);
  const annualPriceCents = Math.round(annualPrice * 100);
  const switchedToAnnual =
    annualPriceCents > 0 && monthlyAmountCents >= annualPriceCents;

  if (switchedToAnnual) {
    return {
      requestedMonths: months,
      billingMonths: ANNUAL_BILLING_MONTHS,
      billingCycle: 'year',
      amount: annualPrice,
      annualPrice,
      monthlyPrice,
      monthlyPriceFactor: factor,
      switchedToAnnual,
    };
  }

  return {
    requestedMonths: months,
    billingMonths: months,
    billingCycle: 'month',
    amount: monthlyAmount,
    annualPrice,
    monthlyPrice,
    monthlyPriceFactor: factor,
    switchedToAnnual,
  };
}

export function resolveProratedUpgradeAmount({
  currentAnnualPrice,
  expiresAt,
  now,
  targetAnnualPrice,
}: ProratedUpgradeParams) {
  const currentPrice = positiveFiniteNumber(currentAnnualPrice);
  const targetPrice = positiveFiniteNumber(targetAnnualPrice);
  if (!currentPrice || !targetPrice || currentPrice >= targetPrice) {
    return null;
  }

  if (!expiresAt) {
    return null;
  }

  const deltaDays = dayjs(expiresAt).add(1, 'day').diff(dayjs(now), 'day');
  if (deltaDays <= 0) {
    return null;
  }

  return roundMoney(((targetPrice - currentPrice) / 365) * deltaDays);
}

export function resolveProratedAdditiveAmount({
  annualAmount,
  expiresAt,
  now,
}: ProratedAdditiveParams) {
  const amount = positiveFiniteNumber(annualAmount);
  if (!amount || !expiresAt) {
    return null;
  }

  const deltaDays = dayjs(expiresAt).add(1, 'day').diff(dayjs(now), 'day');
  if (deltaDays <= 0) {
    return null;
  }

  return roundMoney((amount / 365) * deltaDays);
}

export function getAnnualSavings(
  plan: Pick<
    BillingPlan,
    'amount' | 'billingCycle' | 'billingMonths' | 'monthlyPrice'
  >,
): AnnualSavings {
  if (plan.billingCycle !== 'year') {
    return { amount: 0, percent: 0, discount: 0 };
  }

  const monthlyTotal = roundMoney(plan.monthlyPrice * plan.billingMonths);
  const savingsAmount = roundMoney(monthlyTotal - plan.amount);
  if (monthlyTotal <= 0 || savingsAmount <= 0) {
    return { amount: 0, percent: 0, discount: 0 };
  }

  return {
    amount: savingsAmount,
    percent: Math.round((savingsAmount / monthlyTotal) * 100),
    discount: roundDiscount((plan.amount / monthlyTotal) * 10),
  };
}

export function getBillingOptions({
  annualBillingMonths = ANNUAL_BILLING_MONTHS,
  annualPrice,
  monthlyPriceFactor,
}: {
  annualBillingMonths?: number;
  annualPrice: number;
  monthlyPriceFactor: number;
}) {
  const safeAnnualBillingMonths = parseBillingMonths(
    annualBillingMonths,
    ANNUAL_BILLING_MONTHS,
  );
  const options: BillingOption[] = [];

  for (let months = 1; months < safeAnnualBillingMonths; months += 1) {
    const plan = resolveBillingPlan(annualPrice, months, monthlyPriceFactor);
    if (plan.billingCycle === 'month') {
      options.push({
        ...plan,
        value: plan.billingMonths,
      });
    }
  }

  const annualPlan = resolveBillingPlan(
    annualPrice,
    safeAnnualBillingMonths,
    monthlyPriceFactor,
  );
  options.push({
    ...annualPlan,
    value: annualPlan.billingMonths,
  });

  return options;
}
