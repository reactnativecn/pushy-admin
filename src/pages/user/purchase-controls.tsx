import { DownOutlined } from '@ant-design/icons';
import { Button, Popover, Tag, Tooltip } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Quota, Tier } from '@/types';
import { ANNUAL_BILLING_MONTHS } from '@/utils/billing';
import { cn } from '@/utils/helper';
import {
  canPurchaseCheckUpdateAddon,
  formatDiscount,
  formatExpireDate,
  formatMoney,
  formatRenewedExpireDate,
  formatWan,
  getDefaultCheckUpdateAddonEligibilityHint,
  getPurchasableTierLabel,
  getQuotaDetailItems,
  getRemainingBillableDays,
  isPurchasableTier,
  type OrderQuotes,
  type PurchasableTier,
  purchase,
  purchaseCheckUpdateAddon,
  type useOrderBillingConfig,
} from './billing';

const purchaseButtonClassName = 'w-full justify-center sm:w-[160px]';

export type PurchaseMenuOption = {
  amountText: string;
  description?: string;
  details?: Array<{
    label: string;
    value: string;
  }>;
  disabled?: boolean;
  formula?: string;
  key: string;
  onClick?: () => Promise<void>;
  tag?: string;
  title: string;
};

function PurchaseActionPopover({
  buttonLabel,
  emptyText,
  hint,
  loading,
  title,
  titleNote,
  widthClassName = 'w-[340px]',
  options,
}: {
  buttonLabel: string;
  emptyText?: string;
  hint?: string;
  loading: boolean;
  title?: string;
  titleNote?: string;
  widthClassName?: string;
  options: PurchaseMenuOption[];
}) {
  const { t } = useTranslation();
  const resolvedEmptyText = emptyText ?? t('user.addon_empty');

  const content = (
    <div
      className={cn(
        'max-h-[70vh] max-w-[calc(100vw-32px)] overflow-y-auto pr-1',
        widthClassName,
      )}
    >
      {title && (
        <div className="px-2">
          <div className="font-semibold text-slate-900 text-sm">{title}</div>
          {titleNote && (
            <div className="mt-0.5 text-slate-500 text-xs">{titleNote}</div>
          )}
        </div>
      )}
      {hint && (
        <div className="px-2 pt-1 pb-2 text-slate-500 text-xs leading-relaxed">
          {hint}
        </div>
      )}
      <div className="flex flex-col gap-1">
        {options.length > 0 ? (
          options.map((option) => (
            <button
              className={cn(
                'w-full rounded border border-transparent px-3 py-2 text-left transition',
                option.disabled || loading
                  ? 'cursor-not-allowed text-slate-400'
                  : 'cursor-pointer hover:border-blue-200 hover:bg-blue-50',
              )}
              disabled={option.disabled || loading}
              key={option.key}
              onClick={async (event) => {
                event.preventDefault();
                event.stopPropagation();
                await option.onClick?.();
              }}
              type="button"
            >
              <div className="flex min-w-0 items-center justify-between gap-3">
                <span
                  className={cn(
                    'font-medium',
                    option.disabled || loading
                      ? 'text-slate-400'
                      : 'text-slate-900',
                  )}
                >
                  {option.title}
                </span>
                <span
                  className={cn(
                    'min-w-0 text-right font-semibold',
                    option.disabled || loading
                      ? 'text-slate-400'
                      : 'text-slate-900',
                  )}
                >
                  {option.amountText}
                </span>
              </div>
              {(option.description || option.tag) && (
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-xs">
                  {option.description && (
                    <span className="text-slate-500">{option.description}</span>
                  )}
                  {option.tag && (
                    <Tag color="gold" className="m-0">
                      {option.tag}
                    </Tag>
                  )}
                </div>
              )}
              {option.details && (
                <div
                  className={cn(
                    'mt-2 grid gap-1.5',
                    option.details.length >= 4 ? 'grid-cols-4' : 'grid-cols-3',
                  )}
                >
                  {option.details.map((detail) => (
                    <div
                      className="rounded bg-slate-50 px-2 py-1"
                      key={detail.label}
                    >
                      <div className="text-[10px] text-slate-400">
                        {detail.label}
                      </div>
                      <div
                        className={cn(
                          'mt-0.5 truncate font-semibold text-sm tabular-nums',
                          option.disabled || loading
                            ? 'text-slate-400'
                            : 'text-primary',
                        )}
                      >
                        {detail.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {option.formula && (
                <div className="mt-2 rounded bg-slate-50 px-2 py-1 text-[11px] text-slate-500 tabular-nums">
                  {option.formula}
                </div>
              )}
            </button>
          ))
        ) : (
          <div className="px-2 py-3 text-center text-slate-500 text-xs">
            {resolvedEmptyText}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      placement="bottomLeft"
      trigger={['hover', 'click']}
    >
      <Button className={purchaseButtonClassName} loading={loading}>
        <span className="inline-flex items-center gap-2">
          {buttonLabel}
          <DownOutlined className="text-[10px]" />
        </span>
      </Button>
    </Popover>
  );
}

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
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
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
        const monthlyTotal =
          billing && isAnnual
            ? billing.monthlyPrice * billing.billingMonths
            : 0;

        return {
          amountText: formatMoney(option.quote.amount),
          description: `${t('user.renew_after_expire')} ${formatRenewedExpireDate(
            {
              expiresAt: tierExpiresAt,
              months,
              now: serverTime,
            },
            t,
          )}`,
          key: option.key,
          onClick: async () => {
            setLoadingPlan(option.key);
            try {
              await purchase(tier, months);
            } finally {
              setLoadingPlan(null);
            }
          },
          tag:
            billing && isAnnual && monthlyTotal > billing.annualPrice
              ? t('user.about_discount', {
                  discount: formatDiscount(
                    (billing.annualPrice / monthlyTotal) * 10,
                  ),
                })
              : undefined,
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

  return (
    <PurchaseActionPopover
      buttonLabel={loadingPlan ? t('user.jumping') : t('user.renew')}
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
  const [loadingTier, setLoadingTier] = useState<PurchasableTier | null>(null);
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
      ? t('user.upgrade_hint_free')
      : t('user.upgrade_hint_paid');

  const menuOptions: PurchaseMenuOption[] = upgradeOptions.map((option) => {
    const quote = option.quote;
    const proration = quote.proration;
    const tier = isPurchasableTier(option.tier) ? option.tier : undefined;
    const amountText =
      currentTier === 'free'
        ? `${t('user.annual_pay')} ${formatMoney(quote.amount)}`
        : proration
          ? t('user.upgrade_proration_text', {
              dailyAmount: formatMoney(proration.dailyAmount),
              days: proration.days,
              amount: formatMoney(proration.amount),
            })
          : t('user.order_settle');
    const disabled =
      quotesLoading || !tier || (currentTier !== 'free' && !proration);

    return {
      amountText,
      description:
        currentTier === 'free' ? t('user.purchase_after_pay') : undefined,
      details: tier ? getQuotaDetailItems(tier, t) : undefined,
      disabled,
      key: option.key,
      onClick: async () => {
        if (!tier) return;
        setLoadingTier(tier);
        try {
          await purchase(tier, option.months);
        } finally {
          setLoadingTier(null);
        }
      },
      title: tier ? getPurchasableTierLabel(tier, t) : option.key,
    };
  });

  return (
    <PurchaseActionPopover
      buttonLabel={loadingTier ? t('user.jumping') : t('user.upgrade_button')}
      hint={hint}
      loading={loadingTier !== null}
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
  const [loadingUnits, setLoadingUnits] = useState<number | null>(null);
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
          onClick: async () => {
            setLoadingUnits(units);
            try {
              await purchaseCheckUpdateAddon(units);
            } finally {
              setLoadingUnits(null);
            }
          },
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
