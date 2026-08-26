import { describe, expect, test } from 'bun:test';
import {
  canForceBootAll,
  canToggleForceBoot,
  getBindingRolloutState,
  getDepsChangedPackages,
  getDepsChangeSummary,
  getDepsChanges,
  ROLLOUT_PERCENTAGES,
} from './bind-package.logic';

const NEW_RNU = { 'react-native-update': '10.52.1' };
const OLD_RNU = { 'react-native-update': '10.40.0' };

describe('getDepsChanges', () => {
  test('returns null when either side has no deps', () => {
    expect(getDepsChanges(undefined, { a: '1' })).toBeNull();
    expect(getDepsChanges({ a: '1' }, undefined)).toBeNull();
  });

  test('classifies added / removed / changed and skips unchanged, sorted by name', () => {
    const rows = getDepsChanges(
      { zeta: '1.0.0', react: '18.2.0', gone: '0.1.0' },
      { react: '19.0.0', zeta: '1.0.0', alpha: '2.0.0' },
    );
    expect(rows).toEqual([
      {
        key: 'alpha',
        dependency: 'alpha',
        oldVersion: '-',
        newVersion: '2.0.0',
        changeType: 'added',
      },
      {
        key: 'gone',
        dependency: 'gone',
        oldVersion: '0.1.0',
        newVersion: '-',
        changeType: 'removed',
      },
      {
        key: 'react',
        dependency: 'react',
        oldVersion: '18.2.0',
        newVersion: '19.0.0',
        changeType: 'changed',
      },
    ]);
  });

  test('identical deps produce an empty list, not null', () => {
    expect(getDepsChanges({ a: '1' }, { a: '1' })).toEqual([]);
  });
});

describe('getDepsChangeSummary', () => {
  test('counts each change type', () => {
    const rows = getDepsChanges(
      { a: '1', b: '1', c: '1' },
      { a: '2', b: '1', d: '1', e: '1' },
    );
    expect(getDepsChangeSummary(rows ?? [])).toEqual({
      added: 2,
      removed: 1,
      changed: 1,
    });
    expect(getDepsChangeSummary([])).toEqual({
      added: 0,
      removed: 0,
      changed: 0,
    });
  });
});

describe('getDepsChangedPackages', () => {
  test('keeps only packages whose deps differ from the version', () => {
    const same = { id: 1, name: 'same', deps: { a: '1' } };
    const differs = { id: 2, name: 'differs', deps: { a: '2' } };
    const noDeps = { id: 3, name: 'no-deps' };
    const result = getDepsChangedPackages([same, differs, noDeps], { a: '1' });
    expect(result).toHaveLength(1);
    expect(result[0]?.pkg).toBe(differs);
    expect(result[0]?.changes[0]).toMatchObject({
      dependency: 'a',
      changeType: 'changed',
    });
  });

  test('no version deps means nothing to confirm', () => {
    expect(
      getDepsChangedPackages([{ id: 1, name: 'x', deps: { a: '1' } }]),
    ).toEqual([]);
  });
});

describe('getBindingRolloutState', () => {
  test('missing or 100 rollout is a full release with no staged options', () => {
    for (const rollout of [undefined, null, 100]) {
      const state = getBindingRolloutState(rollout);
      expect(state.isFull).toBe(true);
      expect(state.stagedOptions).toEqual([]);
    }
  });

  test('partial rollout offers only the larger percentages', () => {
    expect(getBindingRolloutState(10)).toEqual({
      isFull: false,
      rolloutNumber: 10,
      stagedOptions: [20, 50],
    });
    expect(getBindingRolloutState(0).stagedOptions).toEqual(
      ROLLOUT_PERCENTAGES,
    );
    expect(getBindingRolloutState(3).stagedOptions).toEqual([5, 10, 20, 50]);
  });

  test('at or above 50% only the full release remains', () => {
    expect(getBindingRolloutState(50)).toEqual({
      isFull: false,
      rolloutNumber: 50,
      stagedOptions: [],
    });
    expect(getBindingRolloutState(75).stagedOptions).toEqual([]);
  });
});

describe('force boot gating', () => {
  test('toggle is offered for supported packages or when already on', () => {
    expect(canToggleForceBoot(NEW_RNU, false)).toBe(true);
    expect(canToggleForceBoot(OLD_RNU, false)).toBe(false);
    expect(canToggleForceBoot(OLD_RNU, true)).toBe(true);
    expect(canToggleForceBoot(undefined, false)).toBe(false);
  });

  test('bulk force boot needs every package to support it', () => {
    expect(
      canForceBootAll([
        { id: 1, name: 'a', deps: NEW_RNU },
        { id: 2, name: 'b', deps: NEW_RNU },
      ]),
    ).toBe(true);
    expect(
      canForceBootAll([
        { id: 1, name: 'a', deps: NEW_RNU },
        { id: 2, name: 'b', deps: OLD_RNU },
      ]),
    ).toBe(false);
    expect(canForceBootAll([{ id: 1, name: 'a' }])).toBe(false);
  });
});
