import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Typography } from '@mui/material';
import fetch from '@/utils/fetch';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import ListToolbar from '@/components/workspace/ListToolbar.jsx';
import DataTable from '@/components/workspace/DataTable.jsx';
import { usePagedList } from '@/components/workspace/usePagedList.js';

export default function AuditIndex() {
    const { t } = useTranslation();

    const fetchPage = useCallback(async ({ page, q }) => {
        const params = { page, limit: 25 };
        if (q) params.q = q;
        const res = await fetch.get('platform/audit', { params });
        return res.data?.data || {};
    }, []);

    const list = usePagedList(fetchPage);

    const columns = [
        {
            key: 'when',
            locked: true,
            header: t('common.created_at'),
            render: (row) => String(row.created_at || '').replace('T', ' ').slice(0, 19),
        },
        {
            key: 'admin',
            header: t('platform.admin_name'),
            render: (row) => row.admin_name || row.admin_phone || '—',
        },
        {
            key: 'action',
            header: t('platform.audit_action'),
            render: (row) => <Typography fontWeight={600}>{row.action}</Typography>,
        },
        {
            key: 'entity',
            header: t('platform.audit_entity'),
            render: (row) => `${row.entity_type}${row.entity_id != null ? ` #${row.entity_id}` : ''}`,
        },
    ];

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader title={t('platform.audit_title')} description={t('platform.audit_hint')} />
            {list.error && <Alert severity="error" sx={{ mb: 2 }}>{list.error}</Alert>}
            <ListToolbar search={list.query} onSearch={list.setSearch} />
            <DataTable
                columns={columns}
                rows={list.items}
                loading={list.loading}
                empty={t('platform.audit_empty')}
                page={list.page}
                limit={list.limit}
                total={list.total}
                onPageChange={list.setPage}
            />
        </Box>
    );
}
