import { useState } from "react";
import useIsRTL from "@/hooks/useIsRTL";
import {
    Box,
    Button,
    CircularProgress,
    CssBaseline,
    IconButton,
    InputAdornment,
    Paper,
    TextField,
    Typography,
    Alert,
    Stack,
} from "@mui/material";
import {
    EmailOutlined as EmailOutlinedIcon,
    LockOutlined as LockOutlinedIcon,
    VisibilityOutlined as VisibilityOutlinedIcon,
    VisibilityOffOutlined as VisibilityOffOutlinedIcon,
} from "@mui/icons-material";
import { useAuthStore } from "@/store/authStore";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function LoginPage() {
    const { t } = useTranslation();
    const isRTL = useIsRTL();
    const navigate = useNavigate();

    const [emailFocused, setEmailFocused] = useState(false);
    const [secretFocused, setSecretFocused] = useState(false);
    const [showSecret, setShowSecret] = useState(false);

    const [email, setEmail] = useState("");
    const [secret, setSecret] = useState("");
    const [errors, setErrors] = useState({});
    const [generalError, setGeneralError] = useState("");

    const staffLogin = useAuthStore((s) => s.login);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setGeneralError("");
        setSubmitting(true);

        try {
            const result = await staffLogin(email, secret);
            if (result.success) {
                navigate("/admin/dashboard");
                return;
            }
            if (result.errors && typeof result.errors === "object") {
                setErrors(result.errors);
            } else {
                setGeneralError(result.message || t("login.error"));
            }
        } finally {
            setSubmitting(false);
        }
    };

    const emailError = errors.email;
    const secretError = errors.password;

    return (
        <Box
            dir={isRTL ? "rtl" : "ltr"}
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: { xs: 0, sm: 2.5 },
                position: "relative",
                overflow: "hidden",
                background: `
                    radial-gradient(1200px 600px at 10% -10%, rgba(37, 99, 235, 0.5), transparent 55%),
                    radial-gradient(900px 500px at 110% 20%, rgba(56, 189, 248, 0.22), transparent 50%),
                    linear-gradient(165deg, #070d18 0%, #0b1528 42%, #0a0a0a 100%)
                `,
            }}
        >
            <CssBaseline />

            <Box
                aria-hidden
                sx={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0.07,
                    backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)
                    `,
                    backgroundSize: "48px 48px",
                    maskImage: "radial-gradient(ellipse at center, black 20%, transparent 75%)",
                    pointerEvents: "none",
                }}
            />

            <Paper
                elevation={0}
                sx={{
                    width: "100%",
                    maxWidth: 440,
                    minHeight: { xs: "100vh", sm: "auto" },
                    borderRadius: { xs: 0, sm: 3 },
                    p: { xs: 3.5, sm: 4 },
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    bgcolor: "rgba(10, 16, 32, 0.88)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    backdropFilter: "blur(18px)",
                    position: "relative",
                    zIndex: 1,
                    boxShadow: { sm: "0 24px 80px rgba(0,0,0,0.45)" },
                }}
            >
                <Box sx={{ textAlign: "center", mb: 3 }}>
                    <Typography
                        component="h1"
                        sx={{
                            fontWeight: 800,
                            fontSize: { xs: "2rem", sm: "2.25rem" },
                            letterSpacing: "-0.04em",
                            color: "#eef4ff",
                            lineHeight: 1.1,
                            mb: 0.75,
                        }}
                    >
                        Admin
                    </Typography>
                    <Typography variant="body2" sx={{ color: "rgba(226,236,255,0.62)" }}>
                        {t("login.staff_subtitle", { defaultValue: t("login.subtitle") })}
                    </Typography>
                </Box>

                <Box component="form" onSubmit={handleSubmit} noValidate>
                    <TextField
                        fullWidth
                        variant="outlined"
                        label={t("login.identifierPlaceholder", { defaultValue: t("login.emailPlaceholder") })}
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            if (emailError) setErrors((prev) => ({ ...prev, email: "" }));
                        }}
                        error={Boolean(emailError)}
                        helperText={emailError || " "}
                        onFocus={() => setEmailFocused(true)}
                        onBlur={() => setEmailFocused(false)}
                        disabled={submitting}
                        autoFocus
                        slotProps={{
                            label: {
                                shrink: emailFocused || email.length > 0,
                            },
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <EmailOutlinedIcon color={emailError ? "error" : "action"} />
                                    </InputAdornment>
                                ),
                            },
                            htmlInput: {
                                style: { direction: "ltr", textAlign: isRTL ? "right" : "left" },
                                autoComplete: "username",
                                type: "text",
                                inputMode: "email",
                            },
                        }}
                        sx={{
                            mb: 0.5,
                            "& .MuiOutlinedInput-root": {
                                borderRadius: 2,
                                bgcolor: "rgba(255,255,255,0.03)",
                            },
                        }}
                    />

                    <TextField
                        fullWidth
                        variant="outlined"
                        label={t("login.passwordPlaceholder")}
                        type={showSecret ? "text" : "password"}
                        value={secret}
                        onChange={(e) => {
                            setSecret(e.target.value);
                            if (secretError) setErrors((prev) => ({ ...prev, password: "" }));
                        }}
                        error={Boolean(secretError)}
                        helperText={secretError || " "}
                        onFocus={() => setSecretFocused(true)}
                        onBlur={() => setSecretFocused(false)}
                        disabled={submitting}
                        slotProps={{
                            label: {
                                shrink: secretFocused || secret.length > 0,
                            },
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LockOutlinedIcon color={secretError ? "error" : "action"} />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowSecret((v) => !v)}
                                            edge="end"
                                            aria-label={t("login.toggle_secret")}
                                        >
                                            {showSecret
                                                ? <VisibilityOffOutlinedIcon color="action" />
                                                : <VisibilityOutlinedIcon color="action" />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            },
                            htmlInput: {
                                style: { direction: "ltr", textAlign: isRTL ? "right" : "left" },
                                autoComplete: "current-password",
                            },
                        }}
                        sx={{
                            mb: 1,
                            "& .MuiOutlinedInput-root": {
                                borderRadius: 2,
                                bgcolor: "rgba(255,255,255,0.03)",
                            },
                        }}
                    />

                    {generalError && (
                        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                            {generalError}
                        </Alert>
                    )}

                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        disabled={submitting}
                        sx={{
                            mt: 0.5,
                            py: 1.45,
                            borderRadius: 2,
                            fontSize: "1rem",
                            fontWeight: 800,
                            letterSpacing: "0.01em",
                            textTransform: "none",
                            color: "#ffffff",
                            bgcolor: "#3B82F6",
                            boxShadow: "0 10px 30px rgba(37, 99, 235, 0.35)",
                            "&:hover": {
                                bgcolor: "#2563EB",
                                boxShadow: "0 12px 34px rgba(37, 99, 235, 0.45)",
                            },
                        }}
                    >
                        {submitting ? (
                            <Stack direction="row" alignItems="center" gap={1}>
                                <CircularProgress size={20} sx={{ color: "inherit" }} />
                                {t("login.loading")}
                            </Stack>
                        ) : (
                            t("login.button")
                        )}
                    </Button>
                </Box>

                <Typography
                    variant="caption"
                    sx={{
                        mt: 3,
                        textAlign: "center",
                        color: "rgba(226,236,255,0.45)",
                        display: "block",
                    }}
                >
                    {t("login.staff_footer", { defaultValue: t("login.footer", "") })}
                </Typography>
            </Paper>
        </Box>
    );
}
