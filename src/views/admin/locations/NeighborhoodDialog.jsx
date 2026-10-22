import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import fetch from '@/utils/fetch';
import { locationError } from './locationError.js';

export default function NeighborhoodDialog({
    open,
    onClose,
    onSaved,
    cityId,
    cityName,
    initialData = null,
}) {
    const { t } = useTranslation();
    const isEdit = Boolean(initialData?.id);
    const [name, setName] = useState('');
    const [status, setStatus] = useState('active');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    const [nameError, setNameError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            if (initialData) {
                setName(initialData.name || '');
                setStatus(initialData.status || 'active');
                setNotes(initialData.notes || '');
            } else {
                setName('');
                setStatus('active');
                setNotes('');
            }
            setError('');
            setNameError('');
        }
    }, [open, initialData]);

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        const trimmed = String(name || '').trim();
        if (!trimmed) {
            setNameError(t('common.required'));
            return;
        }

        setSaving(true);
        setError('');
        setNameError('');

        try {
            if (isEdit) {
                const res = await fetch.patch(`locations/neighborhoods/${initialData.id}`, {
                    name: trimmed,
                    status,
                    notes: notes.trim() || null,
                });
                onSaved(res.data?.data || { id: initialData.id, name: trimmed, status, notes });
            } else {
                const res = await fetch.post(`locations/cities/${cityId}/neighborhoods`, {
                    name: trimmed,
                    status,
                    notes: notes.trim() || null,
                });
                onSaved(res.data?.data);
            }
            onClose();
        } catch (err) {
            setError(locationError(err, t));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
            <form onSubmit={handleSave} noValidate>
                <DialogTitle>
                    <Typography variant="h6" fontWeight={700}>
                        {isEdit ? t('locations.edit_neighborhood') : t('locations.quick_add_neighborhood')}
                    </Typography>
                    {cityName && (
                        <Typography variant="body2" color="text.secondary">
                            {t('locations.city')}: {cityName}
                        </Typography>
                    )}
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2.5} sx={{ pt: 1 }}>
                        {error && <Alert severity="error">{error}</Alert>}
                        <TextField
                            label={t('locations.name')}
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                if (nameError) setNameError('');
                            }}
                            required
                            autoFocus
                            error={Boolean(nameError)}
                            helperText={nameError}
                            fullWidth
                        />
                        <TextField
                            select
                            label={t('workspace_ui.status')}
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            fullWidth
                        >
                            <MenuItem value="active">{t('locations.statuses.active')}</MenuItem>
                            <MenuItem value="inactive">{t('locations.statuses.inactive')}</MenuItem>
                        </TextField>
                        <TextField
                            label={t('locations.notes')}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            multiline
                            minRows={2}
                            fullWidth
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={onClose} disabled={saving} color="inherit">
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={saving}
                        startIcon={saving ? <CircularProgress size={18} color="inherit" /> : null}
                    >
                        {t('locations.save')}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
