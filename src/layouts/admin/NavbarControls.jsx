/* eslint-disable react-hooks/static-components */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageStore } from '@/store/languageStore';
import useIsRTL from '@/hooks/useIsRTL';
import { useColorScheme } from '@mui/material/styles';
import i18n from '@/i18n';
import { LightModeRounded, DarkModeRounded, Monitor, Check } from '@mui/icons-material';
import { Menu, MenuItem, IconButton, Tooltip, Box, Button } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { isRtlLanguage } from "@/i18n/languages";

export default function NavbarControls() {
    const { t } = useTranslation();
    const { language, setLanguage: setStoreLanguage } = useLanguageStore();
    const { mode, setMode, systemMode } = useColorScheme();
    const isRTL = useIsRTL();

    const [themeAnchorEl, setThemeAnchorEl] = useState(null);
    const openThemeMenu = Boolean(themeAnchorEl);

    // Active mode calculation
    const activeMode = mode === 'system' ? (systemMode || 'light') : (mode || 'light');
    const isDark = activeMode === 'dark';

    const languages = [
        { code: "ckb", label: "ku" },
        { code: "ar", label: "ar" },
        { code: "en", label: "en" },
    ];

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
        if (typeof window !== "undefined") localStorage.setItem("language", lng);
        setStoreLanguage(lng);
        const newDir = isRtlLanguage(lng) ? "rtl" : "ltr";
        if (typeof document !== "undefined") document.documentElement.setAttribute("dir", newDir);
    };

    const handleToggleTheme = () => {
        setMode(isDark ? 'light' : 'dark');
    };

    const handleContextMenu = (e) => {
        e.preventDefault();
        setThemeAnchorEl(e.currentTarget);
    };

    const tooltipTitle = isDark
        ? t('admin_sidebar.switch_to_light', 'Switch to Light Mode')
        : t('admin_sidebar.switch_to_dark', 'Switch to Dark Mode');

    const selectedSx = {
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        py: 1,
        px: 1.5,
        borderRadius: 1.5,
        m: 0.5,
        '&.Mui-selected': {
            backgroundColor: (muiTheme) => alpha(muiTheme.palette.primary.main, 0.12),
            color: 'primary.main',
            '&:hover': {
                backgroundColor: (muiTheme) => alpha(muiTheme.palette.primary.main, 0.16),
            },
        },
    };

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Standard Modern White/Dark Mode Toggle Button */}
            <Tooltip title={tooltipTitle}>
                <IconButton
                    onClick={handleToggleTheme}
                    onContextMenu={handleContextMenu}
                    aria-label={tooltipTitle}
                    aria-pressed={isDark}
                    size="small"
                    sx={{
                        position: 'relative',
                        width: 38,
                        height: 38,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        color: 'text.primary',
                        overflow: 'hidden',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                            borderColor: isDark ? 'primary.main' : 'warning.main',
                            bgcolor: 'action.hover',
                            transform: 'translateY(-1px)',
                            boxShadow: (thm) => thm.palette.mode === 'dark'
                                ? '0 4px 12px rgba(0, 0, 0, 0.45)'
                                : '0 2px 8px rgba(0, 0, 0, 0.08)',
                        },
                        '&:active': {
                            transform: 'scale(0.92)',
                        },
                    }}
                >
                    {/* Sun Icon (for Light Mode) */}
                    <LightModeRounded
                        sx={{
                            position: 'absolute',
                            fontSize: 20,
                            color: '#F59E0B',
                            transform: isDark ? 'rotate(-90deg) scale(0)' : 'rotate(0deg) scale(1)',
                            opacity: isDark ? 0 : 1,
                            filter: isDark ? 'none' : 'drop-shadow(0 0 5px rgba(245, 158, 11, 0.45))',
                            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease, filter 0.3s ease',
                        }}
                    />

                    {/* Moon Icon (for Dark Mode) */}
                    <DarkModeRounded
                        sx={{
                            position: 'absolute',
                            fontSize: 20,
                            color: '#818CF8',
                            transform: isDark ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0)',
                            opacity: isDark ? 1 : 0,
                            filter: isDark ? 'drop-shadow(0 0 6px rgba(129, 140, 248, 0.45))' : 'none',
                            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease, filter 0.3s ease',
                        }}
                    />
                </IconButton>
            </Tooltip>

            {/* Optional Context Menu for System / Explicit Selection */}
            <Menu
                anchorEl={themeAnchorEl}
                open={openThemeMenu}
                onClose={() => setThemeAnchorEl(null)}
                transformOrigin={{ horizontal: isRTL ? 'left' : 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: isRTL ? 'left' : 'right', vertical: 'bottom' }}
                disableScrollLock
                slotProps={{
                    paper: {
                        elevation: 4,
                        sx: {
                            width: 170,
                            mt: 1,
                            bgcolor: 'background.paper',
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            backgroundImage: 'none',
                            p: 0.5,
                        },
                    },
                }}
            >
                <MenuItem
                    onClick={() => { setMode('light'); setThemeAnchorEl(null); }}
                    selected={mode === 'light'}
                    sx={selectedSx}
                >
                    <LightModeRounded fontSize="small" sx={{ color: '#F59E0B' }} />
                    <Box component="span" sx={{ flexGrow: 1, fontSize: '0.85rem', fontWeight: 600 }}>
                        {t('admin_sidebar.light_mode', 'Light Mode')}
                    </Box>
                    {mode === 'light' && <Check fontSize="small" color="primary" />}
                </MenuItem>
                <MenuItem
                    onClick={() => { setMode('dark'); setThemeAnchorEl(null); }}
                    selected={mode === 'dark'}
                    sx={selectedSx}
                >
                    <DarkModeRounded fontSize="small" sx={{ color: '#818CF8' }} />
                    <Box component="span" sx={{ flexGrow: 1, fontSize: '0.85rem', fontWeight: 600 }}>
                        {t('admin_sidebar.dark_mode', 'Dark Mode')}
                    </Box>
                    {mode === 'dark' && <Check fontSize="small" color="primary" />}
                </MenuItem>
                <MenuItem
                    onClick={() => { setMode('system'); setThemeAnchorEl(null); }}
                    selected={mode === 'system'}
                    sx={selectedSx}
                >
                    <Monitor fontSize="small" sx={{ color: 'text.secondary' }} />
                    <Box component="span" sx={{ flexGrow: 1, fontSize: '0.85rem', fontWeight: 600 }}>
                        {t('admin_sidebar.system_mode', 'System')}
                    </Box>
                    {mode === 'system' && <Check fontSize="small" color="primary" />}
                </MenuItem>
            </Menu>

            {/* Language Switcher Segmented Control */}
            <Box
                role="group"
                aria-label={t('admin_sidebar.language', 'Language')}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: '3px',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                }}
            >
                {languages.map((lang) => {
                    const selected = language === lang.code;
                    return (
                        <Button
                            key={lang.code}
                            size="small"
                            onClick={() => changeLanguage(lang.code)}
                            aria-pressed={selected}
                            sx={{
                                minWidth: 32,
                                height: 30,
                                px: 1,
                                borderRadius: 1.5,
                                textTransform: 'uppercase',
                                fontSize: '0.75rem',
                                fontWeight: selected ? 800 : 600,
                                bgcolor: selected ? 'action.selected' : 'transparent',
                                color: selected ? 'primary.main' : 'text.secondary',
                                transition: 'all 0.15s ease',
                                '&:hover': {
                                    bgcolor: selected ? 'action.selected' : 'action.hover',
                                    color: 'text.primary',
                                },
                            }}
                        >
                            {lang.label}
                        </Button>
                    );
                })}
            </Box>
        </Box>
    );
}
