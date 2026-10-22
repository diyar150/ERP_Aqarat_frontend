import { create } from 'zustand';

/**
 * Platform sidebar UI state shared by PlatformLayout (header hamburger) and PlatformSidebar.
 */
export const usePlatformSidebarStore = create((set) => ({
    isMobileOpen: false,
    isDesktopOpen: true,
    toggleMobile: () => set((s) => ({ isMobileOpen: !s.isMobileOpen })),
    setMobileOpen: (isMobileOpen) => set({ isMobileOpen }),
    toggleDesktop: () => set((s) => ({ isDesktopOpen: !s.isDesktopOpen })),
    setDesktopOpen: (isDesktopOpen) => set({ isDesktopOpen }),
}));

export default usePlatformSidebarStore;
