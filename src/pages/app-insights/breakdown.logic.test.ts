import { describe, expect, it } from 'bun:test';
import {
  failureDeviceLookup,
  highestFailureDimension,
  isKnownCarrier,
  parseFailureReason,
  summarizeBreakdown,
} from './breakdown.logic';
import type { AppEventBreakdownDay } from './types';

const breakdown = (
  overrides: Partial<AppEventBreakdownDay> = {},
): AppEventBreakdownDay => ({
  date: '2026-09-26',
  byOS: [],
  byReason: [],
  byCarrier: [],
  ...overrides,
});

describe('diagnostic report shares, not attempt failure rates', () => {
  it('keeps a patch failure followed by success as two reports', () => {
    const result = summarizeBreakdown([
      breakdown({
        byOS: [
          { type: 'patch_fail', hash: 'v1', name: 'V1', os: 'ios', count: 1 },
          {
            type: 'download_success',
            hash: 'v1',
            name: 'V1',
            os: 'ios',
            count: 1,
          },
        ],
      }),
    ]);
    expect(result.os[0]?.failureSamples).toBe(2);
    expect(result.os[0]?.failureRate).toBe(0.5);
    expect(highestFailureDimension(result.os)).toBeNull();
  });
  it('does not rank one failure or a zero-failure platform above sufficient evidence', () => {
    const result = summarizeBreakdown([
      breakdown({
        byOS: [
          {
            type: 'download_fail',
            hash: 'v1',
            name: 'V1',
            os: 'tiny',
            count: 1,
          },
          {
            type: 'download_fail',
            hash: 'v1',
            name: 'V1',
            os: 'ios',
            count: 10,
          },
          {
            type: 'download_success',
            hash: 'v1',
            name: 'V1',
            os: 'ios',
            count: 90,
          },
          {
            type: 'download_success',
            hash: 'v1',
            name: 'V1',
            os: 'android',
            count: 100,
          },
        ],
      }),
    ]);
    expect(highestFailureDimension(result.os)?.key).toBe('ios');
    expect(
      highestFailureDimension(result.os.filter((row) => row.key === 'android')),
    ).toBeNull();
  });
  it('normalizes legacy free-text reasons and keeps version and carrier scopes separate', () => {
    const days = [
      breakdown({
        byReason: [
          {
            type: 'download_fail',
            hash: 'v1',
            name: 'V1',
            reason: 'other:private-a',
            count: 2,
          },
          {
            type: 'patch_fail',
            hash: 'v2',
            name: null,
            reason: 'other:private-b',
            count: 3,
          },
        ],
        byCarrier: [{ type: 'download_fail', carrier: '电信', count: 5 }],
      }),
    ];
    const result = summarizeBreakdown(days);
    expect(result.failures).toBe(5);
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0]?.reason).toBe('other');
    expect(result.reasons[0]?.percent).toBe(100);
    expect(summarizeBreakdown(days, 'v1').failures).toBe(2);
    expect(summarizeBreakdown(days, 'v1').carriers).toEqual([]);
    expect(parseFailureReason('other:private')).toEqual({
      kind: 'other',
    });
    expect(parseFailureReason('timeout')).toEqual({
      kind: 'known',
      reason: 'timeout',
    });
    expect(isKnownCarrier('移动')).toBe(true);
    expect(summarizeBreakdown(undefined).reasons).toEqual([]);
  });
  it('ignores legacy rollback reason rows', () => {
    const result = summarizeBreakdown([
      breakdown({
        byReason: [
          {
            type: 'patch_fail',
            hash: 'v1',
            name: 'V1',
            reason: 'crc_mismatch',
            count: 4,
          },
          {
            type: 'rollback',
            hash: 'v1',
            name: 'V1',
            reason: 'empty',
            count: 40,
          },
        ],
      }),
    ]);
    expect(result.failures).toBe(4);
    expect(result.reasons.map((row) => row.reason)).toEqual(['crc_mismatch']);
  });
});

describe('failureDeviceLookup', () => {
  it('keeps window-wide device unions without adding them up', () => {
    const lookup = failureDeviceLookup({
      status: 'observed',
      limited: false,
      failures: 3,
      rollbacks: null,
      byOS: [
        { os: 'android 36', failures: 2, rollbacks: 1 },
        { os: 'android 35', failures: 0, rollbacks: null },
      ],
      byReason: [
        { reason: 'zip', devices: 2 },
        { reason: 'mystery_a', devices: 1 },
        { reason: 'mystery_b', devices: 1 },
      ],
      retentionDays: 35,
    });
    expect(lookup.failures).toBe(3);
    expect(lookup.rollbacks).toBeNull();
    expect(lookup.os.get('android 36')).toEqual({ failures: 2, rollbacks: 1 });
    // Zero is an expired key, not an observed fleet without failures.
    expect(lookup.os.get('android 35')).toEqual({
      failures: null,
      rollbacks: null,
    });
    expect(lookup.reasons.get('zip')).toBe(2);
    // Two unknown labels fold into "other"; their union is unknown.
    expect(lookup.reasons.get('other')).toBeNull();
  });

  it('treats a missing response as unknown', () => {
    const lookup = failureDeviceLookup(undefined);
    expect(lookup.failures).toBeNull();
    expect(lookup.os.size).toBe(0);
  });
});
