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

const TOKEN_KEY = 'token';
const AUTH_MODE_KEY = 'authMode';
const COOKIE_MODE = 'cookie';

let _token: string | null = null;
let _cookieSession = false;

try {
  _token = localStorage.getItem(TOKEN_KEY);
  _cookieSession = localStorage.getItem(AUTH_MODE_KEY) === COOKIE_MODE;
} catch {
  // storage unavailable (private mode); session stays in-memory only
}

export const getToken = () => _token;

export const usesCookieSession = () => _cookieSession;

/** Whether the user is believed to be logged in, regardless of transport. */
export const hasSession = () => !!_token || _cookieSession;

export const setToken = (token: string) => {
  _token = token;
  _cookieSession = false;
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(AUTH_MODE_KEY);
  } catch {
    // in-memory only
  }
};

/** Record that the server established an httpOnly cookie session. */
export const markCookieSession = () => {
  _cookieSession = true;
  _token = null;
  try {
    localStorage.setItem(AUTH_MODE_KEY, COOKIE_MODE);
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // in-memory only
  }
};

export const clearSession = () => {
  _token = null;
  _cookieSession = false;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(AUTH_MODE_KEY);
  } catch {
    // in-memory only
  }
};
