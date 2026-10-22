// Minimal ambient type for the New Relic browser agent attached to window.
// The full type surface is not shipped by the package; extend as needed.
interface Window {
  newrelic?: {
    setCurrentRouteName(name: string): void;
    addPageAction(name: string, attributes?: Record<string, string | number | boolean>): void;
    noticeError(error: Error | string, attributes?: Record<string, string | number | boolean>): void;
    setCustomAttribute(name: string, value: string | number | boolean): void;
  };
}
