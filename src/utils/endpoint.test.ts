import { describe, expect, test } from 'bun:test';
import { isEndpointSelectionUnchanged, normalizeEndpointUrl } from './endpoint';

describe('normalizeEndpointUrl', () => {
  test('canonicalizes HTTPS endpoints and preserves an API path', () => {
    expect(normalizeEndpointUrl(' https://example.com/api/ ')).toBe(
      'https://example.com/api',
    );
    expect(normalizeEndpointUrl('https://example.com/')).toBe(
      'https://example.com',
    );
  });

  test('allows plain HTTP only for local development hosts', () => {
    expect(normalizeEndpointUrl('http://localhost:9000/api')).toBe(
      'http://localhost:9000/api',
    );
    expect(normalizeEndpointUrl('http://127.0.0.1:9000')).toBe(
      'http://127.0.0.1:9000',
    );
    expect(normalizeEndpointUrl('http://example.com/api')).toBeNull();
  });

  test('rejects embedded credentials, query strings, fragments and non-http URLs', () => {
    expect(
      normalizeEndpointUrl('https://user:pass@example.com/api'),
    ).toBeNull();
    expect(normalizeEndpointUrl('https://example.com/api?token=1')).toBeNull();
    expect(normalizeEndpointUrl('https://example.com/api#section')).toBeNull();
    expect(normalizeEndpointUrl('ftp://example.com/api')).toBeNull();
    expect(normalizeEndpointUrl('not a url')).toBeNull();
  });
});

describe('isEndpointSelectionUnchanged', () => {
  test('treats the existing default and the same canonical endpoint as unchanged', () => {
    expect(isEndpointSelectionUnchanged(null, null)).toBe(true);
    expect(
      isEndpointSelectionUnchanged(
        'https://example.com/api/',
        'https://example.com/api',
      ),
    ).toBe(true);
  });

  test('requires reset for an invalid non-null endpoint left by an older release', () => {
    expect(isEndpointSelectionUnchanged('http://api.example.com', null)).toBe(
      false,
    );
    expect(isEndpointSelectionUnchanged('not a url', null)).toBe(false);
  });

  test('detects real changes between default and custom endpoints', () => {
    expect(isEndpointSelectionUnchanged(null, 'https://example.com/api')).toBe(
      false,
    );
    expect(isEndpointSelectionUnchanged('https://example.com/api', null)).toBe(
      false,
    );
  });
});
