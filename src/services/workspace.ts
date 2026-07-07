/**
 * Workspace (sub-account) selection state.
 *
 * The server resolves the active workspace from the `x-account-id` header:
 * absent → operate on the actor's own account (legacy behavior); present →
 * operate on that account, subject to the actor's membership role. We persist
 * the selection so a member stays in the chosen workspace across reloads.
 */

const WORKSPACE_KEY = 'workspaceAccountId';

let _accountId: number | null = null;

try {
  const raw = localStorage.getItem(WORKSPACE_KEY);
  const parsed = raw === null ? Number.NaN : Number(raw);
  _accountId = Number.isInteger(parsed) && parsed > 0 ? parsed : null;
} catch {
  // storage unavailable (private mode); selection stays in-memory only
}

/** The selected workspace account id, or null = own account. */
export const getWorkspaceAccountId = () => _accountId;

export const setWorkspaceAccountId = (accountId: number | null) => {
  _accountId = accountId;
  try {
    if (accountId === null) {
      localStorage.removeItem(WORKSPACE_KEY);
    } else {
      localStorage.setItem(WORKSPACE_KEY, String(accountId));
    }
  } catch {
    // in-memory only
  }
};

export const clearWorkspace = () => setWorkspaceAccountId(null);
