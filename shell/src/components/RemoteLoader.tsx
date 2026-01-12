import { Suspense, lazy } from 'react';
import { getRemote } from 'virtual:__federation__';

type Props = {
  remote: string;
  module: string;
};

export function RemoteLoader({ remote, module }: Props) {
  const RemoteComponent = lazy(async () => {
    const mod = await getRemote(remote, module);
    return { default: mod.default };
  });

  return (
    <Suspense fallback={<div>Loading {remote}…</div>}>
      <RemoteComponent />
    </Suspense>
  );
}
