import { create } from 'zustand';
import fetch from '../utils/fetch';

export function platformCan(admin, permission) {
    if (!admin || !permission) return false;
    if (Array.isArray(admin.permissions)) return admin.permissions.includes(permission);
    return admin.role === 'owner';
}

export const usePlatformAuthStore = create((set, get) => ({
    admin: null,
    isAuthenticated: false,
    isLoading: true,

    can: (permission) => platformCan(get().admin, permission),

    login: async (phone, password) => {
        set({ isLoading: true });
        try {
            const res = await fetch.post('platform/auth/login', { phone, password });
            const admin = res.data?.data?.admin || res.data?.admin;
            set({ admin, isAuthenticated: true, isLoading: false });
            return { success: true };
        } catch (err) {
            set({ admin: null, isAuthenticated: false, isLoading: false });
            const raw = err.response?.data;
            const message =
                raw?.error?.message ||
                raw?.message ||
                (err.response?.status === 429 ? 'Too many login attempts, please try again later.' : null) ||
                'Login failed';
            return { success: false, message, errors: raw?.error?.fields };
        }
    },

    logout: async () => {
        try {
            await fetch.post('platform/auth/logout');
        } catch (error) {
            console.error('Platform logout failed:', error);
        }
        set({ admin: null, isAuthenticated: false, isLoading: false });
    },

    clearAuth: () => set({ admin: null, isAuthenticated: false, isLoading: false }),

    refreshAdmin: async () => {
        set({ isLoading: true });
        try {
            const res = await fetch.get('platform/auth/check');
            const admin = res.data?.data?.admin || res.data?.admin;
            if (admin) {
                set({ admin, isAuthenticated: true, isLoading: false });
            } else {
                set({ admin: null, isAuthenticated: false, isLoading: false });
            }
        } catch {
            set({ admin: null, isAuthenticated: false, isLoading: false });
        }
    },
}));
