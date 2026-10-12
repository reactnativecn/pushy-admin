import { Button, Segmented, Tooltip } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Quota, Tier } from '@/types';
import {
  ANNUAL_BILLING_MONTHS,
  canPurchaseCheckUpdateAddon,
  formatExpireDate,
  formatMoney,
  formatRenewedExpireDate,
  formatWan,
  getAnnualDiscount,
  getAnnualTokenBonus,
  getDefaultCheckUpdateAddonEligibilityHint,
  getPurchasableTierLabel,
  getQuotaDetailItems,
  getRemainingBillableDays,
  isPurchasableTier,
  type OrderQuotes,
  purchase,
  purchaseCheckUpdateAddon,
  resolveMonthlyPrice,
  type useOrderBillingConfig,
} from './billing';
import {
  PurchaseActionPopover,
  type PurchaseMenuOption,
  purchaseButtonClassName,
  useRunningKey,
} from './purchase-action-popover';

export const RenewalPurchaseButton = ({
  quotes,
  quotesLoading,
  serverTime,
  tier,
  tierExpiresAt,
}: {
  quotes?: OrderQuotes;
  quotesLoading: boolean;
  serverTime?: string;
  tier: Tier;
  tierExpiresAt?: string;
}) => {
  const { t } = useTranslation();
  const { run, runningKey: loadingPlan } = useRunningKey<string>();
  const addonUnits = quotes?.current.checkUpdateAddonUnits ?? 0;
  const addonMonthlyPrice = quotes?.current.checkUpdateAddonMonthlyPrice ?? 0;

  if (tier === 'free') {
    return null;
  }

  const renewalOptions: PurchaseMenuOption[] = quotes?.renewals.length
    ? quotes.renewals.map((option) => {
        const billing = option.quote.billing;
        const months =
          option.months ?? billing?.requestedMonths ?? ANNUAL_BILLING_MONTHS;
        const isAnnual = billing?.billingCycle === 'year';
        const discount =
          billing && isAnnual ? getAnnualDiscount(billing) : undefined;
        const tokenBonus = isAnnual ? getAnnualTokenBonus(tier) : 0;

        return {
          amountText: formatMoney(option.quote.amount),
          bonusTag: tokenBonus
            ? t('user.annual_token_bonus', { amount: tokenBonus })
            : undefined,
          description: `${t('user.renew_after_expire')} ${formatRenewedExpireDate(
            {
              expiresAt: tierExpiresAt,
              months,
              now: serverTime,
            },
            t,
          )}`,
          key: option.key,
          onClick: () => run(option.key, () => purchase(tier, months)),
          tag: discount ? t('user.about_discount', { discount }) : undefined,
          title: isAnnual
            ? `${months} ${t('user.annual_billing')}`
            : `${months} ${t('user.price_month')}`,
        };
      })
    : [
        {
          amountText: quotesLoading
            ? t('user.quoting')
            : t('user.order_settle'),
          description: quotesLoading
            ? t('user.fetching_renewal_quote')
            : t('user.renewal_unavailable'),
          disabled: true,
          key: 'unavailable',
          title: t('user.renew'),
        },
      ];

  const renewalHasTokenBonus = renewalOptions.some((option) => option.bonusTag);

  return (
    <PurchaseActionPopover
      buttonLabel={loadingPlan ? t('user.jumping') : t('user.renew')}
      hint={renewalHasTokenBonus ? t('user.token_bonus_hint') : undefined}
      loading={loadingPlan !== null}
      title={t('user.renew')}
      titleNote={
        addonUnits > 0
          ? t('user.addon_price_monthly', {
              price: formatMoney(addonMonthlyPrice),
            })
          : undefined
      }
      options={renewalOptions}
    />
  );
};

