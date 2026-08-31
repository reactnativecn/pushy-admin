import { describe, expect, test } from 'bun:test';
import { symbolicateStack } from './symbolicate-stack';

const sourceMap = JSON.stringify({
  version: 3,
  file: 'index.bundle',
  sources: ['src/app.ts'],
  sourcesContent: ['const ready = true;\nthrow new Error("boom");'],
  names: ['submitOrder'],
  mappings: 'AAAAA;AACAA',
});

describe('symbolicateStack', () => {
  test('maps ordinary Metro frames and exposes a bounded source snippet', () => {
    const result = symbolicateStack(
      'TypeError: boom\n    at minified (index.bundle:2:1)',
      sourceMap,
    );
    expect(result.stack).toContain('at submitOrder (src/app.ts:2:1)');
    expect(result.mappedFrames).toBe(1);
    expect(result.totalFrames).toBe(1);
    expect(result.firstSnippet?.lines[1]).toEqual({
      number: 2,
      text: 'throw new Error("boom");',
    });
  });

  test('keeps Hermes bytecode offsets zero-based', () => {
    const result = symbolicateStack(
      'Error: boom\n    at minified (address at index.android.bundle:1:0)',
      sourceMap,
    );
    expect(result.stack).toContain('at submitOrder (src/app.ts:1:1)');
    expect(result.mappedFrames).toBe(1);
  });

  test('preserves lines that have no source-map match', () => {
    const raw = 'Error: boom\n    at native (native)';
    const result = symbolicateStack(raw, sourceMap);
    expect(result.stack).toBe(raw);
    expect(result.totalFrames).toBe(0);
  });
});
