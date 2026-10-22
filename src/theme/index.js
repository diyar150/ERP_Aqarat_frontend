import { createTheme } from '@mui/material/styles';

/**
 * Build the MUI theme for the current text direction.
 * @param {boolean} isRTL
 */
export function createAppTheme(isRTL) {
    return createTheme({
        cssVariables: {
            colorSchemeSelector: 'data-mui-color-scheme',
        },
        colorSchemes: {
            dark: {
                palette: {
                    primary: { main: '#FAFAFA', contrastText: '#0A0A0A' },
                    background: { default: '#0A0A0A', paper: '#141414' },
                    text: { primary: '#FAFAFA', secondary: '#A1A1AA' },
                    divider: 'rgba(255, 255, 255, 0.1)',
                    action: { hover: '#1F1F1F' },
                },
            },
            light: {
                palette: {
                    primary: { main: '#343434', contrastText: '#FFFFFF' },
                    background: { default: '#FFFFFF', paper: '#FFFFFF' },
                    text: { primary: '#252525', secondary: '#71717A' },
                    divider: '#EBEBEB',
                    action: { hover: '#F4F4F5' },
                },
            },
        },
        direction: isRTL ? 'rtl' : 'ltr',
        typography: {
            fontFamily: isRTL
                ? '"Noto Kufi Arabic", "Rudaw", sans-serif'
                : '"Open Sans", sans-serif',
        },
        shape: {
            borderRadius: 4,
        },
        components: {
            MuiButton: {
                styleOverrides: {
                    root: { borderRadius: 4 },
                },
            },
            MuiTextField: {
                styleOverrides: {
                    root: {
                        '& .MuiOutlinedInput-root': { borderRadius: 4 },
                        '& .MuiFilledInput-root': { borderRadius: 4 },
                        '& .MuiStandardInput-root': { borderRadius: 4 },
                    },
                },
            },
            MuiOutlinedInput: {
                styleOverrides: {
                    root: { borderRadius: 4 },
                },
            },
            MuiFilledInput: {
                styleOverrides: {
                    root: { borderRadius: 4 },
                },
            },
            MuiInput: {
                styleOverrides: {
                    root: { borderRadius: 4 },
                },
            },
            MuiInputBase: {
                styleOverrides: {
                    root: { borderRadius: 4 },
                },
            },
            MuiSelect: {
                styleOverrides: {
                    root: { borderRadius: 4 },
                },
            },
            MuiPaper: {
                styleOverrides: {
                    root: { borderRadius: 4 },
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: { borderRadius: 4 },
                },
            },
            MuiAutocomplete: {
                styleOverrides: {
                    root: { borderRadius: 4 },
                },
            },
            MuiChip: {
                styleOverrides: {
                    root: { borderRadius: 4 },
                },
            },
            MuiAvatar: {
                styleOverrides: {
                    root: { borderRadius: 4 },
                },
            },
            MuiBadge: {
                styleOverrides: {
                    root: { borderRadius: 4 },
                },
            },
        },
    });
}
