import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '@/lib/api';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: string;
  phone: string;
  profile_image: string | null;
  academic_level: string;
  field_of_study: string;
  interested_subjects: string[];
  career_path: string;
  upcoming_exams: string[];
  course_name: string;
  daily_ai_usage: number;
  monthly_ai_usage: number;
  last_ai_reset: string;
  current_streak: number;
}

interface UsageStats {
  daily_usage: number;
  daily_limit: number;
  monthly_usage: number;
  remaining_today: number;
  user_type: string;
  current_streak: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  usage: UsageStats | null;

  // Actions
  setAccessToken: (token: string) => void;
  setRefreshToken: (token: string) => void;
  login: (username: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  fetchUsage: () => Promise<void>;
  updateUsage: (stats: UsageStats) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      accessToken: null,
      refreshToken: null,
      usage: null,

      setAccessToken: (token: string) => {
        set({ accessToken: token, isAuthenticated: true });
        localStorage.setItem('accessToken', token);
        document.cookie = `accessToken=${token}; path=/; max-age=86400; SameSite=Lax`;
      },

      setRefreshToken: (token: string) => {
        set({ refreshToken: token });
        localStorage.setItem('refreshToken', token);
        document.cookie = `refreshToken=${token}; path=/; max-age=604800; SameSite=Lax`;
      },

      login: async (username: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await authAPI.login(username, password);
          const { access, refresh } = response.data;

          localStorage.setItem('accessToken', access);
          localStorage.setItem('refreshToken', refresh);
          document.cookie = `accessToken=${access}; path=/; max-age=86400; SameSite=Lax`;
          document.cookie = `refreshToken=${refresh}; path=/; max-age=604800; SameSite=Lax`;

          set({
            accessToken: access,
            refreshToken: refresh,
            isAuthenticated: true,
            isLoading: false,
          });

          await get().fetchUser();
          await get().fetchUsage();
        } catch (error: any) {
          set({ isLoading: false });
          throw error.response?.data || { error: 'Login failed' };
        }
      },

      register: async (data: any) => {
        set({ isLoading: true });
        try {
          await authAPI.register(data);
          // Auto login after registration
          await get().login(data.username, data.password);
        } catch (error: any) {
          set({ isLoading: false });
          throw error.response?.data || { error: 'Registration failed' };
        }
      },

      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          usage: null,
        });
      },

      fetchUser: async () => {
        try {
          const response = await authAPI.getMe();
          set({ user: response.data });
        } catch (error) {
          console.error('Failed to fetch user:', error);
        }
      },

      fetchUsage: async () => {
        try {
          const response = await authAPI.getUsage();
          set({ usage: response.data });
        } catch (error) {
          console.error('Failed to fetch usage:', error);
        }
      },

      updateUsage: (stats: UsageStats) => {
        set({ usage: stats });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

// Initialize auth state from stored tokens
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('accessToken');
  const refresh = localStorage.getItem('refreshToken');
  if (token) {
    // Sync to cookies for middleware
    document.cookie = `accessToken=${token}; path=/; max-age=86400; SameSite=Lax`;
    if (refresh) {
      document.cookie = `refreshToken=${refresh}; path=/; max-age=604800; SameSite=Lax`;
    }

    useAuthStore.setState({
      accessToken: token,
      refreshToken: refresh,
      isAuthenticated: true
    });
    useAuthStore.getState().fetchUser();
    useAuthStore.getState().fetchUsage();
  }
}

