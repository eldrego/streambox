import { BrowserAgent } from '@newrelic/browser-agent/loaders/browser-agent';

const accountID = import.meta.env.VITE_NEW_RELIC_ACCOUNT_ID;
const licenseKey = import.meta.env.VITE_NEW_RELIC_LICENSE_KEY;
const applicationID = import.meta.env.VITE_NEW_RELIC_APP_ID;
const agentID = import.meta.env.VITE_NEW_RELIC_AGENT_ID;
const trustKey = import.meta.env.VITE_NEW_RELIC_TRUST_KEY;

// Skip initialisation if credentials are not configured.
// This prevents errors in local dev before New Relic is set up.
if (licenseKey && applicationID && accountID) {
  new BrowserAgent({
    init: {
      distributed_tracing: { enabled: true },
      privacy: { cookies_enabled: true },
      ajax: { deny_list: ['bam.nr-data.net'] },
      // SPA monitoring tracks route changes and async interactions automatically
      soft_navigations: { enabled: true },
    },
    info: {
      beacon: 'bam.nr-data.net',
      errorBeacon: 'bam.nr-data.net',
      licenseKey,
      applicationID,
      sa: 1,
    },
    loader_config: {
      accountID,
      trustKey: trustKey || accountID,
      agentID: agentID || applicationID,
      licenseKey,
      applicationID,
    },
  });
}

export { setCurrentRoute, recordEvent } from './newrelicEvents';
