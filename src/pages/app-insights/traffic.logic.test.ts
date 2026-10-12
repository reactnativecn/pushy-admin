import { describe, expect, it } from 'bun:test';
import { observationCount } from './logic';
import {
  normalizeOSVersion,
  summarizeTraffic,
  trafficWarnings,
} from './traffic.logic';
import type { AppTrafficDay } from './types';

const day = (
  date: string,
  overrides: Partial<AppTrafficDay> = {},
): AppTrafficDay => ({
  date,
  requests: 0,
  dau: 0,
  hourly: [],
  hit: {},
  ipVersion: {},
  hosts: {},
  carriers: {},
  packages: [],
  ...overrides,
});

describe('complete-day means and missing observations', () => {
  it('includes valid zero days in both means, excludes today and future days', () => {
    const days = Array.from({ length: 7 }, (_, i) =>
      day(`2026-09-${20 + i}`, {
        requests: i === 0 ? 100 : 0,
        dau: i === 0 ? 100 : 0,
        requestsStatus: 'observed',
        dauStatus: 'observed',
      }),
    );
    const result = summarizeTraffic(
      [
        ...days,
        day('2026-09-27', { requests: 999, dau: 999 }),
        day('2026-09-28', { requests: 999, dau: 999 }),
      ],
      '2026-09-27',
    );
    expect(result.averageDau).toBe(100 / 7);
    expect(result.averageDailyRequests).toBe(100 / 7);
    expect(result.dauSampleDays).toBe(7);
    expect(result.requestSampleDays).toBe(7);
    expect(result.completedDays).toBe(7);
  });
  it('does not turn unavailable days into observed zeroes', () => {
    const result = summarizeTraffic(
      [
        day('2026-09-24', {
          requests: 10,
          dau: 5,
          requestsStatus: 'observed',
          dauStatus: 'observed',
        }),
        day('2026-09-25', {
          requestsStatus: 'unavailable',
          dauStatus: 'unavailable',
        }),
        day('2026-09-26', {
          requestsStatus: 'observed',
          dauStatus: 'observed',
        }),
      ],
      '2026-09-27',
    );
    expect(result.averageDailyRequests).toBe(5);
    expect(result.averageDau).toBe(2.5);
    expect(result.dauSampleDays).toBe(2);
    expect(result.completedDays).toBe(3);
    expect(result.daily[1]?.dau).toBeNull();
    expect(observationCount(9, 'unavailable')).toBeNull();
    expect(observationCount(0, 'observed')).toBe(0);
    expect(observationCount(Number.NaN)).toBeNull();
  });
  it('respects a supplied business today instead of browser or Beijing date', () => {
    const result = summarizeTraffic(
      [day('2026-09-26', { dau: 9 })],
      '2026-09-26',
    );
    expect(result.today?.dau).toBe(9);
    expect(result.averageDau).toBeNull();
  });
  it('maps Android API levels and folds iOS patch versions', () => {
    expect(normalizeOSVersion('android 34')).toBe('android 14');
    expect(normalizeOSVersion('android 32')).toBe('android 12');
    expect(normalizeOSVersion('android 99')).toBe('android API 99');
    expect(normalizeOSVersion('ios 17.5.1')).toBe('ios 17.5');
    expect(normalizeOSVersion('ios 18')).toBe('ios 18.0');
    expect(normalizeOSVersion('tvos 18.0')).toBe('tvos 18.0');
    expect(normalizeOSVersion('harmony 12')).toBe('harmony 5.0.0');
    expect(normalizeOSVersion('harmony 20')).toBe('harmony 6.0.0');
    expect(normalizeOSVersion('harmony 24')).toBe('harmony 6.1.1');
    expect(normalizeOSVersion('harmony 99')).toBe('harmony API 99');
    expect(normalizeOSVersion('unknown')).toBe('unknown');
  });
  it('groups OS labels into platforms and ranks OS versions', () => {
    const result = summarizeTraffic(
      [
        day('2026-09-26', {
          os: { 'android 34': 30, 'ios 17.5': 10 },
        }),
        day('2026-09-27', { os: { 'android 35': 20, 'ios 17.5.1': 5 } }),
      ],
      '2026-09-27',
    );
    expect(result.hasClientInfo).toBe(true);
    expect(result.platforms.map((row) => [row.key, row.count])).toEqual([
      ['android', 50],
      ['ios', 15],
    ]);
    expect(result.osVersions.map((row) => [row.key, row.count])).toEqual([
      ['android 14', 30],
      ['android 15', 20],
      ['ios 17.5', 15],
    ]);
    expect(summarizeTraffic([day('2026-09-27')]).hasClientInfo).toBe(false);
  });
  it('is empty safe without fabricating means or device peaks', () => {
    const result = summarizeTraffic(undefined);
    expect(result.averageDau).toBeNull();
    expect(result.averageDailyRequests).toBeNull();
    expect(result.peakDau).toBeNull();
    expect(result.today).toBeNull();
    expect(result.hourlyDays).toEqual([]);
  });
  it('keeps legacy positive device observations but does not invent observed zeroes', () => {
    const result = summarizeTraffic(
      [day('2026-09-25', { dau: 10 }), day('2026-09-26')],
      '2026-09-27',
    );
    expect(result.averageDau).toBe(10);
    expect(result.dauSampleDays).toBe(1);
    expect(result.daily[1]?.dau).toBeNull();
  });
});

describe('package observations and refusals', () => {
  it('reports partial and expired data rather than a whole-window device count', () => {
    const result = summarizeTraffic(
      [
        day('2026-09-01', {
          requests: 100,
          packages: [
            {
              packageVersion: '1',
              requests: 100,
              devices: null,
              devicesStatus: 'expired',
            },
          ],
        }),
        day('2026-09-26', {
          requests: 20,
          packageDevicesLimited: true,
          packages: [
            {
              packageVersion: '1',
              requests: 20,
              devices: 3,
              devicesStatus: 'partial',
            },
          ],
        }),
        day('2026-09-27', {
          requests: 10,
          packages: [
            {
              packageVersion: '1',
              requests: 10,
              devices: 2,
              devicesStatus: 'observed',
            },
          ],
        }),
      ],
      '2026-09-27',
    );
    expect(result.packages[0]).toMatchObject({
      requests: 130,
      peakDevices: 3,
      percent: 100,
      observedDays: 2,
      availableStart: '2026-09-26',
      availableEnd: '2026-09-27',
      partial: true,
      expiredDays: 1,
    });
  });
  it('does not interpret missing or legacy zero device estimates as no users', () => {
    const result = summarizeTraffic([
      day('2026-09-26', {
        packages: [{ packageVersion: 'old', requests: 3, devices: 0 }],
      }),
    ]);
    expect(result.packages[0]?.peakDevices).toBeNull();
    expect(result.packages[0]?.unavailableDays).toBe(1);
  });
  it('retains refusal detail and request-based shares', () => {
    const result = summarizeTraffic([
      day('2026-09-26', {
        requests: 10,
        hit: { blocked: 2, unknown_package: 1, full: 7 },
        refused: [{ outcome: 'blocked', packageVersion: '1.0', requests: 2 }],
        hourly: [3, 7],
        carriers: { 电信: 10 },
      }),
    ]);
    expect(trafficWarnings(result.hit)).toEqual(['blocked', 'unknown_package']);
    expect(result.refused.blocked).toEqual([
      { packageVersion: '1.0', requests: 2 },
    ]);
    expect(result.carriers[0]?.percent).toBe(100);
  });
});
