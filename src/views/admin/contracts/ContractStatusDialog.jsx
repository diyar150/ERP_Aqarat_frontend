import {
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    TextField,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function ContractStatusDialog({
    open,
    title,
    body,
    reason,
    onReason,
    onClose,
    onConfirm,
    busy,
    confirmLabel,
    color = 'primary',
}) {
    const { t } = useTranslation();
    return (
        <Dialog
            open={open}
            onClose={() => { if (!busy) onClose(); }}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 2.5, p: 0.5 },
            }}
        >
            <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 2 }}>{body}</DialogContentText>
                <TextField
                    fullWidth
                    autoFocus
                    required
                    label={t('contracts.reason')}
                    placeholder={t('contracts.reason_placeholder') || 'e.g. Agreement fulfilled, mutually cancelled, expired...'}
                    value={reason}
                    onChange={(event) => onReason(event.target.value)}
                    helperText={t('contracts.reason_hint')}
                    disabled={busy}
                />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} disabled={busy}>
                    {t('common.cancel')}
                </Button>
                <Button
                    color={color}
                    variant="contained"
                    onClick={onConfirm}
                    disabled={busy || !reason.trim()}
                    startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
                    sx={{ fontWeight: 700 }}
                >
                    {busy ? t('common.saving', { defaultValue: 'Saving...' }) : confirmLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
