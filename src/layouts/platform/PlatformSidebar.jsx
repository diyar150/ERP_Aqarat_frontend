import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from '@mui/icons-material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import CardMembershipOutlinedIcon from '@mui/icons-material/CardMembershipOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import useIsRTL from '@/hooks/useIsRTL';
import { usePlatformSidebarStore } from '@/store/platformSidebarStore';
import { platformCan, usePlatformAuthStore } from '@/store/platformAuthStore';

const NAV = [
    { to: '/platform/dashboard', icon: DashboardOutlinedIcon, labelKey: 'platform.nav.dashboard', permission: 'dashboard.view' },
    { to: '/platform/agencies', icon: BusinessOutlinedIcon, labelKey: 'platform.nav.agencies', permission: 'agencies.view' },
    { to: '/platform/plans', icon: CardMembershipOutlinedIcon, labelKey: 'platform.nav.plans', permission: 'plans.view' },
    { to: '/platform/admins', icon: AdminPanelSettingsOutlinedIcon, labelKey: 'platform.nav.admins', permission: 'admins.view' },
    { to: '/platform/audit', icon: HistoryOutlinedIcon, labelKey: 'platform.nav.audit', permission: 'audit.view' },
    { to: '/platform/reports', icon: AssessmentOutlinedIcon, labelKey: 'platform.nav.reports', permission: 'dashboard.view' },
];

export default function PlatformSidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const isRTL = useIsRTL();
    const admin = usePlatformAuthStore((s) => s.admin);
    const navItems = NAV.filter((item) => platformCan(admin, item.permission));

    const isMobileOpen = usePlatformSidebarStore((s) => s.isMobileOpen);
    const setMobileOpen = usePlatformSidebarStore((s) => s.setMobileOpen);
    const isDesktopOpen = usePlatformSidebarStore((s) => s.isDesktopOpen);
    const toggleDesktop = usePlatformSidebarStore((s) => s.toggleDesktop);

    const [windowWidth, setWindowWidth] = useState(
        typeof window !== 'undefined' ? window.innerWidth : 1024,
    );
    const isDesktop = windowWidth >= 1024;

    useEffect(() => {
        const handleResize = () => {
            const w = window.innerWidth;
            setWindowWidth(w);
            if (w >= 1024) {
                setMobileOpen(false);
                usePlatformSidebarStore.getState().setDesktopOpen(true);
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, [setMobileOpen]);

    const handleMenuClick = (path) => {
        navigate(path);
        if (!isDesktop) setMobileOpen(false);
    };

    const getSidebarWidth = () => {
        if (!isDesktop) return 'w-72 max-w-[85vw]';
        return isDesktopOpen ? 'w-72' : 'w-20';
    };

    const showLabels = isDesktop ? isDesktopOpen : true;
    const isPathActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

    return (
        <>
            {isMobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/40 z-30 backdrop-blur-sm transition-opacity duration-300"
                    onClick={() => setMobileOpen(false)}
                    aria-hidden
                />
            )}

            <aside
                className={`app-sidebar
                    ${getSidebarWidth()}
                    ${isMobileOpen
                        ? 'translate-x-0'
                        : `${isRTL ? 'translate-x-full' : '-translate-x-full'} lg:translate-x-0`
                    }
                    fixed lg:relative inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-40 lg:z-0
                    transition-all duration-300 ease-in-out
                    bg-sidebar ${isRTL ? 'border-l' : 'border-r'} border-sidebar-border shadow-2xl lg:shadow-none font-arabic
                `}
                style={{ display: 'flex', flexDirection: 'column', height: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }}
                dir={isRTL ? 'rtl' : 'ltr'}
            >
                <div
                    className="relative h-16 sm:h-20 flex items-center justify-between px-4 sm:px-5 border-b border-sidebar-border"
                    style={{ flexShrink: 0 }}
                >
                    {showLabels && (
                        <button
                            type="button"
                            onClick={() => handleMenuClick('/platform/dashboard')}
                            className="flex flex-col items-start gap-0.5 relative z-10 min-w-0 flex-1 hover:opacity-80 transition-opacity cursor-pointer text-start"
                        >
                            <span className="text-[11px] font-semibold tracking-wide text-sidebar-foreground/45 uppercase">
                                {t('platform.brand')}
                            </span>
                            <span className="text-base lg:text-lg font-bold text-sidebar-foreground truncate w-full">
                                {t('platform.title')}
                            </span>
                        </button>
                    )}

                    {isDesktop && (
                        <button
                            type="button"
                            onClick={toggleDesktop}
                            className={`p-2 rounded-lg transition-all duration-200 relative z-10 hover:bg-sidebar-accent shrink-0 ${!showLabels ? 'mx-auto' : ''}`}
                            aria-label={showLabels ? t('common.close', 'Collapse sidebar') : t('common.menu', 'Expand sidebar')}
                        >
                            <ChevronRight
                                style={{ fontSize: 20 }}
                                className={`text-sidebar-foreground transform transition-transform duration-300 ${
                                    isRTL
                                        ? (isDesktopOpen ? 'rotate-180' : '')
                                        : (!isDesktopOpen ? 'rotate-180' : '')
                                }`}
                            />
                        </button>
                    )}
                </div>

                <div
                    className="px-3 py-4 space-y-1"
                    style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}
                >
                    <nav className="space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active = isPathActive(item.to);
                            const label = t(item.labelKey);
                            return (
                                <button
                                    key={item.to}
                                    type="button"
                                    onClick={() => handleMenuClick(item.to)}
                                    className={`
                                        relative w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200
                                        ${isRTL ? 'text-right' : 'text-left'} group
                                        ${active
                                            ? 'bg-primary text-primary-foreground shadow-lg'
                                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}
                                        ${!showLabels ? 'justify-center' : ''}
                                    `}
                                    title={!showLabels ? label : ''}
                                >
                                    <Icon
                                        style={{ fontSize: 22 }}
                                        className={`shrink-0 transition-all duration-200 ${
                                            active ? 'text-primary-foreground' : 'text-sidebar-foreground'
                                        }`}
                                    />
                                    {showLabels && (
                                        <span className={`font-medium text-sm flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {label}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </aside>
            <style>{`
                .app-sidebar > div:nth-child(2) {
                    scrollbar-width: thin;
                    scrollbar-color: hsl(var(--muted-foreground)) transparent;
                }
                .app-sidebar > div:nth-child(2)::-webkit-scrollbar { width: 5px; }
                .app-sidebar > div:nth-child(2)::-webkit-scrollbar-track { background: transparent; }
                .app-sidebar > div:nth-child(2)::-webkit-scrollbar-thumb {
                    background: hsl(var(--muted-foreground));
                    border-radius: 10px;
                }
                .app-sidebar > div:nth-child(2)::-webkit-scrollbar-thumb:hover {
                    background: var(--primary);
                }
            `}</style>
        </>
    );
}
