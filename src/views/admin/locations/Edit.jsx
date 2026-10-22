import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    MenuItem,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import LocationCityOutlinedIcon from '@mui/icons-material/LocationCityOutlined';
import HolidayVillageOutlinedIcon from '@mui/icons-material/HolidayVillageOutlined';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import fetch from '@/utils/fetch';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import { StatusChip } from '@/components/workspace/DataTable.jsx';
import NeighborhoodDialog from './NeighborhoodDialog.jsx';
import { locationError } from './locationError.js';

export default function Edit() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();

    const [city, setCity] = useState({
        name: '',
        code: '',
        status: 'active',
        notes: '',
        neighborhoods: [],
        neighborhood_count: 0,
        property_count: 0,
        branch_count: 0,
        party_count: 0,
        in_use_count: 0,
    });

    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [nbhFilter, setNbhFilter] = useState('');
    const [dialogState, setDialogState] = useState({ open: false, initialData: null });

    const loadCity = async () => {
        try {
            const res = await fetch.get(`locations/cities/${id}`);
            const next = res.data?.data || {};
            setCity({
                name: next.name || '',
                code: next.code || '',
                status: next.status || 'active',
                notes: next.notes || '',
                neighborhoods: next.neighborhoods || [],
                neighborhood_count: next.neighborhood_count || 0,
                property_count: next.property_count || 0,
                branch_count: next.branch_count || 0,
                party_count: next.party_count || 0,
                in_use_count: next.in_use_count || 0,
            });
            setError('');
        } catch (err) {
            setError(locationError(err, t));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCity();
    }, [id]);

    const setField = (key) => (event) => {
        let value = event.target.value;
        if (key === 'code') {
            value = value.toUpperCase();
        }
        setCity((current) => ({ ...current, [key]: value }));
        setFieldErrors((current) => {
            if (!current[key]) return current;
            const next = { ...current };
            delete next[key];
            return next;
        });
    };

    const saveCity = async (event) => {
        event.preventDefault();
        const trimmedName = String(city.name || '').trim();
        if (!trimmedName) {
            setFieldErrors({ name: t('common.required') });
            setError('');
            setNotice('');
            return;
        }

        setSaving(true);
        setError('');
        setNotice('');
        setFieldErrors({});

        try {
            const res = await fetch.patch(`locations/cities/${id}`, {
                name: trimmedName,
                code: city.code.trim() || null,
                status: city.status,
                notes: city.notes.trim() || null,
            });
            const next = res.data?.data;
            setCity((prev) => ({
                ...prev,
                name: next.name || '',
                code: next.code || '',
                status: next.status || 'active',
                notes: next.notes || '',
            }));
            setNotice(t('locations.saved'));
        } catch (err) {
            setError(locationError(err, t));
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteNeighborhood = async (neighborhood) => {
        if (neighborhood.in_use_count > 0) {
            Swal.fire({
                icon: 'warning',
                title: t('locations.in_use'),
                text: t('locations.in_use_detailed', {
                    count: `${neighborhood.property_count} ${t('locations.properties')}, ${neighborhood.branch_count} ${t('locations.branches')}`,
                }),
                confirmButtonText: t('common.confirm'),
            });
            return;
        }

        const result = await Swal.fire({
            title: t('locations.delete_neighborhood_confirm'),
            text: t('locations.delete_neighborhood_warning'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: t('locations.delete_neighborhood'),
            cancelButtonText: t('common.cancel'),
        });
        if (!result.isConfirmed) return;

        try {
            await fetch.delete(`locations/neighborhoods/${neighborhood.id}`);
            setNotice(t('locations.delete_success'));
            await loadCity();
        } catch (err) {
            setError(locationError(err, t));
        }
    };

    const handleDeleteCity = async () => {
        if (city.in_use_count > 0) {
            Swal.fire({
                icon: 'warning',
                title: t('locations.in_use'),
                text: t('locations.deactivate_hint'),
                confirmButtonText: t('common.confirm'),
            });
            return;
        }

        const result = await Swal.fire({
            title: t('locations.delete_city_confirm'),
            text: t('locations.delete_city_warning'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: t('locations.delete_city'),
            cancelButtonText: t('common.cancel'),
        });
        if (!result.isConfirmed) return;

        try {
            await fetch.delete(`locations/cities/${id}`);
            navigate('/admin/locations/index');
        } catch (err) {
            setError(locationError(err, t));
        }
    };

    const filteredNeighborhoods = useMemo(() => {
        if (!city?.neighborhoods) return [];
        if (!nbhFilter.trim()) return city.neighborhoods;
        return city.neighborhoods.filter((n) => n.name.toLowerCase().includes(nbhFilter.toLowerCase()));
    }, [city.neighborhoods, nbhFilter]);

    const cityInUse = city.in_use_count > 0;

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('locations.edit_title')}
                description={t('locations.hint')}
                action={(
                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="outlined"
                            startIcon={<ArrowBackOutlinedIcon />}
                            onClick={() => navigate('/admin/locations/index')}
                        >
                            {t('locations.back')}
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<VisibilityOutlinedIcon />}
                            onClick={() => navigate(`/admin/locations/${id}/show`)}
                        >
                            {t('locations.show_title')}
                        </Button>
                    </Stack>
                )}
            />

            {error && (
                <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}
            {notice && (
                <Alert severity="success" sx={{ mb: 2.5 }} onClose={() => setNotice('')}>
                    {notice}
                </Alert>
            )}

            {!loading && (
                <Stack spacing={3} sx={{ width: '100%' }}>
                    {/* City Details */}
                    <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 2 }}>
                        <Stack component="form" spacing={2.5} onSubmit={saveCity} noValidate>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <LocationCityOutlinedIcon sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#60a5fa' : '#1d4ed8' }} />
                                <Typography variant="h6" fontWeight={700}>
                                    {t('locations.details')}
                                </Typography>
                            </Stack>

                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 0.8fr 1fr' }, gap: 2.5 }}>
                                <TextField
                                    label={t('locations.name')}
                                    value={city.name}
                                    onChange={setField('name')}
                                    required
                                    error={Boolean(fieldErrors.name)}
                                    helperText={fieldErrors.name}
                                    fullWidth
                                />
                                <TextField
                                    label={t('locations.code')}
                                    value={city.code}
                                    onChange={setField('code')}
                                    helperText={t('locations.code_hint')}
                                    slotProps={{ htmlInput: { dir: 'ltr', maxLength: 20 } }}
                                    fullWidth
                                />
                                <TextField
                                    select
                                    label={t('workspace_ui.status')}
                                    value={city.status}
                                    onChange={setField('status')}
                                    fullWidth
                                >
                                    <MenuItem value="active">{t('locations.statuses.active')}</MenuItem>
                                    <MenuItem value="inactive">{t('locations.statuses.inactive')}</MenuItem>
                                </TextField>
                                <TextField
                                    label={t('locations.notes')}
                                    value={city.notes}
                                    onChange={setField('notes')}
                                    multiline
                                    minRows={3}
                                    sx={{ gridColumn: '1 / -1' }}
                                    fullWidth
                                />
                            </Box>

                            <Box sx={{ pt: 1 }}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    size="large"
                                    disabled={saving}
                                    startIcon={saving ? <CircularProgress size={20} color="inherit" /> : null}
                                >
                                    {t('locations.save')}
                                </Button>
                            </Box>
                        </Stack>
                    </Paper>

                    {/* Neighborhoods Management */}
                    <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 2 }}>
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            justifyContent="space-between"
                            alignItems={{ sm: 'center' }}
                            spacing={2}
                            sx={{ mb: 2 }}
                        >
                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <HolidayVillageOutlinedIcon sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#2dd4bf' : '#0f766e' }} />
                                <Typography variant="h6" fontWeight={700}>
                                    {t('locations.neighborhoods')} ({city.neighborhoods.length})
                                </Typography>
                            </Stack>

                            <Stack direction="row" spacing={1.5}>
                                <TextField
                                    size="small"
                                    placeholder={t('locations.filter_search_placeholder')}
                                    value={nbhFilter}
                                    onChange={(e) => setNbhFilter(e.target.value)}
                                    sx={{ width: { xs: '100%', sm: 260 } }}
                                />
                                <Button
                                    variant="outlined"
                                    startIcon={<AddCircleOutlineOutlinedIcon />}
                                    onClick={() => setDialogState({ open: true, initialData: null })}
                                >
                                    {t('locations.add_neighborhood')}
                                </Button>
                            </Stack>
                        </Stack>

                        {filteredNeighborhoods.length === 0 ? (
                            <Box sx={{ py: 4, textAlign: 'center' }}>
                                <Typography color="text.secondary">
                                    {city.neighborhoods.length === 0 ? t('locations.empty_neighborhoods') : t('locations.no_results')}
                                </Typography>
                            </Box>
                        ) : (
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                                        <TableCell sx={{ fontWeight: 600 }}>{t('locations.name')}</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>{t('workspace_ui.status')}</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 600 }}>{t('locations.properties')}</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 600 }}>{t('locations.branches')}</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>{t('locations.notes')}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 600 }}>{t('workspace_ui.actions')}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredNeighborhoods.map((nbh) => (
                                        <TableRow key={nbh.id} hover>
                                            <TableCell sx={{ fontWeight: 600 }}>{nbh.name}</TableCell>
                                            <TableCell>
                                                <StatusChip status={nbh.status} label={t(`locations.statuses.${nbh.status}`)} />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                                    {nbh.property_count || 0}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                                    {nbh.branch_count || 0}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ color: 'text.secondary', maxWidth: 220 }} noWrap>
                                                {nbh.notes || '—'}
                                            </TableCell>
                                            <TableCell align="right">
                                                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                    <Tooltip title={t('locations.edit_neighborhood')}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => setDialogState({ open: true, initialData: nbh })}
                                                        >
                                                            <EditOutlinedIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title={nbh.in_use_count > 0 ? t('locations.in_use') : t('locations.delete_neighborhood')}>
                                                        <span>
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                disabled={nbh.in_use_count > 0}
                                                                onClick={() => handleDeleteNeighborhood(nbh)}
                                                            >
                                                                <DeleteOutlineOutlinedIcon fontSize="small" />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </Paper>

                    {/* Danger Zone */}
                    <Paper
                        variant="outlined"
                        sx={{
                            p: { xs: 2.5, md: 3 },
                            borderRadius: 2,
                            borderColor: 'error.main',
                            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(211, 47, 47, 0.04)' : 'rgba(211, 47, 47, 0.02)',
                        }}
                    >
                        <Stack spacing={2}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <WarningAmberOutlinedIcon color="error" />
                                <Typography variant="h6" fontWeight={700} color="error.main">
                                    {t('locations.danger_zone')}
                                </Typography>
                            </Stack>

                            <Typography variant="body2" color="text.secondary">
                                {cityInUse
                                    ? t('locations.in_use_detailed', {
                                        count: `${city.neighborhood_count} ${t('locations.neighborhoods')}, ${city.property_count} ${t('locations.properties')}, ${city.branch_count} ${t('locations.branches')}, ${city.party_count} ${t('locations.parties')}`,
                                    })
                                    : t('locations.delete_city_warning')}
                            </Typography>

                            <Box>
                                <Button
                                    variant="outlined"
                                    color="error"
                                    disabled={cityInUse}
                                    startIcon={<DeleteOutlineOutlinedIcon />}
                                    onClick={handleDeleteCity}
                                >
                                    {t('locations.delete_city')}
                                </Button>
                            </Box>
                        </Stack>
                    </Paper>
                </Stack>
            )}

            {/* Neighborhood Dialog */}
            <NeighborhoodDialog
                open={dialogState.open}
                onClose={() => setDialogState({ open: false, initialData: null })}
                onSaved={() => {
                    setNotice(t('locations.saved'));
                    loadCity();
                }}
                cityId={id}
                cityName={city.name}
                initialData={dialogState.initialData}
            />
        </Box>
    );
}
