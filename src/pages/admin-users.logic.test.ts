import { afterEach, describe, expect, setSystemTime, test } from 'bun:test';
import dayjs from 'dayjs';
import { quotas } from '@/constants/quotas';
import type { AdminUser } from '@/types';
import {
  defaultPremiumQuotaText,
  expiryShortcutDays,
  FILTER_KEYS,
  getExtendedTierExpiry,
  getInitialQuotaValue,
  getTierOptions,
  parseQuotaInput,
  SORTABLE_COLUMNS,
  statusMeta,
} from './admin-users.logic';

const t = (key: string) => key;

const makeUser = (overrides: Partial<AdminUser> = {}): AdminUser => ({
  id: 1,
  email: 'a@b.c',
  name: 'a',
  status: 'normal',
  tier: 'free',
  ...overrides,
});

describe('table config', () => {
  test('sortable columns and filter keys match the server contract', () => {
    expect([...SORTABLE_COLUMNS].sort()).toEqual(
      [
        'createdAt',
        'email',
        'id',
        'name',
        'status',
        'tier',
        'tierExpiresAt',
      ].sort(),
    );
    expect(FILTER_KEYS).toEqual(['status', 'tier']);
  });

  test('tier options cover every tier including custom', () => {
    expect(getTierOptions(t).map((option) => option.value)).toEqual([
      'free',
      'standard',
      'premium',
      'pro',
      'vip1',
      'vip2',
      'vip3',
      'custom',
    ]);
    expect(expiryShortcutDays).toEqual([7, 30, 365]);
  });
});

describe('statusMeta', () => {
  test('maps status to colour class and label', () => {
    expect(statusMeta('unverified', t)).toEqual({
      cls: 'text-orange-500',
      label: 'admin_users.status_unverified',
    });
    expect(statusMeta('dormant', t)).toEqual({
      cls: 'text-gray-400',
      label: 'admin_users.status_dormant',
    });
  });

  test('anything else is treated as normal', () => {
    const normal = {
      cls: 'text-green-600',
      label: 'admin_users.status_normal',
    };
    expect(statusMeta('normal', t)).toEqual(normal);
    expect(statusMeta(null, t)).toEqual(normal);
    expect(statusMeta(undefined, t)).toEqual(normal);
  });
});

describe('getInitialQuotaValue', () => {
  test('pretty-prints an existing quota', () => {
    const quota = { ...quotas.free, app: 99 };
    expect(getInitialQuotaValue(makeUser({ quota }))).toBe(
      JSON.stringify(quota, null, 2),
    );
  });

  test('custom tier without quota gets the premium template', () => {
    expect(getInitialQuotaValue(makeUser({ tier: 'custom' }))).toBe(
      defaultPremiumQuotaText,
    );
    expect(defaultPremiumQuotaText).toBe(
      JSON.stringify(quotas.premium, null, 2),
    );
  });

  test('other tiers without quota start empty', () => {
    expect(getInitialQuotaValue(makeUser({ tier: 'pro', quota: null }))).toBe(
      '',
    );
  });
});

describe('parseQuotaInput', () => {
  test('blank input clears the custom quota', () => {
    expect(parseQuotaInput('')).toEqual({ quota: null });
    expect(parseQuotaInput('   \n')).toEqual({ quota: null });
  });

  test('valid JSON is returned as the quota', () => {
    expect(parseQuotaInput('{"app": 5, "pv": 100}')).toEqual({
      quota: { app: 5, pv: 100 },
    });
  });

  test('invalid JSON is rejected', () => {
    expect(parseQuotaInput('{app: 5}')).toBeNull();
    expect(parseQuotaInput('not json')).toBeNull();
  });
});

describe('getExtendedTierExpiry', () => {
  afterEach(() => {
    setSystemTime(null);
  });

  test('extends an existing valid expiry', () => {
    const base = dayjs('2026-01-10T00:00:00');
    expect(getExtendedTierExpiry(base, 30).isSame(base.add(30, 'day'))).toBe(
      true,
    );
    expect(
      getExtendedTierExpiry('2026-01-10T00:00:00', 7).isSame(
        base.add(7, 'day'),
      ),
    ).toBe(true);
  });

  test('missing or invalid expiry counts from now', () => {
    setSystemTime(new Date('2026-03-01T00:00:00Z'));
    const expected = dayjs().add(365, 'day');
    expect(getExtendedTierExpiry(null, 365).isSame(expected)).toBe(true);
    expect(getExtendedTierExpiry(undefined, 365).isSame(expected)).toBe(true);
    expect(getExtendedTierExpiry('garbage', 365).isSame(expected)).toBe(true);
  });
});
