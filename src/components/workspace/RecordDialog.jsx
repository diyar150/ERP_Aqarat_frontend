import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function RecordDialog({
    open,
    title,
    onClose,
    onSubmit,
    saving = false,
    submitLabel,
    noValidate = false,
    children,
}) {
    const { t } = useTranslation();

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
            <DialogTitle>{title}</DialogTitle>
            <Stack component="form" onSubmit={onSubmit} noValidate={noValidate}>
                <DialogContent>
                    <Stack spacing={2}>{children}</Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={onClose} disabled={saving}>{t('common.cancel')}</Button>
                    <Button type="submit" variant="contained" disabled={saving}>{submitLabel}</Button>
                </DialogActions>
            </Stack>
        </Dialog>
    );
}
