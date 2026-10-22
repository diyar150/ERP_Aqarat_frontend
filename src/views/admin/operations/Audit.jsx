import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Chip, Paper, Stack, Typography } from '@mui/material';
import fetch from '@/utils/fetch';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import ListToolbar from '@/components/workspace/ListToolbar.jsx';
import DataTable from '@/components/workspace/DataTable.jsx';
import { usePagedList } from '@/components/workspace/usePagedList.js';

function SummaryCard({ label, value }) {
    return (
        <Paper variant="outlined" sx={{ px: 2, py: 1.5, flex: 1, minWidth: 140 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="h6" fontWeight={700}>{value}</Typography>
        </Paper>
    );
}

function actionKey(action) {
    return String(action || '').replace(/\./g, '_');
}

function formatWhen(value) {
    if (!value) return '—';
    return String(value).replace('T', ' ').slice(0, 19);
}

function metadataPreview(metadata) {
    if (!metadata || typeof metadata !== 'object') return null;
    const entries = Object.entries(metadata).slice(0, 4);
    if (!entries.length) return null;
    return entries.map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`).join(' · ');
}

export default function Audit() {
    const { t, i18n } = useTranslation();

    const fetchPage = useCallback(async ({ page, q, filters }) => {
        const params = { page, limit: 25 };
        if (q) params.q = q;
        if (filters.entity_type) params.entity_type = filters.entity_type;
        const res = await fetch.get('operations/audit', { params });
        return res.data?.data || {};
    }, []);

    const list = usePagedList(fetchPage);
    const entityTypes = list.payload?.summary?.entity_types || [];

    const actionLabel = useCallback((action) => {
        const key = `audit.actions.${actionKey(action)}`;
        return i18n.exists(key) ? t(key) : action;
    }, [i18n, t]);

    const entityLabel = useCallback((entityType) => {
        const key = `audit.entities.${entityType}`;
        return i18n.exists(key) ? t(key) : entityType;
    }, [i18n, t]);

    const columns = useMemo(() => [
        {
            key: 'when',
            locked: true,
            header: t('audit.when'),
            render: (row) => (
                <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatWhen(row.created_at)}
                </Typography>
            ),
        },
        {
            key: 'user',
            header: t('audit.user'),
            render: (row) => row.user_name || (row.user_id != null ? `#${row.user_id}` : t('audit.system')),
        },
        {
            key: 'action',
            locked: true,
            header: t('audit.action'),
            render: (row) => (
                <Typography variant="body2" fontWeight={600}>{actionLabel(row.action)}</Typography>
            ),
        },
        {
            key: 'entity',
            header: t('audit.entity'),
            render: (row) => (
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                    <Chip size="small" variant="outlined" label={entityLabel(row.entity_type)} />
                    {row.entity_id != null ? (
                        <Typography variant="body2" color="text.secondary">#{row.entity_id}</Typography>
                    ) : null}
                </Stack>
            ),
        },
        {
            key: 'details',
            header: t('audit.details'),
            render: (row) => {
                const text = metadataPreview(row.metadata);
                return text
                    ? <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 320, display: 'block' }}>{text}</Typography>
                    : '—';
            },
        },
    ], [actionLabel, entityLabel, t]);

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('audit.title')}
                description={t('audit.hint')}
            />

            {list.error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => list.setError('')}>
                    {list.error || t('audit.load_error')}
                </Alert>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
                <SummaryCard label={t('audit.summary_events')} value={list.total} />
                <SummaryCard label={t('audit.summary_types')} value={entityTypes.length} />
            </Stack>

            <ListToolbar
                search={list.query}
                onSearch={list.setSearch}
                filters={[
                    {
                        key: 'entity_type',
                        label: t('audit.entity'),
                        value: list.filters.entity_type || '',
                        allLabel: t('audit.all_entities'),
                        onChange: (value) => list.setFilter('entity_type', value),
                        options: entityTypes.map((row) => ({
                            value: row.entity_type,
                            label: `${entityLabel(row.entity_type)} (${row.total})`,
                        })),
                    },
                ]}
            />

            <DataTable
                columns={columns}
                rows={list.items}
                loading={list.loading}
                empty={t('audit.empty')}
                page={list.page}
                limit={list.limit}
                total={list.total}
                onPageChange={list.setPage}
            />
        </Box>
    );
}
