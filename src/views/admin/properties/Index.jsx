import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import {
    Alert,
    Box,
    Button,
    IconButton,
    Menu,
    MenuItem,
    Paper,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined';
import HomeWorkOutlinedIcon from '@mui/icons-material/HomeWorkOutlined';
import MonetizationOnOutlinedIcon from '@mui/icons-material/MonetizationOnOutlined';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';

import fetch from '@/utils/fetch';
import { formatPrice, currencyLabel } from '@/utils/money.js';
import { can } from '@/auth/can';
import { useAuthStore } from '@/store/authStore';
import Can from '@/components/auth/Can.jsx';
import { ActionIconButton } from '@/components/common';
import { markersWithPoints } from '@/components/maps/mapDefaults.js';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import ListToolbar from '@/components/workspace/ListToolbar.jsx';
import ColumnPicker from '@/components/workspace/ColumnPicker.jsx';
import DataTable, { StatusChip } from '@/components/workspace/DataTable.jsx';
import { useColumnVisibility } from '@/components/workspace/useColumnVisibility.js';
import { usePagedList } from '@/components/workspace/usePagedList.js';
import { draftReadinessChip } from './propertyReadiness.js';
import { getPropertyColorTokens } from './propertyColors.js';
import { propertyError, propertyWhen } from './propertyError.js';

const PropertyMapView = lazy(() => import('@/components/maps/PropertyMapView.jsx'));

const TYPES = ['apartment', 'house', 'villa', 'land', 'commercial', 'office', 'warehouse', 'building'];
const PURPOSES = ['sale', 'rent', 'sale_or_rent'];
const STATUSES = ['draft', 'available', 'reserved', 'under_contract', 'sold', 'rented', 'inactive', 'archived'];
const OPTIONAL_COLUMNS = ['reference', 'type', 'purpose', 'status', 'price', 'city', 'branch', 'agent', 'when'];
const MAP_PAGE_LIMIT = 100;

function MetricCard({ icon: Icon, label, value, color = 'total', active = false, onClick }) {
    return (
        <Paper
            variant="outlined"
            onClick={onClick}
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
                cursor: onClick ? 'pointer' : 'default',
                borderColor: (theme) => (active ? getPropertyColorTokens(color, theme).hoverBorder : undefined),
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': onClick ? (theme) => {
                    const tokens = getPropertyColorTokens(color, theme);
                    return {
                        borderColor: tokens.hoverBorder,
                        boxShadow: theme.palette.mode === 'dark'
                            ? `0 6px 20px ${tokens.hoverShadow}, 0 2px 6px rgba(0,0,0,0.5)`
                            : `0 6px 20px ${tokens.hoverShadow}, 0 2px 6px rgba(0,0,0,0.05)`,
                        transform: 'translateY(-2px)',
                    };
                } : undefined,
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
                    bgcolor: (theme) => getPropertyColorTokens(color, theme).bgColor,
                    color: (theme) => getPropertyColorTokens(color, theme).iconColor,
                    border: (theme) => `1px solid ${getPropertyColorTokens(color, theme).borderColor}`,
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
                    {value ?? 0}
                </Typography>
            </Box>
        </Paper>
    );
}

