import { create } from 'zustand';
import fetch from '../utils/fetch';
import { can, canAll, canAny } from '../auth/can';

export const useAuthStore = create(
    (set, get) => ({
        user: null,
        isAuthenticated: false,
        isLoading: true, // ✅ start true so routes wait

        login: async (email, password) => {
            set({ isLoading: true });
            try {
                const res = await fetch.post('auth/login', { email, password });
                const user = res.data?.data?.user || res.data?.user;
                set({ user, isAuthenticated: true, isLoading: false });
                return { success: true };
            } catch (err) {
                set({ user: null, isAuthenticated: false, isLoading: false });
                const raw = err.response?.data;
                const fieldErrors = raw?.error?.fields || raw?.errors;
                if (fieldErrors && typeof fieldErrors === 'object') {
                    return { success: false, errors: fieldErrors };
                }
                const message =
                    (typeof raw === 'string' && raw.trim()) ||
                    raw?.error?.message ||
                    raw?.message ||
                    (err.response?.status === 429
                        ? 'Too many login attempts, please try again later.'
                        : null) ||
                    'Login failed';
                return { success: false, message };
            }
        },

        logout: async () => {
            try { await fetch.post('auth/logout'); } catch (error) { console.error('Logout failed:', error); }
            set({ user: null, isAuthenticated: false, isLoading: false });
        },

        clearAuth: () => set({ user: null, isAuthenticated: false, isLoading: false }),

        refreshUser: async () => {
            set({ isLoading: true });
            try {
                const res = await fetch.get('auth/check');
                const user = res.data?.data?.user || res.data?.user;
                if (user) {
                    set({ user, isAuthenticated: true, isLoading: false });
                } else {
                    set({ user: null, isAuthenticated: false, isLoading: false });
                }
            } catch (error) {
                console.error('Check auth failed:', error);
                set({ isLoading: false });
            }
        },

        hasPermission: (perm) => can(get().user, perm),
        hasAnyPermission: (perms) => canAny(get().user, perms),
        hasAllPermissions: (perms) => canAll(get().user, perms),
    })
);