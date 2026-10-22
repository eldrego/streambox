import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { InternalAxiosRequestConfig } from 'axios';
import type { AuthApi, AuthState, LoginCredentials } from '@contracts/auth';
import { recordEvent } from '../newrelicEvents';

const initialState: AuthState = {
  user: null,
  accessToken: null,
  status: 'idle',
};

// Kept in memory only — never persist the access token to localStorage (XSS-readable).
const authStore = createStore<AuthState>(() => initialState);

// TODO: replace with a real auth API call once the backend exists.
// Expected shape: POST credentials, receive { user, accessToken }, refresh token as an httpOnly cookie.
async function requestSession({ name }: LoginCredentials) {
  return {
    user: { id: crypto.randomUUID(), name },
    accessToken: `dev-token-${Date.now()}`,
  };
}

export const auth: AuthApi = {
  getState: authStore.getState,
  subscribe: authStore.subscribe,
  getAccessToken: () => authStore.getState().accessToken,

  login: async (credentials) => {
    const { user, accessToken } = await requestSession(credentials);
    authStore.setState({ user, accessToken, status: 'authenticated' });
    recordEvent('Login', { userName: user.name });
  },

  logout: async () => {
    authStore.setState({ ...initialState, status: 'anonymous' });
    recordEvent('Logout');
  },
};

/**
 * React hook for reading auth state. Always pass a selector so components
 * only re-render when the slice they use changes.
 */
export function useAuth<T>(selector: (state: AuthState) => T): T {
  return useStore(authStore, selector);
}

/**
 * Request interceptor for axios (or any client with a headers object).
 * Usage in a remote: `api.interceptors.request.use(authorizeRequest)`.
 */
export function authorizeRequest(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const token = auth.getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
}
