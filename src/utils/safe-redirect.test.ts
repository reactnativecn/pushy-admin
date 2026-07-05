import { describe, expect, it } from 'bun:test';
import {
  getUnauthenticatedRedirect,
  resolveLoginRedirect,
} from './safe-redirect';

describe('resolveLoginRedirect', () => {
  it('falls back to home when loginFrom is missing', () => {
    expect(resolveLoginRedirect(undefined)).toBe('/');
    expect(resolveLoginRedirect(null)).toBe('/');
    expect(resolveLoginRedirect('')).toBe('/');
  });

  it('rejects absolute URLs (open redirect)', () => {
    expect(resolveLoginRedirect('https://evil.example.com')).toBe('/');
    expect(resolveLoginRedirect('http://evil.example.com/apps')).toBe('/');
  });

  it('rejects protocol-relative URLs', () => {
    expect(resolveLoginRedirect('//evil.example.com')).toBe('/');
  });

  it('rejects javascript: and other non-path schemes', () => {
    expect(resolveLoginRedirect('javascript:alert(1)')).toBe('/');
  });

  it('collapses redirects back to the login page into home', () => {
    expect(resolveLoginRedirect('/login')).toBe('/');
    expect(resolveLoginRedirect('/login?loginFrom=%2Fapps')).toBe('/');
  });

  it('allows same-origin absolute paths, keeping their query', () => {
    expect(resolveLoginRedirect('/apps/3?tab=versions')).toBe(
      '/apps/3?tab=versions',
    );
    expect(resolveLoginRedirect('/audit-logs')).toBe('/audit-logs');
  });
});

describe('getUnauthenticatedRedirect', () => {
  it('does not redirect when already on the login page', () => {
    expect(getUnauthenticatedRedirect('/login', '')).toBeNull();
  });

  it('sends the home page straight to login without loginFrom', () => {
    expect(getUnauthenticatedRedirect('/', '')).toBe('/login');
  });

  it('preserves the attempted location in loginFrom', () => {
    expect(getUnauthenticatedRedirect('/apps/3', '?tab=versions')).toBe(
      `/login?loginFrom=${encodeURIComponent('/apps/3?tab=versions')}`,
    );
  });
});
