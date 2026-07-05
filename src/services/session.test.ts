import { beforeEach, describe, expect, it } from 'bun:test';
import {
  clearSession,
  getToken,
  hasSession,
  markCookieSession,
  setToken,
  usesCookieSession,
} from './session';

describe('session', () => {
  beforeEach(() => {
    clearSession();
  });

  it('starts without a session after clearing', () => {
    expect(getToken()).toBeNull();
    expect(usesCookieSession()).toBe(false);
    expect(hasSession()).toBe(false);
  });

  it('setToken enters legacy token mode and persists the token', () => {
    setToken('tok-1');

    expect(getToken()).toBe('tok-1');
    expect(usesCookieSession()).toBe(false);
    expect(hasSession()).toBe(true);
    expect(localStorage.getItem('token')).toBe('tok-1');
    expect(localStorage.getItem('authMode')).toBeNull();
  });

  it('markCookieSession enters cookie mode and drops any stored token', () => {
    setToken('tok-1');
    markCookieSession();

    expect(getToken()).toBeNull();
    expect(usesCookieSession()).toBe(true);
    expect(hasSession()).toBe(true);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('authMode')).toBe('cookie');
  });

  it('setToken after a cookie session switches back to token mode', () => {
    markCookieSession();
    setToken('tok-2');

    expect(getToken()).toBe('tok-2');
    expect(usesCookieSession()).toBe(false);
    expect(localStorage.getItem('authMode')).toBeNull();
  });

  it('clearSession removes both transports', () => {
    markCookieSession();
    clearSession();

    expect(hasSession()).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('authMode')).toBeNull();
  });
});
