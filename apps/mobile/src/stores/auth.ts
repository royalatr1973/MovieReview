import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setAuthToken } from '../services/api-client';
import type { AuthResponse } from '@moviereview/shared';

interface AuthState {
  token: string | null;
  user: { id: string; email: string; displayName: string | null } | null;
  hasCompletedOnboarding: boolean;
  loading: boolean;

  loadToken: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

// Note: AsyncStorage would need to be added as a dependency
// For now using a simple in-memory fallback
const storage = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {}
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  hasCompletedOnboarding: false,
  loading: true,

  loadToken: async () => {
    const token = await storage.getItem('auth_token');
    const userJson = await storage.getItem('auth_user');
    const onboarded = await storage.getItem('onboarding_complete');

    if (token && userJson) {
      const user = JSON.parse(userJson);
      setAuthToken(token);
      set({ token, user, hasCompletedOnboarding: onboarded === 'true', loading: false });
    } else {
      set({ loading: false });
    }
  },

  login: async (email, password) => {
    const response = await api.post<AuthResponse>('/auth/login', { email, password });
    setAuthToken(response.token);
    await storage.setItem('auth_token', response.token);
    await storage.setItem('auth_user', JSON.stringify(response.user));
    set({ token: response.token, user: response.user });
  },

  register: async (email, password, displayName) => {
    const response = await api.post<AuthResponse>('/auth/register', {
      email,
      password,
      displayName,
    });
    setAuthToken(response.token);
    await storage.setItem('auth_token', response.token);
    await storage.setItem('auth_user', JSON.stringify(response.user));
    set({ token: response.token, user: response.user });
  },

  logout: async () => {
    setAuthToken(null);
    await storage.removeItem('auth_token');
    await storage.removeItem('auth_user');
    set({ token: null, user: null });
  },

  completeOnboarding: async () => {
    await storage.setItem('onboarding_complete', 'true');
    set({ hasCompletedOnboarding: true });
  },
}));
