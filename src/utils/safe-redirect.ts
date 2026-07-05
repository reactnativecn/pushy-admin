const HOME_PATH = '/';
const LOGIN_PATH = '/login';

/**
 * Resolve a post-login redirect target from an untrusted `loginFrom` value.
 * Only same-origin absolute paths are allowed (open-redirect protection), and
 * targets pointing back at the login page collapse to home. Shared by the
 * login flow (auth.ts) and the public-only route loader (router.tsx).
 */
export function resolveLoginRedirect(loginFrom?: string | null) {
  if (!loginFrom?.startsWith('/') || loginFrom.startsWith('//')) {
    return HOME_PATH;
  }
  if (loginFrom === LOGIN_PATH || loginFrom.startsWith(`${LOGIN_PATH}?`)) {
    return HOME_PATH;
  }
  return loginFrom;
}

/**
 * Decide where an unauthenticated visitor should be redirected, preserving
 * the attempted location in `loginFrom` so login can send them back.
 * Returns null when no redirect is needed (already on the login page).
 */
export function getUnauthenticatedRedirect(pathname: string, search: string) {
  if (pathname === LOGIN_PATH) {
    return null;
  }
  if (pathname === HOME_PATH) {
    return LOGIN_PATH;
  }
  return `${LOGIN_PATH}?loginFrom=${encodeURIComponent(pathname + search)}`;
}