function exportCsv(items, t) {
    if (!items || items.length === 0) return;
    const headers = [
        t('properties.reference'),
        t('properties.name'),
        t('properties.type'),
        t('properties.purpose'),
        t('workspace_ui.status'),
        t('properties.price'),
        t('properties.currency', { defaultValue: 'Currency' }),
        t('properties.area'),
        t('properties.city'),
        t('properties.branch'),
        t('properties.agent'),
        t('properties.created'),
    ];
    const rows = items.map((p) => [
        `"${(p.reference_number || '').replace(/"/g, '""')}"`,
        `"${(p.title || '').replace(/"/g, '""')}"`,
        `"${t(`properties.types.${p.property_type}`, p.property_type)}"`,
        `"${t(`properties.purposes.${p.purpose}`, p.purpose)}"`,
        `"${t(`properties.statuses.${p.status}`, p.status)}"`,
        `"${p.price != null && p.price !== '' ? p.price : ''}"`,
        `"${p.currency_code || ''}"`,
        `"${p.area != null && p.area !== '' ? p.area : ''}"`,
        `"${(p.city || '').replace(/"/g, '""')}"`,
        `"${(p.branch_name || '').replace(/"/g, '""')}"`,
        `"${(p.agent_name || '').replace(/"/g, '""')}"`,
        `"${propertyWhen(p.created_at)}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `properties-directory-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function propertyListParams({ page, limit, q, filters, sort }) {
    const params = { page, limit };
    if (q) params.q = q;
    if (filters.status) params.status = filters.status;
    if (filters.purpose) params.purpose = filters.purpose;
    if (filters.property_type) params.property_type = filters.property_type;
    if (filters.branch) params.branch = filters.branch;
    if (filters.city) params.city = filters.city;
    if (filters.city && filters.neighborhood) params.neighborhood = filters.neighborhood;
    if (filters.state === 'archived') params.state = 'archived';
    if (filters.min_price) params.min_price = filters.min_price;
    if (filters.max_price) params.max_price = filters.max_price;
    if (filters.min_area) params.min_area = filters.min_area;
    if (filters.max_area) params.max_area = filters.max_area;
    if (filters.bedrooms) params.bedrooms = filters.bedrooms;
    if (sort) params.sort = sort;
    return params;
}

function filtersFromSearchParams(params) {
    const city = params.get('city') || '';
    const neighborhood = city ? (params.get('neighborhood') || '') : '';
    return {
        status: params.get('status') || '',
        purpose: params.get('purpose') || '',
        property_type: params.get('property_type') || '',
        branch: params.get('branch') || '',
        city,
        neighborhood,
        state: params.get('state') === 'archived' ? 'archived' : '',
        min_price: params.get('min_price') || '',
        max_price: params.get('max_price') || '',
        min_area: params.get('min_area') || '',
        max_area: params.get('max_area') || '',
        bedrooms: params.get('bedrooms') || '',
    };
}

export default function Index() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const user = useAuthStore((state) => state.user);
    const canUpdate = can(user, 'property:update');
    const canArchive = can(user, 'property:archive');
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [notice, setNotice] = useState('');
    const attachId = useRef(null);
    const imageInput = useRef(null);
    const documentInput = useRef(null);
    const [offices, setOffices] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [viewMode, setViewMode] = useState('list');
    const [mapData, setMapData] = useState({ key: null, items: [], total: 0, error: '' });

    useEffect(() => {
        let active = true;
        Promise.all([fetch.get('branches/options'), fetch.get('locations/catalog')])
            .then(([officesRes, placesRes]) => {
                if (!active) return;
                setOffices(officesRes.data?.data?.branches || []);
                setCatalog(placesRes.data?.data?.cities || []);
            })
            .catch(() => {});
        return () => { active = false; };
    }, []);

    const fetchPage = useCallback(async ({ page, q, filters, sort }) => {
        const res = await fetch.get('properties', {
            params: propertyListParams({ page, limit: 25, q, filters, sort }),
        });
        return res.data?.data || {};
    }, []);

    const list = usePagedList(fetchPage, {
        q: params.get('q') || '',
        filters: filtersFromSearchParams(params),
    });

    const { applyQuery } = list;
    useEffect(() => {
        applyQuery({
            q: params.get('q') || '',
            filters: filtersFromSearchParams(params),
        });
    }, [applyQuery, params]);

    const summary = list.payload?.summary || {
        total: 0,
        for_sale: 0,
        for_rent: 0,
        available: 0,
        under_contract: 0,
        draft: 0,
        archived: 0,
    };

    const archived = list.filters.state === 'archived';
    const archivedCount = summary.archived || 0;
    const columns = useColumnVisibility('properties.table.columns.v3', OPTIONAL_COLUMNS);
    const hidden = new Set(columns.hidden);
    const options = (values, group) => values.map((value) => ({ value, label: t(`${group}.${value}`) }));
    const cityOptions = catalog.map((city) => ({ value: String(city.id), label: city.name }));
    const neighborhoodOptions = useMemo(() => {
        const city = catalog.find((item) => String(item.id) === String(list.filters.city));
        return (city?.neighborhoods || []).map((item) => ({ value: String(item.id), label: item.name }));
    }, [catalog, list.filters.city]);

    const setCityFilter = (value) => {
        applyQuery({
            q: list.query,
            filters: { ...list.filters, city: value, neighborhood: '' },
        });
    };

    // Map depends on filters + reload only — not list pagination
    const mapFilterKey = useMemo(() => JSON.stringify({
        q: list.query,
        status: list.filters.status || '',
        purpose: list.filters.purpose || '',
        property_type: list.filters.property_type || '',
        branch: list.filters.branch || '',
        city: list.filters.city || '',
        neighborhood: list.filters.city ? (list.filters.neighborhood || '') : '',
        state: list.filters.state || '',
        reloadKey: list.reloadKey,
    }), [list.query, list.filters, list.reloadKey]);

    const mapReady = mapData.key === mapFilterKey;
    const mapLoading = viewMode === 'map' && !mapReady;
    const mapItems = useMemo(
        () => (mapReady ? mapData.items : []),
        [mapReady, mapData.items],
    );
    const mapError = mapReady ? mapData.error : '';
    const mapTotal = mapReady ? mapData.total : 0;

    useEffect(() => {
        if (viewMode !== 'map') return undefined;
        let active = true;
        const requestKey = mapFilterKey;
        const requestParams = propertyListParams({
            page: 1,
            limit: MAP_PAGE_LIMIT,
            q: list.query,
            filters: list.filters,
        });
        fetch.get('properties', { params: requestParams })
            .then((res) => {
                if (!active) return;
                const data = res.data?.data || {};
                setMapData({
                    key: requestKey,
                    items: data.items || [],
                    total: Number(data.total || 0),
                    error: '',
                });
            })
            .catch((err) => {
                if (!active) return;
                setMapData({
                    key: requestKey,
                    items: [],
                    total: 0,
                    error: err.response?.data?.error?.message || t('login.error'),
                });
            });
        return () => { active = false; };
    }, [viewMode, mapFilterKey, list.query, list.filters, t]);

    const mappedProperties = useMemo(() => markersWithPoints(mapItems), [mapItems]);
    const unmappedCount = mapItems.length - mappedProperties.length;
    const mapTruncated = mapTotal > mapItems.length;

    const openAttach = (event, id) => {
        attachId.current = id;
        setMenuAnchor(event.currentTarget);
    };

    const chooseFile = (kind) => {
        setMenuAnchor(null);
        const input = kind === 'image' ? imageInput.current : documentInput.current;
        if (!input) return;
        input.value = '';
        input.click();
    };

    const upload = async (kind, file) => {
        const id = attachId.current;
        if (!file || !id) return;
        const body = new FormData();
        body.append('file', file);
        setNotice('');
        list.setError('');
        try {
            await fetch.post(kind === 'image' ? `properties/${id}/images` : `properties/${id}/documents?category=ownership`, body);
            setNotice(t('properties.attached', { defaultValue: 'File attached successfully' }));
            list.reload();
        } catch (err) {
            list.setError(propertyError(err, t));
        }
    };

    const handleArchive = async (row, event) => {
        if (event) event.stopPropagation();
        if (!canArchive) return;

        const confirm = await Swal.fire({
            title: t('properties.delete_title'),
            text: t('properties.delete_confirm', { name: row.title }),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: t('common.delete'),
            cancelButtonText: t('common.cancel'),
        });
        if (!confirm.isConfirmed) return;

        list.setError('');
        try {
            await fetch.delete(`properties/${row.id}`);
            Swal.fire({
                icon: 'success',
                title: t('properties.archived'),
                text: `${row.title} has been archived.`,
                timer: 2000,
                showConfirmButton: false,
            });
            list.reload();
        } catch (err) {
            const errorMsg = propertyError(err, t);
            Swal.fire({
                icon: 'error',
                title: t('common.error'),
                text: errorMsg,
                confirmButtonText: t('common.confirm'),
            });
            list.setError(errorMsg);
        }
    };

    const handleRestore = async (row, event) => {
        if (event) event.stopPropagation();
        if (!canArchive) return;

        const confirm = await Swal.fire({
            title: t('properties.restore_title'),
            text: t('properties.restore_confirm', { name: row.title }),
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: t('common.restore'),
            cancelButtonText: t('common.cancel'),
        });
        if (!confirm.isConfirmed) return;

        list.setError('');
        try {
            await fetch.post(`properties/${row.id}/restore`);
            Swal.fire({
                icon: 'success',
                title: t('properties.active'),
                text: `${row.title} has been restored.`,
                timer: 2000,
                showConfirmButton: false,
            });
            list.reload();
        } catch (err) {
            const errorMsg = propertyError(err, t);
            Swal.fire({
                icon: 'error',
                title: t('common.error'),
                text: errorMsg,
                confirmButtonText: t('common.confirm'),
            });
            list.setError(errorMsg);
        }
    };

    const pickerColumns = [
        { key: 'title', label: t('properties.name'), locked: true },
        { key: 'reference', label: t('properties.reference') },
        { key: 'type', label: t('properties.type') },
        { key: 'purpose', label: t('properties.purpose') },
        { key: 'status', label: t('workspace_ui.status') },
        { key: 'price', label: t('properties.price') },
        { key: 'city', label: t('properties.city') },
        { key: 'branch', label: t('properties.branch') },
        { key: 'agent', label: t('properties.agent') },
        { key: 'when', label: t(archived ? 'properties.removed' : 'properties.created') },
        { key: 'actions', label: t('workspace_ui.actions'), locked: true },
    ];

    const tableColumns = [
        {
            key: 'title',
            locked: true,
            header: t('properties.name'),
            render: (row) => (
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                    <Typography fontWeight={600} noWrap>{row.title}</Typography>
                    {row.deleted_at && <StatusChip status="archived" label={t('properties.archived')} />}
                    {!row.deleted_at && draftReadinessChip(row, t) ? (
                        <StatusChip status="draft" label={draftReadinessChip(row, t)} />
                    ) : null}
                </Stack>
            ),
        },
        { key: 'reference', header: t('properties.reference'), render: (row) => row.reference_number },
        { key: 'type', header: t('properties.type'), render: (row) => t(`properties.types.${row.property_type}`) },
        { key: 'purpose', header: t('properties.purpose'), render: (row) => t(`properties.purposes.${row.purpose}`) },
        { key: 'status', header: t('workspace_ui.status'), render: (row) => <StatusChip status={row.status} label={t(`properties.statuses.${row.status}`)} /> },
        { key: 'price', header: t('properties.price'), render: (row) => (row.price ? `${formatPrice(row.price)} ${currencyLabel(row.currency_code)}`.trim() : t('properties.no_price')) },
        { key: 'city', header: t('properties.city'), render: (row) => row.city || '—' },
        { key: 'branch', header: t('properties.branch'), render: (row) => row.branch_name || '—' },
        { key: 'agent', header: t('properties.agent'), render: (row) => row.agent_name || t('properties.no_agent') },
        {
            key: 'when',
            header: t(archived ? 'properties.removed' : 'properties.created'),
            render: (row) => propertyWhen(archived ? row.deleted_at : row.created_at),
        },
        {
            key: 'actions',
            locked: true,
            header: (
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
                    <span>{t('workspace_ui.actions')}</span>
                    <ColumnPicker
                        columns={pickerColumns}
                        hidden={columns.hidden}
                        onToggle={columns.toggle}
                        onReset={columns.reset}
                    />
                </Stack>
            ),
            pin: 'end',
            render: (row) => (
                <Stack direction="row" spacing={0.5} onClick={(event) => event.stopPropagation()}>
                    {archived ? (
                        canArchive && <ActionIconButton action="restore" onClick={(e) => handleRestore(row, e)} />
                    ) : (
                        <>
                            {canUpdate && (
                                <Tooltip title={t('properties.attach')}>
                                    <IconButton size="small" aria-label={t('properties.attach')} onClick={(event) => openAttach(event, row.id)}>
                                        <AttachFileIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            )}
                            <ActionIconButton action="view" onClick={() => navigate(`/admin/properties/${row.id}/show`)} />
                            {canUpdate && <ActionIconButton action="edit" onClick={() => navigate(`/admin/properties/${row.id}/edit`)} />}
                            {canArchive && <ActionIconButton action="delete" onClick={(e) => handleArchive(row, e)} />}
                        </>
                    )}
                </Stack>
            ),
        },
    ];

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            <PageHeader
                title={t('properties.title')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Button
                            variant="outlined"
                            startIcon={<FileDownloadOutlinedIcon />}
                            onClick={() => exportCsv(list.items, t)}
                            disabled={list.loading || !list.items.length}
                        >
                            {t('properties.export_csv')}
                        </Button>

                        <Button
                            variant="outlined"
                            startIcon={<AssessmentOutlinedIcon />}
                            onClick={() => {
                                const next = new URLSearchParams();
                                if (list.query) next.set('q', list.query);
                                if (list.filters.status) next.set('status', list.filters.status);
                                if (list.filters.purpose) next.set('purpose', list.filters.purpose);
                                if (list.filters.property_type) next.set('property_type', list.filters.property_type);
                                if (list.filters.branch) next.set('branch', list.filters.branch);
                                if (list.filters.city) next.set('city', list.filters.city);
                                if (list.filters.neighborhood) next.set('neighborhood', list.filters.neighborhood);
                                if (list.filters.state === 'archived') next.set('state', 'archived');
                                const query = next.toString();
                                navigate(query ? `/admin/properties/report?${query}` : '/admin/properties/report');
                            }}
                        >
                            {t('properties.report')}
                        </Button>

                        <Can permission="property:create">
                            <Button
                                variant="contained"
                                startIcon={<AddCircleOutlineOutlinedIcon />}
                                onClick={() => navigate('/admin/properties/create')}
                            >
                                {t('properties.create')}
                            </Button>
                        </Can>
                    </Stack>
                )}
            />

            {/* 5 Theme-Adaptive Top KPI Metric Cards */}
            <Stack
                direction="row"
                useFlexGap
                spacing={2}
                sx={{ mb: 3, flexWrap: 'wrap', width: '100%' }}
            >
                <MetricCard
                    icon={HomeWorkOutlinedIcon}
                    label={t('properties.summary_properties')}
                    value={summary.total}
                    color="total"
                    active={!list.filters.purpose && !list.filters.status && !archived}
                    onClick={() => {
                        list.setFilter('purpose', '');
                        list.setFilter('status', '');
                        list.setFilter('state', '');
                    }}
                />
                <MetricCard
                    icon={MonetizationOnOutlinedIcon}
                    label={t('properties.for_sale_count')}
                    value={summary.for_sale}
                    color="for_sale"
                    active={list.filters.purpose === 'sale'}
                    onClick={() => {
                        list.setFilter('purpose', list.filters.purpose === 'sale' ? '' : 'sale');
                        list.setFilter('state', '');
                    }}
                />
                <MetricCard
                    icon={KeyOutlinedIcon}
                    label={t('properties.for_rent_count')}
                    value={summary.for_rent}
                    color="for_rent"
                    active={list.filters.purpose === 'rent'}
                    onClick={() => {
                        list.setFilter('purpose', list.filters.purpose === 'rent' ? '' : 'rent');
                        list.setFilter('state', '');
                    }}
                />
                <MetricCard
                    icon={HandshakeOutlinedIcon}
                    label={t('properties.under_contract_count')}
                    value={summary.under_contract}
                    color="under_contract"
                    active={list.filters.status === 'under_contract'}
                    onClick={() => {
                        list.setFilter('status', list.filters.status === 'under_contract' ? '' : 'under_contract');
                        list.setFilter('state', '');
                    }}
                />
                <MetricCard
                    icon={EditNoteOutlinedIcon}
                    label={t('properties.draft_count')}
                    value={summary.draft}
                    color="draft"
                    active={list.filters.status === 'draft'}
                    onClick={() => {
                        list.setFilter('status', list.filters.status === 'draft' ? '' : 'draft');
                        list.setFilter('state', '');
                    }}
                />
            </Stack>

            {list.error && <Alert severity="error" sx={{ mb: 2 }}>{list.error}</Alert>}
            {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}

            <input ref={imageInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload('image', event.target.files?.[0])} />
            <input ref={documentInput} hidden type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => upload('document', event.target.files?.[0])} />
            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
                <MenuItem onClick={() => chooseFile('image')}>{t('properties.upload_image')}</MenuItem>
                <MenuItem onClick={() => chooseFile('document')}>{t('properties.upload_document')}</MenuItem>
            </Menu>

            <ListToolbar
                search={list.query}
                onSearch={list.setSearch}
                filters={[
                    { key: 'status', label: t('workspace_ui.status'), value: list.filters.status || '', onChange: (value) => list.setFilter('status', value), options: options(STATUSES, 'properties.statuses') },
                    { key: 'purpose', label: t('properties.purpose'), value: list.filters.purpose || '', onChange: (value) => list.setFilter('purpose', value), options: options(PURPOSES, 'properties.purposes') },
                    { key: 'property_type', label: t('properties.type'), value: list.filters.property_type || '', onChange: (value) => list.setFilter('property_type', value), options: options(TYPES, 'properties.types') },
                    {
                        key: 'branch',
                        label: t('properties.branch'),
                        value: list.filters.branch || '',
                        allLabel: t('properties.all_branches'),
                        onChange: (value) => list.setFilter('branch', value),
                        options: offices.map((office) => ({ value: String(office.id), label: office.name })),
                    },
                    {
                        key: 'city',
                        label: t('properties.city'),
                        value: list.filters.city || '',
                        allLabel: t('properties.all_cities'),
                        onChange: setCityFilter,
                        options: cityOptions,
                    },
                    {
                        key: 'neighborhood',
                        label: t('properties.neighborhood'),
                        value: list.filters.city ? (list.filters.neighborhood || '') : '',
                        allLabel: t('properties.all_neighborhoods'),
                        disabled: !list.filters.city,
                        onChange: (value) => list.setFilter('neighborhood', value),
                        options: neighborhoodOptions,
                    },
                ]}
                end={(
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <ToggleButtonGroup
                            exclusive
                            size="small"
                            value={viewMode}
                            onChange={(_, value) => {
                                if (value) setViewMode(value);
                            }}
                        >
                            <ToggleButton value="list" aria-label={t('properties.view_list')}>
                                <ViewListOutlinedIcon fontSize="small" sx={{ marginInlineEnd: 0.75 }} />
                                {t('properties.view_list')}
                            </ToggleButton>
                            <ToggleButton value="map" aria-label={t('properties.view_map')}>
                                <MapOutlinedIcon fontSize="small" sx={{ marginInlineEnd: 0.75 }} />
                                {t('properties.view_map')}
                            </ToggleButton>
                        </ToggleButtonGroup>
                        <ToggleButtonGroup
                            exclusive
                            size="small"
                            value={archived ? 'archived' : 'active'}
                            onChange={(_, value) => {
                                if (value) list.setFilter('state', value === 'archived' ? 'archived' : '');
                            }}
                        >
                            <ToggleButton value="active">{t('properties.active')}</ToggleButton>
                            <ToggleButton value="archived">
                                {archivedCount > 0 ? `${t('properties.archived')} (${archivedCount})` : t('properties.archived')}
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Stack>
                )}
            />

            {viewMode === 'map' ? (
                <Stack spacing={1.5} sx={{ width: '100%' }}>
                    {mapError && <Alert severity="error">{mapError}</Alert>}
                    {!mapLoading && mapItems.length > 0 && unmappedCount > 0 && (
                        <Alert severity="info">{t('properties.map_unmapped', { count: unmappedCount })}</Alert>
                    )}
                    {!mapLoading && mapTruncated && (
                        <Alert severity="info">
                            {t('properties.map_truncated', { loaded: mapItems.length, total: mapTotal, limit: MAP_PAGE_LIMIT })}
                        </Alert>
                    )}
                    {!mapLoading && mapItems.length === 0 && !mapError && (
                        <Alert severity="info">{archived ? t('properties.empty_archived') : t('properties.empty')}</Alert>
                    )}
                    <Suspense fallback={<Alert severity="info">{t('common.loading')}</Alert>}>
                        <PropertyMapView
                            properties={mappedProperties}
                            height={540}
                            onOpen={(row) => navigate(`/admin/properties/${row.id}/show`)}
                            emptyLabel={mapLoading ? t('common.loading') : t('properties.map_empty')}
                        />
                    </Suspense>
                    {!mapLoading && mapItems.length > 0 && (
                        <Typography variant="caption" color="text.secondary">
                            {t('properties.map_showing', {
                                shown: mappedProperties.length,
                                total: mapItems.length,
                                matched: mapTotal,
                            })}
                        </Typography>
                    )}
                </Stack>
            ) : (
                <DataTable
                    columns={tableColumns.filter((column) => column.locked || !hidden.has(column.key))}
                    rows={list.items}
                    loading={list.loading}
                    empty={archived ? t('properties.empty_archived') : t('properties.empty')}
                    page={list.page}
                    limit={list.limit}
                    total={list.total}
                    onPageChange={list.setPage}
                    onRowClick={archived ? undefined : (row) => navigate(`/admin/properties/${row.id}/show`)}
                />
            )}
        </Box>
    );
}
