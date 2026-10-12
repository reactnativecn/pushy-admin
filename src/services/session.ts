/**
 * Auth session state, compatible with both auth transports:
 * - legacy: server returns a token at login; we persist it and send it via
 *   the x-accesstoken header on every request;
 * - httpOnly cookie (server rollout pending): login succeeds without a token
 *   in the body; the browser holds the session cookie, requests must be sent
 *   with credentials, and the client only remembers *that* a session exists.
 *
 * The mode is decided per login by what the server returns, so the frontend
 * works unchanged before, during, and after the server-side switch.
 */

import { safeStorage } from '@/utils/storage';

const TOKEN_KEY = 'token';
const AUTH_MODE_KEY = 'authMode';
const COOKIE_MODE = 'cookie';

// 存储不可用（隐私模式等）时 safeStorage 读到 null、写入静默失败，会话只留在内存里
let _token: string | null = safeStorage.get(TOKEN_KEY);
let _cookieSession = safeStorage.get(AUTH_MODE_KEY) === COOKIE_MODE;

export const getToken = () => _token;

export const usesCookieSession = () => _cookieSession;

/** Whether the user is believed to be logged in, regardless of transport. */
export const hasSession = () => !!_token || _cookieSession;

export const setToken = (token: string) => {
  _token = token;
  _cookieSession = false;
  safeStorage.set(TOKEN_KEY, token);
  safeStorage.remove(AUTH_MODE_KEY);
};

/** Record that the server established an httpOnly cookie session. */
export const markCookieSession = () => {
  _cookieSession = true;
  _token = null;
  safeStorage.set(AUTH_MODE_KEY, COOKIE_MODE);
  safeStorage.remove(TOKEN_KEY);
};

export const clearSession = () => {
  _token = null;
  _cookieSession = false;
  safeStorage.remove(TOKEN_KEY);
  safeStorage.remove(AUTH_MODE_KEY);
};
