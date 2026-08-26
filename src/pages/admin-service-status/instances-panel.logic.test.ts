import { describe, expect, test } from 'bun:test';
import type { SystemDeployStatus, SystemInstance } from '@/types';
import {
  buildInstanceRows,
  formatDateTime,
  getNodeVersion,
  isDeployBusy,
  pickNodeDeployStatus,
} from './instances-panel.logic';

const makeInstance = (
  id: string,
  role: SystemInstance['role'],
  version = '1.0.0',
) => ({ id, role, version, hostname: id }) as SystemInstance;

const makeStatus = (
  status: SystemDeployStatus['status'],
  updatedAt: string,
): SystemDeployStatus => ({
  commandId: `${status}-${updatedAt}`,
  action: 'update',
  status,
  fromVersion: '0.9.0',
  updatedAt,
});

describe('isDeployBusy', () => {
  test('in-progress statuses are busy, failed and missing are not', () => {
    expect(isDeployBusy(makeStatus('installing', 't'))).toBe(true);
    expect(isDeployBusy(makeStatus('restarting', 't'))).toBe(true);
    expect(isDeployBusy(makeStatus('failed', 't'))).toBe(false);
    expect(isDeployBusy(undefined)).toBe(false);
  });
});

describe('formatDateTime', () => {
  test('dashes for empty or unparsable input', () => {
    expect(formatDateTime(null)).toBe('-');
    expect(formatDateTime(undefined)).toBe('-');
    expect(formatDateTime('')).toBe('-');
    expect(formatDateTime('not a date')).toBe('-');
  });

  test('formats a valid timestamp with the runtime locale', () => {
    const value = '2026-04-05T06:07:08Z';
    expect(formatDateTime(value)).toBe(new Date(value).toLocaleString());
  });
});

describe('buildInstanceRows', () => {
  test('attaches deploy status by id and sorts by id', () => {
    const installing = makeStatus('installing', '2026-01-01T00:00:00Z');
    const rows = buildInstanceRows({
      data: [
        makeInstance('b-worker', 'worker'),
        makeInstance('a-server', 'server'),
      ],
      deployStatuses: { 'a-server': installing },
    });
    expect(rows.map((row) => row.id)).toEqual(['a-server', 'b-worker']);
    expect(rows[0]?.deployStatus).toBe(installing);
    expect(rows[1]?.deployStatus).toBeUndefined();
  });

  test('tolerates missing payload', () => {
    expect(buildInstanceRows(undefined)).toEqual([]);
    expect(buildInstanceRows({})).toEqual([]);
  });
});

describe('getNodeVersion', () => {
  test('prefers the server instance, otherwise the first row', () => {
    const rows = buildInstanceRows({
      data: [
        makeInstance('a-worker', 'worker', '2.0.0'),
        makeInstance('b-server', 'server', '1.5.0'),
      ],
    });
    expect(getNodeVersion(rows)).toBe('1.5.0');
    expect(getNodeVersion([makeInstance('w', 'worker', '3.0.0')])).toBe(
      '3.0.0',
    );
    expect(getNodeVersion([])).toBeUndefined();
  });
});

describe('pickNodeDeployStatus', () => {
  const rowsWith = (...statuses: Array<SystemDeployStatus | undefined>) =>
    statuses.map((deployStatus, index) => ({
      ...makeInstance(`i${index}`, 'worker'),
      deployStatus,
    }));

  test('returns undefined when no instance reports a status', () => {
    expect(
      pickNodeDeployStatus(rowsWith(undefined, undefined)),
    ).toBeUndefined();
  });

  test('in-progress beats failed regardless of recency', () => {
    const failed = makeStatus('failed', '2026-01-02T00:00:00Z');
    const restarting = makeStatus('restarting', '2026-01-01T00:00:00Z');
    const installing = makeStatus('installing', '2025-12-31T00:00:00Z');
    expect(pickNodeDeployStatus(rowsWith(failed, restarting))).toBe(restarting);
    expect(pickNodeDeployStatus(rowsWith(failed, restarting, installing))).toBe(
      installing,
    );
  });

  test('same priority falls back to the most recent update', () => {
    const older = makeStatus('failed', '2026-01-01T00:00:00Z');
    const newer = makeStatus('failed', '2026-01-03T00:00:00Z');
    expect(pickNodeDeployStatus(rowsWith(older, newer))).toBe(newer);
    expect(pickNodeDeployStatus(rowsWith(newer, older))).toBe(newer);
  });
});
