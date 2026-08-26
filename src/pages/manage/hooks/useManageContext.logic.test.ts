import { describe, expect, test } from 'bun:test';
import type { Binding, Package } from '@/types';
import {
  getUnusedPackages,
  hasLegacyVersionBinding,
  shouldLoadDiffStatus,
} from './useManageContext.logic';

const makePackage = (id: number, versions?: Package['versions']) =>
  ({ id, name: `pkg-${id}`, hash: `h${id}`, versions }) as Package;

const makeBinding = (packageId: number, versionId = 1) =>
  ({ id: packageId * 10, packageId, versionId, rollout: 100 }) as Binding;

describe('hasLegacyVersionBinding', () => {
  test('only a present versions object counts', () => {
    expect(hasLegacyVersionBinding(makePackage(1))).toBe(false);
    expect(hasLegacyVersionBinding(makePackage(1, null))).toBe(false);
    expect(
      hasLegacyVersionBinding(makePackage(1, { id: 5 } as Package['versions'])),
    ).toBe(true);
  });
});

describe('getUnusedPackages', () => {
  const legacy = makePackage(1, { id: 5 } as Package['versions']);
  const bound = makePackage(2);
  const free = makePackage(3);
  const freeNull = makePackage(4, null);
  const packages = [legacy, bound, free, freeNull];

  test('returns nothing while bindings are loading', () => {
    expect(getUnusedPackages(packages, [], true)).toEqual([]);
  });

  test('excludes packages with a legacy version or a binding', () => {
    expect(getUnusedPackages(packages, [makeBinding(2)], false)).toEqual([
      free,
      freeNull,
    ]);
  });

  test('without bindings only legacy packages are excluded', () => {
    expect(getUnusedPackages(packages, [], false)).toEqual([
      bound,
      free,
      freeNull,
    ]);
  });
});

describe('shouldLoadDiffStatus', () => {
  const legacy = makePackage(1, { id: 5 } as Package['versions']);

  test('waits for both lists to finish loading', () => {
    expect(
      shouldLoadDiffStatus({
        bindings: [makeBinding(2)],
        bindingsLoading: true,
        packages: [],
        packagesLoading: false,
      }),
    ).toBe(false);
    expect(
      shouldLoadDiffStatus({
        bindings: [makeBinding(2)],
        bindingsLoading: false,
        packages: [],
        packagesLoading: true,
      }),
    ).toBe(false);
  });

  test('needs at least one binding or legacy-bound package', () => {
    expect(
      shouldLoadDiffStatus({
        bindings: [],
        bindingsLoading: false,
        packages: [makePackage(2)],
        packagesLoading: false,
      }),
    ).toBe(false);
    expect(
      shouldLoadDiffStatus({
        bindings: [],
        bindingsLoading: false,
        packages: [legacy],
        packagesLoading: false,
      }),
    ).toBe(true);
    expect(
      shouldLoadDiffStatus({
        bindings: [makeBinding(2)],
        bindingsLoading: false,
        packages: [],
        packagesLoading: false,
      }),
    ).toBe(true);
  });
});
