// Runtime module injected by @originjs/vite-plugin-federation. The plugin ships no
// types for it, so only the parts the shell uses are declared here.
declare module 'virtual:__federation__' {
  import type { ComponentType } from 'react';

  /**
   * Loads an exposed module from a remote listed in vite.config `remotes`.
   * `componentName` is the exposed path, e.g. `./MoviesApp`.
   */
  export function __federation_method_getRemote(
    remoteName: string,
    componentName: string,
  ): Promise<{ default: ComponentType }>;
}
