declare global {
  interface Window {
    stonks?: { event: (name: string, props?: Record<string, string>) => void };
  }
}

/**
 * Sends a custom event to onedollarstats. Props must not contain `;` or `=`, which the
 * service uses as separators. A no-op when the script is blocked or not loaded yet.
 */
export function trackEvent(name: string, props?: Record<string, string>) {
  if (typeof window === "undefined") {
    return;
  }
  window.stonks?.event(name, props);
}
