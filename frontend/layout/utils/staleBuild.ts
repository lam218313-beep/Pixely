const RELOAD_KEY = 'pixely_chunk_reload_at';

/** A lazy page whose file disappeared because a new version was deployed. */
export const isStaleBuildError = (error: Error | null | undefined) =>
  !!error && /dynamically imported module|Importing a module script failed|Failed to fetch dynamically/i.test(error.message);

/** Reload once to pick up the new build; returns false if it already tried in the last 10 s. */
export function reloadForNewBuild(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 10_000) return false; // already tried: don't loop
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch { /* storage blocked: still try once */ }
  window.location.reload();
  return true;
}
