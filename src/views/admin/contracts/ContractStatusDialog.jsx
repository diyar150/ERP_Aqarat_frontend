import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';
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
        <Dialog open={open} onClose={() => { if (!busy) onClose(); }}>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <DialogContentText>{body}</DialogContentText>
                <TextField
                    fullWidth
                    sx={{ mt: 2 }}
                    label={t('contracts.reason')}
                    value={reason}
                    onChange={(event) => onReason(event.target.value)}
                    helperText={t('contracts.reason_hint')}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
                <Button color={color} variant="contained" onClick={onConfirm} disabled={busy || !reason.trim()}>
                    {confirmLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
