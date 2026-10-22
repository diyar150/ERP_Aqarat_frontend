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
    Divider,
    IconButton,
    MenuItem,
    Paper,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import LocationCityOutlinedIcon from '@mui/icons-material/LocationCityOutlined';
import HolidayVillageOutlinedIcon from '@mui/icons-material/HolidayVillageOutlined';
import HomeWorkOutlinedIcon from '@mui/icons-material/HomeWorkOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import PeopleOutlineOutlinedIcon from '@mui/icons-material/PeopleOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import RemoveCircleOutlineOutlinedIcon from '@mui/icons-material/RemoveCircleOutlineOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import fetch from '@/utils/fetch';
import { can } from '@/auth/can';
import { useAuthStore } from '@/store/authStore';
import Can from '@/components/auth/Can.jsx';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import { StatusChip } from '@/components/workspace/DataTable.jsx';
import NeighborhoodDialog from './NeighborhoodDialog.jsx';
import { locationError } from './locationError.js';
import { getMetricColorTokens } from './metricColors.js';

function StatCard({ icon: Icon, label, value, sublabel, color = 'neighborhood', action }) {
    return (
        <Paper
            variant="outlined"
            sx={{
                p: 2,
                flex: '1 1 200px',
                minWidth: 160,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                borderRadius: 2,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': (theme) => {
                    const tokens = getMetricColorTokens(color, theme);
                    return {
                        borderColor: tokens.hoverBorder,
                        boxShadow: theme.palette.mode === 'dark'
                            ? `0 6px 20px ${tokens.hoverShadow}, 0 2px 6px rgba(0,0,0,0.5)`
                            : `0 6px 20px ${tokens.hoverShadow}, 0 2px 6px rgba(0,0,0,0.05)`,
                        transform: 'translateY(-2px)',
                    };
                },
            }}
        >
            <Box
                sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: (theme) => getMetricColorTokens(color, theme).bgColor,
                    color: (theme) => getMetricColorTokens(color, theme).iconColor,
                    border: (theme) => `1px solid ${getMetricColorTokens(color, theme).borderColor}`,
                    flexShrink: 0,
                    transition: 'all 0.2s ease',
                }}
            >
                <Icon fontSize="medium" />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {label}
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                    {value}
                </Typography>
                {sublabel && (
                    <Typography variant="caption" color="text.secondary">
                        {sublabel}
                    </Typography>
                )}
            </Box>
            {action}
        </Paper>
    );
}

function formatWhen(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString();
}

