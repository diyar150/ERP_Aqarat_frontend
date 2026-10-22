import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    CssBaseline,
    IconButton,
    InputAdornment,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import useIsRTL from '@/hooks/useIsRTL';
import { usePlatformAuthStore } from '@/store/platformAuthStore';

export default function PlatformLogin() {
    const { t } = useTranslation();
    const isRTL = useIsRTL();
    const navigate = useNavigate();
    const login = usePlatformAuthStore((state) => state.login);
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showSecret, setShowSecret] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const result = await login(phone.trim(), password);
            if (result.success) {
                navigate('/platform/dashboard');
                return;
            }
            setError(result.message || t('platform.login_error'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Box
            dir={isRTL ? 'rtl' : 'ltr'}
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: { xs: 2, sm: 3 },
                background: `
                    radial-gradient(1000px 500px at 0% 0%, rgba(15, 118, 110, 0.35), transparent 55%),
                    radial-gradient(800px 400px at 100% 10%, rgba(13, 148, 136, 0.18), transparent 50%),
                    linear-gradient(165deg, #071210 0%, #0b1a18 45%, #0a0a0a 100%)
                `,
            }}
        >
            <CssBaseline />
            <Paper
                elevation={0}
                sx={{
                    width: '100%',
                    maxWidth: 420,
                    p: { xs: 3, sm: 4 },
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                }}
            >
                <Stack spacing={0.5} sx={{ mb: 3 }}>
                    <Typography variant="h4" fontWeight={700}>{t('platform.login_title')}</Typography>
                </Stack>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <Box component="form" onSubmit={handleSubmit}>
                    <Stack spacing={2}>
                        <TextField
                            fullWidth
                            required
                            label={t('platform.phone')}
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                            autoComplete="tel"
                            inputProps={{ dir: 'ltr', inputMode: 'tel' }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <PhoneOutlinedIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <TextField
                            fullWidth
                            required
                            type={showSecret ? 'text' : 'password'}
                            label={t('platform.password')}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            autoComplete="current-password"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LockOutlinedIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            edge="end"
                                            onClick={() => setShowSecret((current) => !current)}
                                            aria-label={t('login.toggle_secret')}
                                        >
                                            {showSecret ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Button type="submit" variant="contained" size="large" disabled={submitting}>
                            {submitting ? <CircularProgress size={22} color="inherit" /> : t('platform.login_button')}
                        </Button>
                    </Stack>
                </Box>
            </Paper>
        </Box>
    );
}
