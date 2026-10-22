import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, IconButton, Menu, MenuItem, Stack, Tooltip, Typography } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import fetch from '@/utils/fetch';
import { formatPrice, currencyLabel } from '@/utils/money.js';
import Can from '@/components/auth/Can.jsx';
import { ActionIconButton } from '@/components/common';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import ListToolbar from '@/components/workspace/ListToolbar.jsx';
import DataTable, { StatusChip } from '@/components/workspace/DataTable.jsx';
import { usePagedList } from '@/components/workspace/usePagedList.js';
import { draftNotReadyMessage, draftReadinessChip } from './propertyReadiness.js';

const TYPES = ['apartment', 'house', 'villa', 'land', 'commercial', 'office', 'warehouse', 'building'];
const PURPOSES = ['sale', 'rent', 'sale_or_rent'];
const STATUSES = ['draft', 'available', 'reserved', 'under_contract', 'sold', 'rented', 'inactive', 'archived'];

export default function Properties() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [notice, setNotice] = useState('');
    const attachId = useRef(null);
    const imageInput = useRef(null);
    const documentInput = useRef(null);

    const fetchPage = useCallback(async ({ page, q, filters }) => {
        const params = { page, limit: 25 };
        if (q) params.q = q;
        if (filters.status) params.status = filters.status;
        if (filters.purpose) params.purpose = filters.purpose;
        if (filters.property_type) params.property_type = filters.property_type;
        const res = await fetch.get('properties', { params });
        return res.data?.data || {};
    }, []);

    const list = usePagedList(fetchPage);
    const options = (values, group) => values.map((value) => ({ value, label: t(`${group}.${value}`) }));
    const draftWarning = useMemo(() => {
        const incomplete = list.items.filter((row) => draftNotReadyMessage(row, t));
        if (!incomplete.length) return '';
        if (incomplete.length === 1) return draftNotReadyMessage(incomplete[0], t);
        return t('properties.not_ready_banner', { count: incomplete.length });
    }, [list.items, t]);

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
            setNotice(t('properties.attached'));
        } catch (err) {
            list.setError(err.response?.data?.error?.message || t('login.error'));
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('properties.title')}
                description={t('workspace_ui.properties_hint')}
                action={(
                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="outlined"
                            onClick={() => {
                                const next = new URLSearchParams();
                                if (list.query) next.set('q', list.query);
                                if (list.filters.status) next.set('status', list.filters.status);
                                if (list.filters.purpose) next.set('purpose', list.filters.purpose);
                                if (list.filters.property_type) next.set('property_type', list.filters.property_type);
                                const query = next.toString();
                                navigate(query ? `/admin/properties/report?${query}` : '/admin/properties/report');
                            }}
                        >
                            {t('properties.report')}
                        </Button>
                        <Can permission="property:create">
                            <Button variant="contained" onClick={() => navigate('/admin/properties/create')}>
                                {t('properties.create')}
                            </Button>
                        </Can>
                    </Stack>
                )}
            />
            {list.error && <Alert severity="error" sx={{ mb: 2 }}>{list.error}</Alert>}
            {draftWarning && <Alert severity="warning" sx={{ mb: 2 }}>{draftWarning}</Alert>}
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
                ]}
            />
            <DataTable
                columns={[
                    { key: 'reference_number', header: t('properties.reference'), render: (row) => row.reference_number },
                    {
                        key: 'title',
                        header: t('properties.name'),
                        render: (row) => (
                            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                                <Typography fontWeight={600} noWrap>{row.title}</Typography>
                                {draftReadinessChip(row, t) ? (
                                    <StatusChip status="draft" label={draftReadinessChip(row, t)} />
                                ) : null}
                            </Stack>
                        ),
                    },
                    { key: 'property_type', header: t('properties.type'), render: (row) => t(`properties.types.${row.property_type}`) },
                    { key: 'purpose', header: t('properties.purpose'), render: (row) => t(`properties.purposes.${row.purpose}`) },
                    { key: 'status', header: t('workspace_ui.status'), render: (row) => <StatusChip status={row.status} label={t(`properties.statuses.${row.status}`)} /> },
                    { key: 'price', header: t('properties.price'), render: (row) => (row.price ? `${formatPrice(row.price)} ${currencyLabel(row.currency_code)}`.trim() : t('properties.no_price')) },
                    { key: 'city', header: t('properties.city'), render: (row) => row.city || '—' },
                    { key: 'agent_name', header: t('properties.agent'), render: (row) => row.agent_name || t('properties.no_agent') },
                    {
                        key: 'actions',
                        header: t('workspace_ui.actions'),
                        pin: 'end',
                        render: (row) => (
                            <Stack direction="row" spacing={0.5} onClick={(event) => event.stopPropagation()}>
                                <Can permission="property:update">
                                    <Tooltip title={t('properties.attach')}>
                                        <IconButton size="small" aria-label={t('properties.attach')} onClick={(event) => openAttach(event, row.id)}>
                                            <AttachFileIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Can>
                                <Can permission="property:update">
                                    <ActionIconButton action="edit" onClick={() => navigate(`/admin/properties/${row.id}/edit`)} />
                                </Can>
                                <ActionIconButton action="view" onClick={() => navigate(`/admin/properties/${row.id}/show`)} />
                            </Stack>
                        ),
                    },
                ]}
                rows={list.items}
                loading={list.loading}
                empty={t('properties.empty')}
                page={list.page}
                limit={list.limit}
                total={list.total}
                onPageChange={list.setPage}
                onRowClick={(row) => navigate(`/admin/properties/${row.id}/show`)}
            />
        </Box>
    );
}
