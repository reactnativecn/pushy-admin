import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import i18n from 'i18next';
import '@/i18n';
import type { OrderQuotes } from './billing';
import {
  RenewalPurchaseButton,
  UpgradePurchaseControls,
} from './purchase-controls';

beforeEach(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
  global.ShadowRoot = class ShadowRoot {} as any;
});

describe('UpgradePurchaseControls', () => {
  afterEach(() => {
    cleanup();
  });

  const mockQuotes: OrderQuotes = {
    checkUpdateAddons: [],
    current: {
      checkUpdateAddonMonthlyPrice: 100,
      checkUpdateAddonUnits: 0,
    },
    renewals: [],
    upgrades: [
      {
        key: 'standard',
        months: 12,
        tier: 'standard',
        quote: {
          amount: 1600,
          billing: {
            annualPrice: 1600,
            billingCycle: 'year',
            billingMonths: 12,
            monthlyPrice: 200,
            requestedMonths: 12,
            switchedToAnnual: true,
          },
          tier: 'standard',
          type: 'buy',
        },
      },
      {
        key: 'premium',
        months: 12,
        tier: 'premium',
        quote: {
          amount: 3200,
          billing: {
            annualPrice: 3200,
            billingCycle: 'year',
            billingMonths: 12,
            monthlyPrice: 400,
            requestedMonths: 12,
            switchedToAnnual: true,
          },
          tier: 'premium',
          type: 'buy',
        },
      },
    ],
  };

  test('renders upgrade button for free accounts', () => {
    render(
      <ConfigProvider>
        <UpgradePurchaseControls
          currentTier="free"
          quotes={mockQuotes}
          quotesLoading={false}
        />
      </ConfigProvider>,
    );

    const upgradeBtn = screen.getByRole('button');
    expect(upgradeBtn).not.toBeNull();
  });

  test('renders monthly and annual upgrade options for free accounts', async () => {
    await i18n.changeLanguage('zh-CN');

    render(
      <ConfigProvider>
        <UpgradePurchaseControls
          currentTier="free"
          quotes={mockQuotes}
          quotesLoading={false}
        />
      </ConfigProvider>,
    );

    // Click button to open popover
    const upgradeBtn = screen.getByRole('button');
    fireEvent.click(upgradeBtn);

    // Verify popover defaults to monthly billing
    expect(screen.getByText('标准版')).not.toBeNull();
    expect(screen.getByText('￥200 / 月')).not.toBeNull();
    expect(screen.queryByText(/Token/, { selector: '.ant-tag' })).toBeNull();

    // Click annual billing tab in Segmented control
    const annualLabel = screen.getByText('年付（约6.7折，送 Token）');
    const annualInput = annualLabel.closest('label')?.querySelector('input');
    if (annualInput) {
      fireEvent.click(annualInput);
    } else {
      fireEvent.click(annualLabel);
    }

    // Verify popover updates to annual billing
    expect(screen.getByText('￥1600 / 年')).not.toBeNull();
    expect(screen.getAllByText('约6.7折优惠').length).toBeGreaterThan(0);
    expect(screen.getByText('🎁 赠送 $30 Token')).not.toBeNull();
    expect(screen.getByText('🎁 赠送 $100 Token')).not.toBeNull();
    expect(screen.getByText(/联系微信客服 sunnylqm 领取/)).not.toBeNull();
  });
});

describe('RenewalPurchaseButton', () => {
  afterEach(() => {
    cleanup();
  });

  const renewalQuotes = (
    tier: 'pro' | 'custom',
    annualPrice: number,
  ): OrderQuotes => ({
    checkUpdateAddons: [],
    current: { checkUpdateAddonMonthlyPrice: 0, checkUpdateAddonUnits: 0 },
    upgrades: [],
    renewals: [
      {
        key: 'month-1',
        months: 1,
        tier,
        quote: {
          amount: annualPrice / 8,
          billing: {
            annualPrice,
            billingCycle: 'month',
            billingMonths: 1,
            monthlyPrice: annualPrice / 8,
            requestedMonths: 1,
            switchedToAnnual: false,
          },
          tier,
          type: 'buy',
        },
      },
      {
        key: 'year',
        months: 12,
        tier,
        quote: {
          amount: annualPrice,
          billing: {
            annualPrice,
            billingCycle: 'year',
            billingMonths: 12,
            monthlyPrice: annualPrice / 8,
            requestedMonths: 12,
            switchedToAnnual: false,
          },
          tier,
          type: 'buy',
        },
      },
    ],
  });

  test('marks only the annual renewal of a gifting tier', async () => {
    await i18n.changeLanguage('zh-CN');
    render(
      <ConfigProvider>
        <RenewalPurchaseButton
          quotes={renewalQuotes('pro', 7200)}
          quotesLoading={false}
          tier="pro"
          tierExpiresAt="2027-01-01T00:00:00Z"
        />
      </ConfigProvider>,
    );
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getAllByText('🎁 赠送 $360 Token')).toHaveLength(1);
    expect(screen.getByText(/联系微信客服 sunnylqm 领取/)).not.toBeNull();
  });

  test('custom plans renew without a Token gift', async () => {
    await i18n.changeLanguage('zh-CN');
    render(
      <ConfigProvider>
        <RenewalPurchaseButton
          quotes={renewalQuotes('custom', 3000)}
          quotesLoading={false}
          tier="custom"
          tierExpiresAt="2027-01-01T00:00:00Z"
        />
      </ConfigProvider>,
    );
    fireEvent.click(screen.getByRole('button'));

    expect(screen.queryByText(/Token/)).toBeNull();
  });
});
