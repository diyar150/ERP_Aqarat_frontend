import { useEffect, useMemo, useState } from 'react';
import useIsRTL from '@/hooks/useIsRTL';
import { RouterProvider } from 'react-router-dom';
import AppRoutes from '@/routes/AppRoutes';
import { useAuthStore } from '@/store/authStore';
import { usePlatformAuthStore } from '@/store/platformAuthStore';
import { initializeLanguage, useLanguageStore } from '@/store/languageStore';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { CacheProvider } from '@emotion/react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import 'dayjs/locale/ku';
import 'dayjs/locale/ar';
import 'dayjs/locale/en';
import { createAppTheme } from '@/theme';
import { ltrCache, rtlCache } from '@/theme/cache';
const router = AppRoutes();
function App() {
    const refreshUser = useAuthStore((state) => state.refreshUser);
    const refreshAdmin = usePlatformAuthStore((state) => state.refreshAdmin);
    const { language } = useLanguageStore();
    const [appReady, setAppReady] = useState(false);
    const isRTL = useIsRTL();

    useEffect(() => {
        document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
        document.documentElement.setAttribute('lang', language);
    }, [isRTL, language]);

    useEffect(() => {
        let cancelled = false;
        initializeLanguage();

        const readyTimer = setTimeout(() => {
            if (!cancelled) setAppReady(true);
        }, 16000);

        Promise.all([
            refreshUser().catch(() => {}),
            refreshAdmin().catch(() => {}),
        ]).finally(() => {
            if (!cancelled) {
                clearTimeout(readyTimer);
                setAppReady(true);
            }
        });

        return () => {
            cancelled = true;
            clearTimeout(readyTimer);
        };
    }, [refreshUser, refreshAdmin]);

    const theme = useMemo(() => createAppTheme(isRTL), [isRTL]);

    if (!appReady) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <CacheProvider value={isRTL ? rtlCache : ltrCache}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={language === 'ckb' ? 'ku' : language}>
                <ThemeProvider theme={theme} defaultMode="dark" disableTransitionOnChange>
                    <CssBaseline />
                    <RouterProvider router={router} />
                </ThemeProvider>
            </LocalizationProvider>
        </CacheProvider>
    );
}

export default App;