export const UpgradePurchaseControls = ({
  currentTier,
  quotes,
  quotesLoading,
  serverTime,
  tierExpiresAt,
}: {
  currentTier: Tier;
  quotes?: OrderQuotes;
  quotesLoading: boolean;
  serverTime?: string;
  tierExpiresAt?: string;
}) => {
  const { t } = useTranslation();
  const { run, runningKey: loadingPlan } = useRunningKey<string>();
  const [billingCycle, setBillingCycle] = useState<'month' | 'year'>('month');
  const upgradeOptions = quotes?.upgrades ?? [];

  if (upgradeOptions.length === 0) {
    return null;
  }

  const remainingDays = getRemainingBillableDays(tierExpiresAt, serverTime);
  const title =
    currentTier === 'free'
      ? t('user.upgrade_purchase')
      : t('user.upgrade_title_with_expire', {
          date: formatExpireDate(tierExpiresAt, t),
          days: remainingDays ?? '-',
        });
  const hint =
    currentTier === 'free'
      ? billingCycle === 'year'
        ? `${t('user.upgrade_hint_free')}${t('user.token_bonus_hint')}`
        : t('user.upgrade_hint_free')
      : t('user.upgrade_hint_paid');

  const headerContent =
    currentTier === 'free' ? (
      <div className="px-2 pb-2">
        <Segmented<'month' | 'year'>
          block
          options={[
            { label: t('user.monthly_pay'), value: 'month' },
            { label: t('user.annual_pay_tab'), value: 'year' },
          ]}
          value={billingCycle}
          onChange={(val) => setBillingCycle(val)}
        />
      </div>
    ) : undefined;

  const menuOptions: PurchaseMenuOption[] = upgradeOptions.map((option) => {
    const quote = option.quote;
    const proration = quote.proration;
    const tier = isPurchasableTier(option.tier) ? option.tier : undefined;

    if (currentTier === 'free') {
      const billing = quote.billing;
      const annualPrice = billing?.annualPrice ?? quote.amount;
      const monthlyPrice =
        billing?.monthlyPrice ?? resolveMonthlyPrice(annualPrice);
      const isAnnual = billingCycle === 'year';
      const months = isAnnual ? ANNUAL_BILLING_MONTHS : 1;
      const discount = isAnnual
        ? getAnnualDiscount({
            annualPrice,
            billingMonths: billing?.billingMonths,
            monthlyPrice,
          })
        : undefined;
      const tierLabel = tier ? getPurchasableTierLabel(tier, t) : option.key;
      const displayAmount = isAnnual ? annualPrice : monthlyPrice;
      const unitText = isAnnual
        ? t('user.per_year_unit')
        : t('user.per_month_unit');
      const optionKey = `${option.key}-${billingCycle}`;
      const tokenBonus = isAnnual ? getAnnualTokenBonus(tier) : 0;

      return {
        amountText: `${formatMoney(displayAmount)} ${unitText}`,
        bonusTag: tokenBonus
          ? t('user.annual_token_bonus', { amount: tokenBonus })
          : undefined,
        description: isAnnual
          ? t('user.purchase_annual_desc')
          : t('user.purchase_monthly_desc'),
        details: tier ? getQuotaDetailItems(tier, t) : undefined,
        disabled: quotesLoading || !tier,
        key: optionKey,
        onClick: async () => {
          if (!tier) return;
          await run(optionKey, () => purchase(tier, months));
        },
        tag: discount ? t('user.about_discount', { discount }) : undefined,
        title: tierLabel,
      };
    }

    const amountText = proration
      ? t('user.upgrade_proration_text', {
          dailyAmount: formatMoney(proration.dailyAmount),
          days: proration.days,
          amount: formatMoney(proration.amount),
        })
      : t('user.order_settle');
    const disabled = quotesLoading || !tier || !proration;

    return {
      amountText,
      details: tier ? getQuotaDetailItems(tier, t) : undefined,
      disabled,
      key: option.key,
      onClick: async () => {
        if (!tier) return;
        await run(option.key, () => purchase(tier, option.months));
      },
      title: tier ? getPurchasableTierLabel(tier, t) : option.key,
    };
  });

  return (
    <PurchaseActionPopover
      buttonLabel={loadingPlan ? t('user.jumping') : t('user.upgrade_button')}
      headerContent={headerContent}
      hint={hint}
      loading={loadingPlan !== null}
      title={title}
      widthClassName="w-[560px]"
      options={menuOptions}
    />
  );
};

