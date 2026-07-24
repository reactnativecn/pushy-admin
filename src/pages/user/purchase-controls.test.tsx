import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import i18n from 'i18next';
import '@/i18n';
import type { OrderQuotes } from './billing';
import { UpgradePurchaseControls } from './purchase-controls';

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

    // Click annual billing tab in Segmented control
    const annualLabel = screen.getByText('年付（约6.7折）');
    const annualInput = annualLabel.closest('label')?.querySelector('input');
    if (annualInput) {
      fireEvent.click(annualInput);
    } else {
      fireEvent.click(annualLabel);
    }

    // Verify popover updates to annual billing
    expect(screen.getByText('￥1600 / 年')).not.toBeNull();
    expect(screen.getAllByText('约6.7折优惠').length).toBeGreaterThan(0);
  });
});
