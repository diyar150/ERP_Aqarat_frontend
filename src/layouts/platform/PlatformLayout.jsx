import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logout, Menu as MenuIcon } from '@mui/icons-material';
import { Menu, IconButton, Box, Typography, Divider, Button, useMediaQuery, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import PlatformSidebar from './PlatformSidebar';
import NavbarControls from '@/layouts/admin/NavbarControls';
import useIsRTL from '@/hooks/useIsRTL';
import { usePlatformAuthStore } from '@/store/platformAuthStore';
import { usePlatformSidebarStore } from '@/store/platformSidebarStore';

export default function PlatformLayout() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const isRTL = useIsRTL();
    const theme = useTheme();
    const isLgAndUp = useMediaQuery(theme.breakpoints.up('lg'));
    const toggleMobile = usePlatformSidebarStore((s) => s.toggleMobile);
    const isMobileOpen = usePlatformSidebarStore((s) => s.isMobileOpen);
    const admin = usePlatformAuthStore((state) => state.admin);
    const logout = usePlatformAuthStore((state) => state.logout);

    const userName = admin?.name || '';

    const [anchorEl, setAnchorEl] = useState(null);
    const openMenu = Boolean(anchorEl);

    const handleAvatarClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleAvatarClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = async () => {
        handleAvatarClose();
        await logout();
        navigate('/platform/login', { replace: true });
    };

    return (
        <div className="flex h-dvh max-h-dvh bg-background overflow-hidden">
            <PlatformSidebar />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header
                    className="app-topbar sticky top-0 z-30 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60"
                    style={{ paddingTop: 'env(safe-area-inset-top)' }}
                >
                    <div
                        className="flex h-14 sm:h-16 lg:h-20 items-center gap-1 px-3 sm:px-4"
                        dir={isRTL ? 'rtl' : 'ltr'}
                        style={{ justifyContent: 'space-between' }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                            {!isLgAndUp && (
                                <IconButton
                                    onClick={toggleMobile}
                                    aria-label={isMobileOpen ? t('common.close', 'Close') : t('common.menu', 'Menu')}
                                    aria-expanded={isMobileOpen}
                                    size="medium"
                                    edge="start"
                                >
                                    <MenuIcon />
                                </IconButton>
                            )}
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, minWidth: 0 }}>
                            <NavbarControls />
                            <Button
                                onClick={handleAvatarClick}
                                size="small"
                                aria-haspopup="true"
                                aria-expanded={openMenu}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    color: 'text.primary',
                                    maxWidth: { xs: 140, sm: 220 },
                                    px: 1.25,
                                    borderRadius: 2,
                                }}
                            >
                                <Typography component="span" noWrap sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                    {userName}
                                </Typography>
                            </Button>
                            <Menu
                                anchorEl={anchorEl}
                                open={openMenu}
                                onClose={handleAvatarClose}
                                transformOrigin={{ horizontal: isRTL ? 'left' : 'right', vertical: 'top' }}
                                anchorOrigin={{ horizontal: isRTL ? 'left' : 'right', vertical: 'bottom' }}
                                disableScrollLock
                                slotProps={{
                                    paper: {
                                        elevation: 3,
                                        sx: {
                                            width: { xs: 'min(280px, calc(100vw - 24px))', sm: 280 },
                                            mt: 1.5,
                                            bgcolor: 'background.paper',
                                            borderRadius: 3,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            backgroundImage: 'none',
                                        },
                                        dir: isRTL ? 'rtl' : 'ltr',
                                    },
                                    list: {
                                        sx: { p: 0 },
                                    },
                                }}
                            >
                                <Box sx={{ px: 2, py: 1.5, minWidth: 0 }} dir={isRTL ? 'rtl' : 'ltr'}>
                                    <Typography
                                        variant="subtitle1"
                                        sx={{
                                            fontWeight: 600,
                                            fontFamily: 'inherit',
                                            color: 'text.primary',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {userName}
                                    </Typography>
                                    {admin?.email && (
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: 'text.secondary',
                                                fontFamily: 'inherit',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {admin.email}
                                        </Typography>
                                    )}
                                </Box>

                                <Divider />

                                {admin?.phone && (
                                    <>
                                        <Box
                                            sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                                            dir={isRTL ? 'rtl' : 'ltr'}
                                        >
                                            <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'inherit' }} dir="ltr">
                                                {admin.phone}
                                            </Typography>
                                        </Box>
                                        <Divider />
                                    </>
                                )}

                                <Box sx={{ p: 1.5 }} dir={isRTL ? 'rtl' : 'ltr'}>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        fullWidth
                                        onClick={handleLogout}
                                        startIcon={isRTL ? null : <Logout fontSize="small" />}
                                        endIcon={isRTL ? <Logout fontSize="small" /> : null}
                                        sx={{
                                            borderRadius: 2,
                                            py: 1,
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            borderWidth: 1.5,
                                            fontFamily: 'inherit',
                                            '&:hover': {
                                                borderWidth: 1.5,
                                                backgroundColor: (thm) => alpha(thm.palette.error.main, 0.08),
                                            },
                                        }}
                                    >
                                        {t('platform.logout')}
                                    </Button>
                                </Box>
                            </Menu>
                        </Box>
                    </div>
                </header>

                <main
                    className="flex flex-1 flex-col min-h-0 overflow-hidden"
                    style={{
                        paddingBottom: 'env(safe-area-inset-bottom)',
                        paddingLeft: 'env(safe-area-inset-left)',
                        paddingRight: 'env(safe-area-inset-right)',
                    }}
                >
                    <div className="flex flex-1 flex-col min-h-0 overflow-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