export function CheckUpdateAddonPurchase({
  addonQuota,
  billingConfig,
  dailyQuota,
  quota,
  quotes,
  quotesLoading,
  tier,
  tierExpiresAt,
}: {
  addonQuota: number;
  billingConfig: ReturnType<typeof useOrderBillingConfig>;
  dailyQuota: number;
  quota?: Quota;
  quotes?: OrderQuotes;
  quotesLoading: boolean;
  tier: Tier;
  tierExpiresAt?: string;
}) {
  const { t } = useTranslation();
  const { run, runningKey: loadingUnits } = useRunningKey<number>();
  const monthlyUnitPrice =
    billingConfig.checkUpdateAddon?.monthlyUnitPrice ?? 100;
  const eligibilityHint =
    billingConfig.checkUpdateAddon?.eligibilityMessage ??
    getDefaultCheckUpdateAddonEligibilityHint(t);
  const isExistingPaidService = tier !== 'free' && !!tierExpiresAt;
  const canPurchaseAddon = canPurchaseCheckUpdateAddon({
    dailyQuota,
    quota,
    tier,
    tierExpiresAt,
  });
  const menuOptions: PurchaseMenuOption[] = quotes?.checkUpdateAddons.length
    ? quotes.checkUpdateAddons.map((option) => {
        const units = option.checkUpdateAddonUnits ?? Number(option.key);
        const quote = option.quote;
        const proration = quote.proration;
        const disabled = quotesLoading || !quote;

        return {
          amountText: proration
            ? t('user.addon_proration_amount', {
                amount: formatMoney(proration.amount),
              })
            : `${formatMoney(quote.amount)} ${t('user.per_year')}`,
          disabled,
          key: option.key,
          onClick: () => run(units, () => purchaseCheckUpdateAddon(units)),
          title: `+${(addonQuota * units).toLocaleString()} ${t('user.per_day')}`,
        };
      })
    : [
        {
          amountText: quotesLoading
            ? t('user.quoting')
            : t('user.order_settle'),
          description: quotesLoading
            ? t('user.fetching_addon_quote')
            : undefined,
          disabled: true,
          key: 'unavailable',
          title: t('user.check_quota_addon'),
        },
      ];

  return (
    <div className="mt-4 flex flex-col gap-3 border-slate-200 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="font-medium text-slate-900 text-sm">
          {t('user.check_quota_addon')}
        </div>
        <div className="mt-0.5 text-slate-500 text-xs">
          {canPurchaseAddon
            ? t('user.addon_price_desc', {
                quota: addonQuota.toLocaleString(),
                price: formatMoney(monthlyUnitPrice),
              })
            : eligibilityHint}
        </div>
      </div>
      {canPurchaseAddon ? (
        <PurchaseActionPopover
          buttonLabel={
            loadingUnits ? t('user.jumping') : t('user.check_quota_addon')
          }
          hint={
            isExistingPaidService
              ? t('user.addon_proration_hint', {
                  quota: formatWan(addonQuota, t),
                  price: formatMoney(monthlyUnitPrice),
                })
              : t('user.addon_purchase_hint', {
                  quota: formatWan(addonQuota, t),
                  price: formatMoney(monthlyUnitPrice),
                })
          }
          loading={loadingUnits !== null}
          title={
            isExistingPaidService
              ? t('user.addon_title_with_expire', {
                  date: formatExpireDate(tierExpiresAt, t),
                })
              : t('user.addon_title')
          }
          options={menuOptions}
        />
      ) : (
        <Tooltip title={eligibilityHint}>
          <span>
            <Button className={purchaseButtonClassName} disabled>
              {t('user.check_quota_addon')}
            </Button>
          </span>
        </Tooltip>
      )}
    </div>
  );
}
