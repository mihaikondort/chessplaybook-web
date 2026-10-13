const STORAGE_KEY = 'cp_anonymous_id';

/**
 * Get or create a persistent anonymous user ID.
 * Stored in localStorage, survives browser restarts.
 */
export function getAnonymousId(): string {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
