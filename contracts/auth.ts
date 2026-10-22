export interface AuthUser {
  id: string;
  name: string;
}

export type AuthStatus = 'idle' | 'authenticated' | 'anonymous';

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  status: AuthStatus;
}

export interface LoginCredentials {
  name: string;
}

/**
 * Public auth API exposed by the shell as `streambox/auth`.
 * Remotes read state and call actions through this; they never set state directly.
 */
export interface AuthApi {
  getState: () => AuthState;
  subscribe: (listener: (state: AuthState, prevState: AuthState) => void) => () => void;
  getAccessToken: () => string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
}