export default function Show() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();
    const user = useAuthStore((state) => state.user);
    const canEdit = can(user, 'location:update');
    const canCreate = can(user, 'location:create');

    const [city, setCity] = useState(null);
    const [tab, setTab] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const [nbhFilter, setNbhFilter] = useState('');
    const [nbhStatus, setNbhStatus] = useState('');
    const [dialogState, setDialogState] = useState({ open: false, initialData: null });

    const loadCity = async () => {
        try {
            const res = await fetch.get(`locations/cities/${id}`);
            setCity(res.data?.data || null);
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

    const handleToggleStatus = async () => {
        if (!city || !canEdit) return;
        const nextStatus = city.status === 'active' ? 'inactive' : 'active';
        const result = await Swal.fire({
            title: t('locations.status_toggle_confirm', { status: t(`locations.statuses.${nextStatus}`) }),
            text: nextStatus === 'inactive' ? t('locations.deactivate_hint') : '',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: t('common.confirm'),
            cancelButtonText: t('common.cancel'),
        });
        if (!result.isConfirmed) return;

        try {
            await fetch.patch(`locations/cities/${id}`, { status: nextStatus });
            setNotice(t('locations.status_updated'));
            await loadCity();
        } catch (err) {
            setError(locationError(err, t));
        }
    };

    const handleDeleteCity = async () => {
        if (!city || !canEdit) return;

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

    const handleDeleteNeighborhood = async (neighborhood) => {
        if (!canEdit) return;

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

    const filteredNeighborhoods = useMemo(() => {
        if (!city?.neighborhoods) return [];
        return city.neighborhoods.filter((nbh) => {
            const matchesQuery = !nbhFilter || nbh.name.toLowerCase().includes(nbhFilter.toLowerCase());
            const matchesStatus = !nbhStatus || nbh.status === nbhStatus;
            return matchesQuery && matchesStatus;
        });
    }, [city, nbhFilter, nbhStatus]);

    if (loading) {
        return (
            <Box sx={{ p: { xs: 2, md: 3 } }}>
                <Typography color="text.secondary">{t('locations.loading')}</Typography>
            </Box>
        );
    }

    if (!city) {
        return (
            <Box sx={{ p: { xs: 2, md: 3 } }}>
                <Alert severity="error">{error || t('locations.empty')}</Alert>
                <Button sx={{ mt: 2 }} onClick={() => navigate('/admin/locations/index')}>
                    {t('locations.back')}
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            {/* Header */}
            <PageHeader
                title={(
                    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                        <span>{city.name}</span>
                        {city.code && (
                            <Chip
                                label={city.code}
                                variant="outlined"
                                sx={{ fontWeight: 700, fontFamily: 'monospace' }}
                            />
                        )}
                        <StatusChip status={city.status} label={t(`locations.statuses.${city.status}`)} />
                    </Stack>
                )}
                description={t('locations.city_360')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        <Button
                            variant="outlined"
                            startIcon={<ArrowBackOutlinedIcon />}
                            onClick={() => navigate('/admin/locations/index')}
                        >
                            {t('locations.back')}
                        </Button>
                        {canCreate && (
                            <Button
                                variant="outlined"
                                startIcon={<AddCircleOutlineOutlinedIcon />}
                                onClick={() => setDialogState({ open: true, initialData: null })}
                            >
                                {t('locations.add_neighborhood')}
                            </Button>
                        )}
                        {canEdit && (
                            <Button
                                variant="outlined"
                                color={city.status === 'active' ? 'warning' : 'success'}
                                onClick={handleToggleStatus}
                            >
                                {city.status === 'active' ? t('locations.deactivate_city') : t('locations.activate_city')}
                            </Button>
                        )}
                        <Can permission="location:update">
                            <Button
                                variant="contained"
                                startIcon={<EditOutlinedIcon />}
                                onClick={() => navigate(`/admin/locations/${id}/edit`)}
                            >
                                {t('locations.edit_title')}
                            </Button>
                        </Can>
                    </Stack>
                )}
            />

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}
            {notice && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>
                    {notice}
                </Alert>
            )}

            {/* KPI Territory Stat Cards */}
            <Stack direction="row" spacing={2} sx={{ mb: 3 }} useFlexGap flexWrap="wrap">
                <StatCard
                    icon={HolidayVillageOutlinedIcon}
                    label={t('locations.neighborhoods')}
                    value={city.neighborhood_count}
                    color="neighborhood"
                />
                <StatCard
                    icon={HomeWorkOutlinedIcon}
                    label={t('locations.properties')}
                    value={city.property_count}
                    color="properties"
                    action={city.property_count > 0 ? (
                        <IconButton
                            size="small"
                            color="success"
                            onClick={() => navigate(`/admin/properties/index?city=${city.id}`)}
                        >
                            <OpenInNewOutlinedIcon fontSize="small" />
                        </IconButton>
                    ) : null}
                />
                <StatCard
                    icon={BusinessOutlinedIcon}
                    label={t('locations.branches')}
                    value={city.branch_count}
                    color="branches"
                    action={city.branch_count > 0 ? (
                        <IconButton
                            size="small"
                            color="secondary"
                            onClick={() => navigate('/admin/branches')}
                        >
                            <OpenInNewOutlinedIcon fontSize="small" />
                        </IconButton>
                    ) : null}
                />
                <StatCard
                    icon={PeopleOutlineOutlinedIcon}
                    label={t('locations.parties')}
                    value={city.party_count}
                    color="parties"
                    action={city.party_count > 0 ? (
                        <IconButton
                            size="small"
                            color="warning"
                            onClick={() => navigate('/admin/parties')}
                        >
                            <OpenInNewOutlinedIcon fontSize="small" />
                        </IconButton>
                    ) : null}
                />
            </Stack>

            {/* Tabs */}
            <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                <Tabs
                    value={tab}
                    onChange={(_, val) => setTab(val)}
                    sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label={`${t('locations.tab_neighborhoods')} (${city.neighborhoods?.length || 0})`} />
                    <Tab label={t('locations.tab_overview')} />
                    <Tab label={t('locations.tab_linked')} />
                </Tabs>

                {/* Tab 0: Neighborhoods */}
                {tab === 0 && (
                    <Box sx={{ p: { xs: 2, md: 3 } }}>
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            justifyContent="space-between"
                            alignItems={{ sm: 'center' }}
                            spacing={2}
                            sx={{ mb: 2 }}
                        >
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ flex: 1 }}>
                                <TextField
                                    size="small"
                                    placeholder={t('locations.filter_search_placeholder')}
                                    value={nbhFilter}
                                    onChange={(e) => setNbhFilter(e.target.value)}
                                    sx={{ minWidth: 220 }}
                                />
                                <TextField
                                    size="small"
                                    select
                                    label={t('workspace_ui.status')}
                                    value={nbhStatus}
                                    onChange={(e) => setNbhStatus(e.target.value)}
                                    sx={{ minWidth: 140 }}
                                >
                                    <MenuItem value="">{t('locations.all_statuses')}</MenuItem>
                                    <MenuItem value="active">{t('locations.statuses.active')}</MenuItem>
                                    <MenuItem value="inactive">{t('locations.statuses.inactive')}</MenuItem>
                                </TextField>
                            </Stack>
                            {canCreate && (
                                <Button
                                    variant="contained"
                                    startIcon={<AddCircleOutlineOutlinedIcon />}
                                    onClick={() => setDialogState({ open: true, initialData: null })}
                                >
                                    {t('locations.add_neighborhood')}
                                </Button>
                            )}
                        </Stack>

                        {filteredNeighborhoods.length === 0 ? (
                            <Box sx={{ py: 6, textAlign: 'center' }}>
                                <HolidayVillageOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                                <Typography variant="h6" color="text.secondary">
                                    {city.neighborhoods?.length === 0 ? t('locations.empty_neighborhoods') : t('locations.no_results')}
                                </Typography>
                                {city.neighborhoods?.length === 0 && canCreate && (
                                    <Button
                                        variant="outlined"
                                        startIcon={<AddCircleOutlineOutlinedIcon />}
                                        onClick={() => setDialogState({ open: true, initialData: null })}
                                        sx={{ mt: 2 }}
                                    >
                                        {t('locations.add_neighborhood')}
                                    </Button>
                                )}
                            </Box>
                        ) : (
                            <Table size="medium">
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
                                                <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                                                    {nbh.property_count || 0}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                                                    {nbh.branch_count || 0}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ color: 'text.secondary', maxWidth: 260 }} noWrap>
                                                {nbh.notes || '—'}
                                            </TableCell>
                                            <TableCell align="right">
                                                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                    {canEdit && (
                                                        <Tooltip title={t('locations.edit_neighborhood')}>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => setDialogState({ open: true, initialData: nbh })}
                                                            >
                                                                <EditOutlinedIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                    {canEdit && (
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
                                                    )}
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </Box>
                )}

                {/* Tab 1: Overview */}
                {tab === 1 && (
                    <Box sx={{ p: { xs: 2, md: 3 } }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">{t('locations.name')}</Typography>
                                <Typography variant="body1" fontWeight={600}>{city.name}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">{t('locations.code')}</Typography>
                                <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>{city.code || '—'}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">{t('workspace_ui.status')}</Typography>
                                <Box sx={{ mt: 0.5 }}>
                                    <StatusChip status={city.status} label={t(`locations.statuses.${city.status}`)} />
                                </Box>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">{t('locations.created_at')}</Typography>
                                <Typography variant="body1">{formatWhen(city.created_at)}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">{t('locations.neighborhoods')}</Typography>
                                <Typography variant="body1">{city.neighborhood_count}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">{t('locations.properties')}</Typography>
                                <Typography variant="body1">{city.property_count}</Typography>
                            </Box>
                            <Box sx={{ gridColumn: '1 / -1' }}>
                                <Typography variant="caption" color="text.secondary">{t('locations.notes')}</Typography>
                                <Typography variant="body1" sx={{ mt: 0.5, whiteSpace: 'pre-line' }}>
                                    {city.notes || '—'}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                )}

                {/* Tab 2: Linked Records */}
                {tab === 2 && (
                    <Box sx={{ p: { xs: 2, md: 3 } }}>
                        <Stack spacing={2.5}>
                            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight={700}>
                                            {t('locations.properties')} ({city.property_count})
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {t('locations.view_properties')}
                                        </Typography>
                                    </Box>
                                    <Button
                                        variant="outlined"
                                        endIcon={<OpenInNewOutlinedIcon />}
                                        onClick={() => navigate(`/admin/properties/index?city=${city.id}`)}
                                    >
                                        {t('locations.view_properties')}
                                    </Button>
                                </Stack>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight={700}>
                                            {t('locations.branches')} ({city.branch_count})
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {t('locations.view_branches')}
                                        </Typography>
                                    </Box>
                                    <Button
                                        variant="outlined"
                                        endIcon={<OpenInNewOutlinedIcon />}
                                        onClick={() => navigate('/admin/branches')}
                                    >
                                        {t('locations.view_branches')}
                                    </Button>
                                </Stack>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight={700}>
                                            {t('locations.parties')} ({city.party_count})
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {t('locations.view_parties')}
                                        </Typography>
                                    </Box>
                                    <Button
                                        variant="outlined"
                                        endIcon={<OpenInNewOutlinedIcon />}
                                        onClick={() => navigate('/admin/parties')}
                                    >
                                        {t('locations.view_parties')}
                                    </Button>
                                </Stack>
                            </Paper>
                        </Stack>
                    </Box>
                )}
            </Paper>

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
