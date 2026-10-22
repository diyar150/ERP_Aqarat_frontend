import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import {
    Alert,
    Box,
    Button,
    Chip,
    IconButton,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import LocationCityOutlinedIcon from '@mui/icons-material/LocationCityOutlined';
import HolidayVillageOutlinedIcon from '@mui/icons-material/HolidayVillageOutlined';
import HomeWorkOutlinedIcon from '@mui/icons-material/HomeWorkOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import PeopleOutlineOutlinedIcon from '@mui/icons-material/PeopleOutlineOutlined';
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined';
import KeyboardArrowUpOutlinedIcon from '@mui/icons-material/KeyboardArrowUpOutlined';
import AddLocationAltOutlinedIcon from '@mui/icons-material/AddLocationAltOutlined';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import fetch from '@/utils/fetch';
import { can } from '@/auth/can';
import { useAuthStore } from '@/store/authStore';
import Can from '@/components/auth/Can.jsx';
import { ActionIconButton } from '@/components/common';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import ListToolbar from '@/components/workspace/ListToolbar.jsx';
import DataTable, { StatusChip } from '@/components/workspace/DataTable.jsx';
import ColumnPicker from '@/components/workspace/ColumnPicker.jsx';
import { useColumnVisibility } from '@/components/workspace/useColumnVisibility.js';
import { usePagedList } from '@/components/workspace/usePagedList.js';
import NeighborhoodDialog from './NeighborhoodDialog.jsx';
import { locationError } from './locationError.js';
import { getMetricColorTokens } from './metricColors.js';

const STATUSES = ['active', 'inactive'];
const STORAGE_KEY = 'erp_locations_table_columns';
const COLUMN_KEYS = ['code', 'status', 'neighborhood_count', 'property_count', 'branch_count', 'party_count'];

function MetricCard({ icon: Icon, label, value, sublabel, color = 'city' }) {
    return (
        <Paper
            variant="outlined"
            sx={{
                p: 2,
                flex: '1 1 180px',
                minWidth: 160,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                position: 'relative',
                overflow: 'hidden',
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
                    width: 44,
                    height: 44,
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
                <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                    {value}
                </Typography>
                {sublabel && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
                        {sublabel}
                    </Typography>
                )}
            </Box>
        </Paper>
    );
}

function exportCsv(items, t) {
    if (!items || items.length === 0) return;
    const headers = [
        t('locations.name'),
        t('locations.code'),
        t('workspace_ui.status'),
        t('locations.neighborhoods'),
        t('locations.properties'),
        t('locations.branches'),
        t('locations.parties'),
    ];
    const rows = items.map((c) => [
        `"${(c.name || '').replace(/"/g, '""')}"`,
        `"${(c.code || '').replace(/"/g, '""')}"`,
        `"${t(`locations.statuses.${c.status}`)}"`,
        c.neighborhood_count || 0,
        c.property_count || 0,
        c.branch_count || 0,
        c.party_count || 0,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `locations-registry-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export default function Index() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const canEdit = can(user, 'location:update');
    const canCreate = can(user, 'location:create');

    const [expandedCityIds, setExpandedCityIds] = useState(() => new Set());
    const [dialogState, setDialogState] = useState({ open: false, cityId: null, cityName: '', initialData: null });
    const [actionNotice, setActionNotice] = useState('');
    const [actionError, setActionError] = useState('');

    const { hidden, toggle, reset } = useColumnVisibility(STORAGE_KEY, COLUMN_KEYS);

    const fetchPage = useCallback(async ({ page, q, filters, sort }) => {
        const params = { page, limit: 25 };
        if (q) params.q = q;
        if (filters.status) params.status = filters.status;
        if (sort) params.sort = sort;
        const res = await fetch.get('locations/cities', { params });
        return res.data?.data || {};
    }, []);

    const list = usePagedList(fetchPage);
    const summary = list.payload?.summary || {
        cities: 0,
        active: 0,
        inactive: 0,
        neighborhoods: 0,
        properties: 0,
        branches: 0,
        parties: 0,
    };

    const toggleExpand = (cityId, event) => {
        if (event) event.stopPropagation();
        setExpandedCityIds((prev) => {
            const next = new Set(prev);
            if (next.has(cityId)) next.delete(cityId);
            else next.add(cityId);
            return next;
        });
    };

    const openAddNeighborhood = (city, event) => {
        if (event) event.stopPropagation();
        setDialogState({
            open: true,
            cityId: city.id,
            cityName: city.name,
            initialData: null,
        });
    };

    const openEditNeighborhood = (city, neighborhood, event) => {
        if (event) event.stopPropagation();
        setDialogState({
            open: true,
            cityId: city.id,
            cityName: city.name,
            initialData: neighborhood,
        });
    };

    const handleNeighborhoodSaved = () => {
        setActionNotice(t('locations.saved'));
        list.reload();
    };

    const handleToggleCityStatus = async (city, event) => {
        if (event) event.stopPropagation();
        if (!canEdit) return;
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
            await fetch.patch(`locations/cities/${city.id}`, { status: nextStatus });
            setActionNotice(t('locations.status_updated'));
            list.reload();
        } catch (err) {
            setActionError(locationError(err, t));
        }
    };

    const handleDeleteCity = async (city, event) => {
        if (event) event.stopPropagation();
        if (!canEdit) return;

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
            await fetch.delete(`locations/cities/${city.id}`);
            setActionNotice(t('locations.delete_success'));
            list.reload();
        } catch (err) {
            setActionError(locationError(err, t));
        }
    };

    const handleDeleteNeighborhood = async (neighborhood, event) => {
        if (event) event.stopPropagation();
        if (!canEdit) return;

        if (neighborhood.in_use_count > 0) {
            Swal.fire({
                icon: 'warning',
                title: t('locations.in_use'),
                text: t('locations.in_use_detailed', { count: `${neighborhood.property_count} ${t('locations.properties')}, ${neighborhood.branch_count} ${t('locations.branches')}` }),
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
            setActionNotice(t('locations.delete_success'));
            list.reload();
        } catch (err) {
            setActionError(locationError(err, t));
        }
    };

    const columns = useMemo(() => {
        const cols = [
            {
                key: 'expand',
                header: '',
                width: 48,
                render: (row) => {
                    const isExpanded = expandedCityIds.has(row.id);
                    const count = row.neighborhood_count || (row.neighborhoods || []).length;
                    return (
                        <Tooltip title={isExpanded ? t('locations.collapse_neighborhoods') : t('locations.expand_neighborhoods')}>
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={(e) => toggleExpand(row.id, e)}
                                    disabled={count === 0 && !canCreate}
                                    sx={{
                                        color: isExpanded ? 'primary.main' : 'text.secondary',
                                        transition: 'transform 0.2s',
                                    }}
                                >
                                    {isExpanded ? <KeyboardArrowUpOutlinedIcon fontSize="small" /> : <KeyboardArrowDownOutlinedIcon fontSize="small" />}
                                </IconButton>
                            </span>
                        </Tooltip>
                    );
                },
            },
            {
                key: 'name',
                header: t('locations.name'),
                render: (row) => (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography fontWeight={600} color="text.primary">
                            {row.name}
                        </Typography>
                        {row.code && (
                            <Chip
                                size="small"
                                label={row.code}
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.72rem', fontWeight: 600, fontFamily: 'monospace' }}
                            />
                        )}
                    </Box>
                ),
            },
        ];

        if (!hidden.includes('code')) {
            cols.push({
                key: 'code',
                header: t('locations.code'),
                render: (row) => (
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                        {row.code || '—'}
                    </Typography>
                ),
            });
        }

        if (!hidden.includes('status')) {
            cols.push({
                key: 'status',
                header: t('workspace_ui.status'),
                render: (row) => (
                    <Box onClick={(e) => canEdit && handleToggleCityStatus(row, e)}>
                        <Tooltip title={canEdit ? t('locations.status_toggle_confirm', { status: row.status === 'active' ? t('locations.statuses.inactive') : t('locations.statuses.active') }) : ''}>
                            <span>
                                <StatusChip status={row.status} label={t(`locations.statuses.${row.status}`)} />
                            </span>
                        </Tooltip>
                    </Box>
                ),
            });
        }

        if (!hidden.includes('neighborhood_count')) {
            cols.push({
                key: 'neighborhood_count',
                header: t('locations.neighborhoods'),
                render: (row) => (
                    <Chip
                        size="small"
                        icon={<HolidayVillageOutlinedIcon sx={{ fontSize: '1rem !important' }} />}
                        label={row.neighborhood_count || 0}
                        onClick={(e) => toggleExpand(row.id, e)}
                        clickable
                        variant="outlined"
                        color={row.neighborhood_count > 0 ? 'default' : 'default'}
                    />
                ),
            });
        }

        if (!hidden.includes('property_count')) {
            cols.push({
                key: 'property_count',
                header: t('locations.properties'),
                render: (row) => (
                    <Button
                        size="small"
                        variant="text"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/properties/index?city=${row.id}`);
                        }}
                        sx={{ minWidth: 40, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
                    >
                        {row.property_count || 0}
                    </Button>
                ),
            });
        }

        if (!hidden.includes('branch_count')) {
            cols.push({
                key: 'branch_count',
                header: t('locations.branches'),
                render: (row) => (
                    <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', px: 1 }}>
                        {row.branch_count || 0}
                    </Typography>
                ),
            });
        }

        if (!hidden.includes('party_count')) {
            cols.push({
                key: 'party_count',
                header: t('locations.parties'),
                render: (row) => (
                    <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', px: 1 }}>
                        {row.party_count || 0}
                    </Typography>
                ),
            });
        }

        cols.push({
            key: 'actions',
            header: t('workspace_ui.actions'),
            pin: 'end',
            render: (row) => (
                <Stack direction="row" spacing={0.5} onClick={(event) => event.stopPropagation()} alignItems="center">
                    {canCreate && (
                        <Tooltip title={t('locations.quick_add_neighborhood')}>
                            <IconButton size="small" color="primary" onClick={(e) => openAddNeighborhood(row, e)}>
                                <AddCircleOutlineOutlinedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                    <ActionIconButton action="view" onClick={() => navigate(`/admin/locations/${row.id}/show`)} />
                    {canEdit && <ActionIconButton action="edit" onClick={() => navigate(`/admin/locations/${row.id}/edit`)} />}
                    {canEdit && (
                        <Tooltip title={row.in_use_count > 0 ? t('locations.in_use') : t('locations.delete_city')}>
                            <span>
                                <IconButton
                                    size="small"
                                    color="error"
                                    disabled={row.in_use_count > 0}
                                    onClick={(e) => handleDeleteCity(row, e)}
                                >
                                    <DeleteOutlineOutlinedIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    )}
                </Stack>
            ),
        });

        return cols;
    }, [hidden, expandedCityIds, canEdit, canCreate, t, navigate]);

    const pickerColumns = useMemo(() => [
        { key: 'code', label: t('locations.code') },
        { key: 'status', label: t('workspace_ui.status') },
        { key: 'neighborhood_count', label: t('locations.neighborhoods') },
        { key: 'property_count', label: t('locations.properties') },
        { key: 'branch_count', label: t('locations.branches') },
        { key: 'party_count', label: t('locations.parties') },
    ], [t]);

    const renderExpandedRow = (city) => {
        const neighborhoods = city.neighborhoods || [];
        return (
            <Box sx={{ p: 2, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <HolidayVillageOutlinedIcon fontSize="small" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#2dd4bf' : '#0f766e' }} />
                            <Typography variant="subtitle2" fontWeight={700}>
                                {t('locations.neighborhoods')} ({neighborhoods.length})
                            </Typography>
                        </Stack>
                        {canCreate && (
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<AddCircleOutlineOutlinedIcon />}
                                onClick={(e) => openAddNeighborhood(city, e)}
                            >
                                {t('locations.add_neighborhood')}
                            </Button>
                        )}
                    </Stack>

                    {neighborhoods.length === 0 ? (
                        <Box sx={{ py: 3, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                                {t('locations.empty_neighborhoods')}
                            </Typography>
                            {canCreate && (
                                <Button
                                    size="small"
                                    variant="text"
                                    startIcon={<AddCircleOutlineOutlinedIcon />}
                                    onClick={(e) => openAddNeighborhood(city, e)}
                                    sx={{ mt: 1 }}
                                >
                                    {t('locations.add_neighborhood')}
                                </Button>
                            )}
                        </Box>
                    ) : (
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'action.hover' }}>
                                    <TableCell>{t('locations.name')}</TableCell>
                                    <TableCell>{t('workspace_ui.status')}</TableCell>
                                    <TableCell align="center">{t('locations.properties')}</TableCell>
                                    <TableCell align="center">{t('locations.branches')}</TableCell>
                                    <TableCell>{t('locations.notes')}</TableCell>
                                    <TableCell align="right">{t('workspace_ui.actions')}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {neighborhoods.map((nbh) => (
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
                                        <TableCell sx={{ color: 'text.secondary', maxWidth: 200 }} noWrap>
                                            {nbh.notes || '—'}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                                                {canEdit && (
                                                    <Tooltip title={t('locations.edit_neighborhood')}>
                                                        <IconButton size="small" onClick={(e) => openEditNeighborhood(city, nbh, e)}>
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
                                                                onClick={(e) => handleDeleteNeighborhood(nbh, e)}
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
                </Paper>
            </Box>
        );
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('locations.title')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        <Button
                            variant="outlined"
                            startIcon={<AssessmentOutlinedIcon />}
                            onClick={() => navigate('/admin/locations/report')}
                        >
                            {t('locations.report')}
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<FileDownloadOutlinedIcon />}
                            onClick={() => exportCsv(list.items, t)}
                            disabled={list.items.length === 0}
                        >
                            {t('locations.export_csv')}
                        </Button>
                        <Can permission="location:create">
                            <Button
                                variant="contained"
                                startIcon={<AddLocationAltOutlinedIcon />}
                                onClick={() => navigate('/admin/locations/create')}
                            >
                                {t('locations.create')}
                            </Button>
                        </Can>
                    </Stack>
                )}
            />

            {actionError && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError('')}>
                    {actionError}
                </Alert>
            )}
            {actionNotice && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setActionNotice('')}>
                    {actionNotice}
                </Alert>
            )}
            {list.error && <Alert severity="error" sx={{ mb: 2 }}>{list.error}</Alert>}

            {/* KPI Summary Cards */}
            <Stack direction="row" spacing={2} sx={{ mb: 2.5 }} useFlexGap flexWrap="wrap">
                <MetricCard
                    icon={LocationCityOutlinedIcon}
                    label={t('locations.summary_cities')}
                    value={summary.cities}
                    sublabel={`${summary.active} ${t('locations.status_active').toLowerCase()} • ${summary.inactive} ${t('locations.status_inactive').toLowerCase()}`}
                    color="city"
                />
                <MetricCard
                    icon={HolidayVillageOutlinedIcon}
                    label={t('locations.summary_neighborhoods')}
                    value={summary.neighborhoods}
                    color="neighborhood"
                />
                <MetricCard
                    icon={HomeWorkOutlinedIcon}
                    label={t('locations.properties')}
                    value={summary.properties}
                    sublabel={summary.unassigned_properties > 0 ? t('locations.unassigned_hint', { count: summary.unassigned_properties }) : null}
                    color="properties"
                />
                <MetricCard
                    icon={BusinessOutlinedIcon}
                    label={t('locations.branches')}
                    value={summary.branches}
                    color="branches"
                />
                <MetricCard
                    icon={PeopleOutlineOutlinedIcon}
                    label={t('locations.parties')}
                    value={summary.parties}
                    color="parties"
                />
            </Stack>

            {/* Toolbar with Search, Status, and Column Picker */}
            <ListToolbar
                search={list.query}
                onSearch={list.setSearch}
                searchPlaceholder={t('locations.filter_search_placeholder')}
                filters={[
                    {
                        key: 'status',
                        label: t('workspace_ui.status'),
                        value: list.filters.status || '',
                        onChange: (value) => list.setFilter('status', value),
                        options: [
                            { value: '', label: t('locations.all_statuses') },
                            ...STATUSES.map((status) => ({
                                value: status,
                                label: t(`locations.statuses.${status}`),
                            })),
                        ],
                    },
                ]}
                action={(
                    <ColumnPicker
                        columns={pickerColumns}
                        hidden={hidden}
                        onToggle={toggle}
                        onReset={reset}
                    />
                )}
            />

            {/* Modern Expandable DataTable */}
            <DataTable
                columns={columns}
                rows={list.items}
                loading={list.loading}
                empty={t('locations.empty')}
                page={list.page}
                limit={list.limit}
                total={list.total}
                onPageChange={list.setPage}
                renderExpanded={renderExpandedRow}
                isRowExpanded={(row) => expandedCityIds.has(row.id)}
                onRowClick={(row) => navigate(`/admin/locations/${row.id}/show`)}
            />

            {/* Quick Add / Edit Neighborhood Modal */}
            <NeighborhoodDialog
                open={dialogState.open}
                onClose={() => setDialogState({ open: false, cityId: null, cityName: '', initialData: null })}
                onSaved={handleNeighborhoodSaved}
                cityId={dialogState.cityId}
                cityName={dialogState.cityName}
                initialData={dialogState.initialData}
            />
        </Box>
    );
}
