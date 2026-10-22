import { Component, Suspense, lazy } from 'react';
import type { ComponentType, ErrorInfo, LazyExoticComponent, ReactNode } from 'react';
import { getRemote } from 'virtual:__federation__';
import { recordEvent } from '../newrelic';

type Props = {
  remote: string;
  module: string;
};

type ErrorBoundaryProps = {
  remote: string;
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

class RemoteErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    recordEvent('RemoteLoadFailure', {
      remote: this.props.remote,
      message: error.message,
      componentStack: info.componentStack ?? '',
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert">
          Failed to load <strong>{this.props.remote}</strong>. Please refresh the page.
        </div>
      );
    }
    return this.props.children;
  }
}

// lazy() must be called once per remote module, not on every render — a new lazy
// component each render makes React unmount, re-fetch and remount the remote.
const remoteComponents = new Map<string, LazyExoticComponent<ComponentType>>();

function getRemoteComponent(remote: string, module: string) {
  const key = `${remote}/${module}`;
  let RemoteComponent = remoteComponents.get(key);

  if (!RemoteComponent) {
    RemoteComponent = lazy(async () => {
      try {
        const mod = await getRemote(remote, module);
        return { default: mod.default };
      } catch (error) {
        // React.lazy caches the rejection, so drop it to let a later mount retry.
        remoteComponents.delete(key);
        throw error;
      }
    });
    remoteComponents.set(key, RemoteComponent);
  }

  return RemoteComponent;
}

export function RemoteLoader({ remote, module }: Props) {
  const RemoteComponent = getRemoteComponent(remote, module);

  return (
    <RemoteErrorBoundary remote={remote}>
      <Suspense fallback={<div>Loading {remote}…</div>}>
        <RemoteComponent />
      </Suspense>
    </RemoteErrorBoundary>
  );
}
