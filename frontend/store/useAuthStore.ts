'use client';
import { create } from 'zustand';
import { api } from '../lib/api';

export type User = {
  id: number;
  email: string;
  created_at: string;
};

type AuthState = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);
      
      await api('/auth/login', {
        method: 'POST',
        headers: {},
        body: formData,
      });
      
      await get().checkAuth();
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      
      await get().login(email, password);
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch (error) {
      // Continue with logout even if API call fails
    }
    set({ user: null });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const user = await api<User>('/auth/me');
      set({ user, isLoading: false });
    } catch (error) {
      set({ user: null, isLoading: false });
    }
  },
}));