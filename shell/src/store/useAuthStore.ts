import { create } from 'zustand';

type AuthState = {
  user: { name: string } | null;
  login: (name: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  login: (name: string) => set({ user: { name } }),
  logout: () => set({ user: null }),
}));
