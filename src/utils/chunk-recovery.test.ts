import { describe, expect, test } from 'bun:test';
import { shouldReloadChunkError } from './chunk-recovery';

describe('shouldReloadChunkError', () => {
  test('allows one reload for each UI build', () => {
    expect(shouldReloadChunkError(null, '2026.8.31-a')).toBe(true);
    expect(shouldReloadChunkError('2026.8.31-a', '2026.8.31-a')).toBe(false);
    expect(shouldReloadChunkError('2026.8.31-a', '2026.9.1-b')).toBe(true);
  });
});
