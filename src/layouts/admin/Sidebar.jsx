import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Can from '@/components/auth/Can.jsx';
import fetch from '@/utils/fetch';
import { useTranslation } from 'react-i18next';
import useIsRTL from '@/hooks/useIsRTL';
import { useSidebarStore } from '@/store/sidebarStore';

import {
    ChevronRight,
    Dashboard,
    Settings,
    AttachMoney,
    ExpandMore,
    Assessment,
    Apartment,
    LocationCity,
    People,
    Receipt,
    Description,
    AccountBalance,
} from '@mui/icons-material';
import { Accordion, AccordionSummary, AccordionDetails } from "@mui/material";

function MenuGroup({ show, children }) {
    if (!show) return null;
    return (
        <div className="px-4 pt-4 pb-1 text-[11px] font-semibold tracking-wide text-sidebar-foreground/45">
            {children}
        </div>
    );
}

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const isRTL = useIsRTL();

    const isMobileOpen = useSidebarStore((s) => s.isMobileOpen);
    const setMobileOpen = useSidebarStore((s) => s.setMobileOpen);
    const isDesktopOpen = useSidebarStore((s) => s.isDesktopOpen);
    const toggleDesktop = useSidebarStore((s) => s.toggleDesktop);

    const [brand, setBrand] = useState({ name: '', logoUrl: '' });
    const [windowWidth, setWindowWidth] = useState(
        typeof window !== 'undefined' ? window.innerWidth : 1024
    );
    const isDesktop = windowWidth >= 1024;

    const [settingsAccordionOpen, setSettingsAccordionOpen] = useState(false);

    useEffect(() => {
        let active = true;
        let objectUrl = '';
        fetch.get('agency')
            .then(async (res) => {
                if (!active) return;
                const data = res.data?.data;
                let logoUrl = '';
                if (data?.has_logo) {
                    const file = await fetch.get('agency/logo', { responseType: 'blob' });
                    if (!active) return;
                    objectUrl = URL.createObjectURL(file.data);
                    logoUrl = objectUrl;
                }
                setBrand({ name: data?.name || '', logoUrl });
            })
            .catch(() => {});
        return () => {
            active = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [location.pathname]);

    useEffect(() => {
        const handleResize = () => {
            const w = window.innerWidth;
            setWindowWidth(w);
            if (w >= 1024) {
                setMobileOpen(false);
                useSidebarStore.getState().setDesktopOpen(true);
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, [setMobileOpen]);

    useEffect(() => {
        if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
        }
    }, [isRTL]);

    useEffect(() => {
        const path = location.pathname;
        const timer = setTimeout(() => {
            setSettingsAccordionOpen(
                path.includes('/admin/currencies') ||
                path.includes('/admin/currency-exchange-rates') ||
                path.includes('/admin/agency') ||
                path.includes('/admin/branches') ||
                path.includes('/admin/periods') ||
                path.includes('/admin/subscription') ||
                path.includes('/admin/users') ||
                path.includes('/admin/roles') ||
                path.includes('/admin/audit')
            );
        }, 0);
        return () => clearTimeout(timer);
    }, [location.pathname]);

    const handleMenuClick = (path) => {
        navigate(path);
        if (!isDesktop) setMobileOpen(false);
    };

    const getSidebarWidth = () => {
        if (!isDesktop) return 'w-72 max-w-[85vw]';
        return isDesktopOpen ? 'w-72' : 'w-20';
    };

    const showLabels = isDesktop ? isDesktopOpen : true;
    const isPathActive = (path) => location.pathname === path;

    const isSettingsActive = ['/admin/currencies', '/admin/currency-exchange-rates', '/admin/agency', '/admin/branches', '/admin/periods', '/admin/subscription', '/admin/users', '/admin/roles', '/admin/audit'].some(p => location.pathname.includes(p));

    const subBtn = (path, label, permission, active = isPathActive(path)) => (
        <Can permission={permission} any={Array.isArray(permission)} key={path}>
            <button
                onClick={() => handleMenuClick(path)}
                className={`
                    block w-full px-4 py-2 rounded-lg transition-all duration-200
                    ${isRTL ? 'text-right' : 'text-left'} text-[13px] font-medium
                    ${active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'}
                `}
            >
                {label}
            </button>
        </Can>
    );

    const accordionSection = (
        key, accordionOpen, setAccordionOpen,
        isActive, icon, label,
        children, permissions
    ) => (
        <Can permission={permissions} any={true} key={key}>
            {showLabels ? (
                <Accordion
                    expanded={accordionOpen}
                    onChange={(_, isExpanded) => setAccordionOpen(isExpanded)}
                    elevation={0}
                    disableGutters
                    className="w-full bg-transparent before:hidden"
                    sx={{
                        backgroundColor: 'transparent',
                        backgroundImage: 'none',
                        boxShadow: 'none',
                        '&:before': { display: 'none' },
                        '&.Mui-expanded': { margin: 0 }
                    }}
                >
                    <AccordionSummary
                        expandIcon={<ExpandMore sx={{ fontSize: 18 }} className={isActive ? 'text-primary' : 'text-sidebar-foreground/50'} />}
                        className={`
                            rounded-xl transition-all duration-200
                            ${isActive
                                ? 'bg-primary/5 text-primary'
                                : 'text-sidebar-foreground hover:bg-sidebar-accent/50'}
                        `}
                        sx={{
                            minHeight: '44px !important',
                            padding: '0 12px',
                            margin: 0,
                            '& .MuiAccordionSummary-content': {
                                margin: '10px 0 !important',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                            },
                        }}
                    >
                        <span className={`shrink-0 transition-all duration-200 ${isActive ? 'text-primary' : 'text-sidebar-foreground/70'}`}>
                            {icon}
                        </span>
                        <span className={`font-semibold text-[14px] flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                            {label}
                        </span>
                    </AccordionSummary>
                    <AccordionDetails className="pb-0 pt-1 px-0">
                        <div className={`space-y-1 ${isRTL ? 'pr-4' : 'pl-4'}`}>
                            {children}
                        </div>
                    </AccordionDetails>
                </Accordion>
            ) : (
                <div
                    className={`
                        relative w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200
                        justify-center cursor-default
                        ${isActive
                            ? 'bg-primary text-primary-foreground shadow-lg'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent'}
                    `}
                    title={label}
                >
                    <span className={`shrink-0 ${isActive ? 'text-primary-foreground' : 'text-sidebar-foreground'}`}>
                        {icon}
                    </span>
                </div>
            )}
        </Can>
    );

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
                        <a
                            href="/"
                            className="flex items-center gap-3 relative z-10 min-w-0 flex-1 hover:opacity-80 transition-opacity cursor-pointer"
                        >
                            {brand.logoUrl && (
                                <img src={brand.logoUrl} alt="" className="h-9 w-9 rounded-lg object-cover shrink-0" />
                            )}
                            <span className="text-base lg:text-lg font-bold text-sidebar-foreground truncate">
                                {brand.name || t('admin_sidebar.company_name', 'Hiload System')}
                            </span>
                        </a>
                    )}

                    {isDesktop && (
                        <button
                            onClick={toggleDesktop}
                            className={`p-2 rounded-lg transition-all duration-200 relative z-10 hover:bg-sidebar-accent shrink-0 ${!showLabels ? 'mx-auto' : ''}`}
                            aria-label={showLabels ? 'Collapse sidebar' : 'Expand sidebar'}
                        >
                            <ChevronRight
                                style={{ fontSize: 20 }}
                                className={`text-sidebar-foreground transform transition-transform duration-300 ${isRTL ? (isDesktopOpen ? 'rotate-180' : '') : (!isDesktopOpen ? 'rotate-180' : '')
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
                        <button
                            onClick={() => handleMenuClick('/admin/dashboard')}
                            className={`
                                relative w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200
                                ${isRTL ? 'text-right' : 'text-left'} group
                                ${location.pathname === '/admin/dashboard'
                                    ? 'bg-primary text-primary-foreground shadow-lg'
                                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}
                                ${!showLabels ? 'justify-center' : ''}
                            `}
                            title={!showLabels ? t('admin_sidebar.dashboard') : ''}
                        >
                            <Dashboard style={{ fontSize: 22 }} className={`shrink-0 transition-all duration-200 ${location.pathname === '/admin/dashboard' ? 'text-primary-foreground' : 'text-sidebar-foreground'}`} />
                            {showLabels && (
                                <span className={`font-medium text-sm flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                                    {t('admin_sidebar.dashboard', 'داشبۆرد')}
                                </span>
                            )}
                        </button>

                        <MenuGroup show={showLabels}>{t('admin_sidebar.group_operations')}</MenuGroup>

                        <Can permission="property:view">
                            <button
                                onClick={() => handleMenuClick('/admin/properties/index')}
                                className={`
                                    relative w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200
                                    ${isRTL ? 'text-right' : 'text-left'} group
                                    ${location.pathname.includes('/admin/properties')
                                        ? 'bg-primary text-primary-foreground shadow-lg'
                                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}
                                    ${!showLabels ? 'justify-center' : ''}
                                `}
                                title={!showLabels ? t('admin_sidebar.properties') : ''}
                            >
                                <Apartment style={{ fontSize: 22 }} className="shrink-0" />
                                {showLabels && (
                                    <span className={`font-medium text-sm flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                                        {t('admin_sidebar.properties')}
                                    </span>
                                )}
                            </button>
                        </Can>

                        <Can permission="location:view">
                            <button
                                onClick={() => handleMenuClick('/admin/locations/index')}
                                className={`
                                    relative w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200
                                    ${isRTL ? 'text-right' : 'text-left'} group
                                    ${location.pathname.includes('/admin/locations')
                                        ? 'bg-primary text-primary-foreground shadow-lg'
                                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}
                                    ${!showLabels ? 'justify-center' : ''}
                                `}
                                title={!showLabels ? t('admin_sidebar.locations') : ''}
                            >
                                <LocationCity style={{ fontSize: 22 }} className="shrink-0" />
                                {showLabels && (
                                    <span className={`font-medium text-sm flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                                        {t('admin_sidebar.locations')}
                                    </span>
                                )}
                            </button>
                        </Can>

                        <Can permission="party:view">
                            <button
                                onClick={() => handleMenuClick('/admin/parties/index')}
                                className={`
                                    relative w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200
                                    ${isRTL ? 'text-right' : 'text-left'} group
                                    ${location.pathname.includes('/admin/parties')
                                        ? 'bg-primary text-primary-foreground shadow-lg'
                                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}
                                    ${!showLabels ? 'justify-center' : ''}
                                `}
                                title={!showLabels ? t('admin_sidebar.parties') : ''}
                            >
                                <People style={{ fontSize: 22 }} className="shrink-0" />
                                {showLabels && (
                                    <span className={`font-medium text-sm flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                                        {t('admin_sidebar.parties')}
                                    </span>
                                )}
                            </button>
                        </Can>

                        <Can permission={['transaction:create', 'financial:view']} any>
                            <button
                                onClick={() => handleMenuClick('/admin/transactions/index')}
                                className={`
                                    relative w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200
                                    ${isRTL ? 'text-right' : 'text-left'} group
                                    ${location.pathname.includes('/admin/transactions')
                                        ? 'bg-primary text-primary-foreground shadow-lg'
                                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}
                                    ${!showLabels ? 'justify-center' : ''}
                                `}
                                title={!showLabels ? t('admin_sidebar.transactions') : ''}
                            >
                                <Receipt style={{ fontSize: 22 }} className="shrink-0" />
                                {showLabels && (
                                    <span className={`font-medium text-sm flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                                        {t('admin_sidebar.transactions')}
                                    </span>
                                )}
                            </button>
                        </Can>

                        <Can permission={['document:generate', 'document:download']} any>
                            <button
                                onClick={() => handleMenuClick('/admin/contracts/index')}
                                className={`
                                    relative w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200
                                    ${isRTL ? 'text-right' : 'text-left'} group
                                    ${location.pathname.includes('/admin/contracts')
                                        ? 'bg-primary text-primary-foreground shadow-lg'
                                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}
                                    ${!showLabels ? 'justify-center' : ''}
                                `}
                                title={!showLabels ? t('admin_sidebar.contracts') : ''}
                            >
                                <Description style={{ fontSize: 22 }} className="shrink-0" />
                                {showLabels && (
                                    <span className={`font-medium text-sm flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                                        {t('admin_sidebar.contracts')}
                                    </span>
                                )}
                            </button>
                        </Can>

                        <MenuGroup show={showLabels}>{t('admin_sidebar.group_accounting')}</MenuGroup>

                        <Can permission="expenses.view">
                            <button
                                onClick={() => handleMenuClick('/admin/expenses/index')}
                                className={`
                                    relative w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200
                                    ${isRTL ? 'text-right' : 'text-left'} group
                                    ${location.pathname.includes('/admin/expenses')
                                        ? 'bg-primary text-primary-foreground shadow-lg'
                                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}
                                    ${!showLabels ? 'justify-center' : ''}
                                `}
                                title={!showLabels ? t('admin_sidebar.expense') : ''}
                            >
                                <AttachMoney style={{ fontSize: 22 }} className="shrink-0" />
                                {showLabels && (
                                    <span className={`font-medium text-sm flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                                        {t('admin_sidebar.expense')}
                                    </span>
                                )}
                            </button>
                        </Can>

                        <Can permission="financial:view">
                            <button
                                onClick={() => handleMenuClick('/admin/finance')}
                                className={`
                                    relative w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200
                                    ${isRTL ? 'text-right' : 'text-left'} group
                                    ${location.pathname.includes('/admin/finance')
                                        ? 'bg-primary text-primary-foreground shadow-lg'
                                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}
                                    ${!showLabels ? 'justify-center' : ''}
                                `}
                                title={!showLabels ? t('admin_sidebar.finance') : ''}
                            >
                                <AccountBalance style={{ fontSize: 22 }} className="shrink-0" />
                                {showLabels && (
                                    <span className={`font-medium text-sm flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                                        {t('admin_sidebar.finance')}
                                    </span>
                                )}
                            </button>
                        </Can>

                        <Can permission={['financial:view', 'property:view', 'party:view', 'transaction:create']} any>
                            <button
                                onClick={() => handleMenuClick('/admin/reports')}
                                className={`
                                    relative w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200
                                    ${isRTL ? 'text-right' : 'text-left'} group
                                    ${location.pathname.includes('/admin/reports')
                                        ? 'bg-primary text-primary-foreground shadow-lg'
                                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}
                                    ${!showLabels ? 'justify-center' : ''}
                                `}
                                title={!showLabels ? t('admin_sidebar.reports') : ''}
                            >
                                <Assessment style={{ fontSize: 22 }} className="shrink-0" />
                                {showLabels && (
                                    <span className={`font-medium text-sm flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                                        {t('admin_sidebar.reports')}
                                    </span>
                                )}
                            </button>
                        </Can>

                        {accordionSection(
                            'settings', settingsAccordionOpen, setSettingsAccordionOpen,
                            isSettingsActive,
                            <Settings style={{ fontSize: 22 }} />,
                            t('admin_sidebar.group_organization'),
                            <>
                                {subBtn('/admin/agency/show', t('admin_sidebar.workspace'), 'agency:view', location.pathname.startsWith('/admin/agency'))}
                                {subBtn('/admin/branches/index', t('admin_sidebar.branches'), 'branch:view', location.pathname.startsWith('/admin/branches'))}
                                {subBtn('/admin/users/index', t('user.title'), ['users.view', 'staff:view'])}
                                {subBtn('/admin/roles/index', t('admin_sidebar.roles'), ['roles.view', 'role:manage'])}
                                {subBtn('/admin/periods', t('admin_sidebar.periods'), 'expenses.view', location.pathname.startsWith('/admin/periods'))}
                                {subBtn('/admin/currencies/index', t('currencies.title'), 'currencies.view')}
                                {subBtn('/admin/currency-exchange-rates/index', t('currency_exchange_rates.title'), ['currency_rates.view', 'currencies.view'])}
                                {subBtn('/admin/subscription', t('admin_sidebar.subscription'), 'subscription:view')}
                                {subBtn('/admin/audit', t('admin_sidebar.audit'), 'audit:view', location.pathname.startsWith('/admin/audit'))}
                            </>,
                            ['agency:view', 'branch:view', 'users.view', 'staff:view', 'roles.view', 'role:manage', 'expenses.view', 'currencies.view', 'currency_rates.view', 'subscription:view', 'audit:view']
                        )}
                    </nav>
                </div>
            </aside>
            <style>{`
                aside > div:nth-child(2) {
                    scrollbar-width: thin;
                    scrollbar-color: hsl(var(--muted-foreground)) transparent;
                }
                aside > div:nth-child(2)::-webkit-scrollbar { width: 5px; }
                aside > div:nth-child(2)::-webkit-scrollbar-track { background: transparent; }
                aside > div:nth-child(2)::-webkit-scrollbar-thumb {
                    background: hsl(var(--muted-foreground));
                    border-radius: 10px;
                }
                aside > div:nth-child(2)::-webkit-scrollbar-thumb:hover {
                    background: var(--primary);
                }
            `}</style>
        </>
    );
}
