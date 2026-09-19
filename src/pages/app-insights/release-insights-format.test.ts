import { describe, expect, test } from 'bun:test';
import {
  observationBytes,
  observationNumber,
  observationPercent,
} from './release-insights-format';

describe('release insight missingness', () => {
  test('missing is not zero', () => {
    expect(observationNumber(null, 'missing')).toBe('missing');
    expect(observationNumber(undefined, 'missing')).toBe('missing');
    expect(observationNumber(0, 'missing')).toBe('0');
  });
  test('a real zero hit ratio remains visible', () => {
    expect(observationPercent(0, 'missing')).toBe('0.0%');
    expect(observationPercent(null, 'missing')).toBe('missing');
  });
  test('negative savings are not clamped', () => {
    expect(observationPercent(-0.5, 'missing')).toBe('-50.0%');
  });
  test('invalid size is not represented as a free patch', () => {
    expect(observationBytes(null, 'missing')).toBe('missing');
    expect(observationBytes(0, 'missing')).toBe('missing');
    expect(observationBytes(1024, 'missing')).toBe('1.0 KiB');
  });
});
