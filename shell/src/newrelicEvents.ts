// ── Custom instrumentation helpers ───────────────────────────────────────────
// Side-effect free so modules exposed to remotes (e.g. the auth store) can import
// these without pulling in and initialising the Browser agent from newrelic.ts.

/**
 * Record the current route name so New Relic groups page views correctly.
 * Call this inside a React Router useEffect whenever the location changes.
 *
 * Usage:
 *   const location = useLocation();
 *   useEffect(() => setCurrentRoute(location.pathname), [location.pathname]);
 */
export function setCurrentRoute(path: string) {
  window.newrelic?.setCurrentRouteName?.(path);
}

/**
 * Record a custom business event visible in New Relic Insights / NRQL.
 *
 * Usage:
 *   recordEvent('Login', { userName: user.name });
 *   recordEvent('RemoteLoadFailure', { remote: 'music' });
 */
export function recordEvent(name: string, attributes: Record<string, string | number | boolean> = {}) {
  window.newrelic?.addPageAction?.(name, attributes);
}
