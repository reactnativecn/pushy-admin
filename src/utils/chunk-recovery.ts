export const CHUNK_ERROR_RELOAD_KEY = 'pushy_chunk_error_reload_attempted';

/**
 * Retry a stale chunk once per UI build. A later deployment has a different
 * build id and therefore gets its own recovery attempt even if the previous
 * marker is still present in the tab's session storage.
 */
export const shouldReloadChunkError = (
  attemptedVersion: string | null,
  currentVersion: string,
) => attemptedVersion !== currentVersion;
