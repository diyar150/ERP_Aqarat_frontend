import { create } from 'zustand';

/**
 * Admin sidebar UI state shared by MainLayout (header hamburger) and Sidebar.
 */
export const useSidebarStore = create((set) => ({
    isMobileOpen: false,
    isDesktopOpen: true,
    toggleMobile: () => set((s) => ({ isMobileOpen: !s.isMobileOpen })),
    setMobileOpen: (isMobileOpen) => set({ isMobileOpen }),
    toggleDesktop: () => set((s) => ({ isDesktopOpen: !s.isDesktopOpen })),
    setDesktopOpen: (isDesktopOpen) => set({ isDesktopOpen }),
}));

export default useSidebarStore;
