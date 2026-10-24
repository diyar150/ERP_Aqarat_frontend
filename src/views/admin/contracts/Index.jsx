import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Box,
    Button,
    Chip,
    Paper,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
    useTheme,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DescriptionIcon from '@mui/icons-material/Description';
import AddIcon from '@mui/icons-material/Add';
import fetch from '@/utils/fetch';
import { formatPrice, currencyLabel } from '@/utils/money.js';
import { can } from '@/auth/can';
import { useAuthStore } from '@/store/authStore';
import Can from '@/components/auth/Can.jsx';
import { ActionIconButton } from '@/components/common';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import ListToolbar from '@/components/workspace/ListToolbar.jsx';
import ColumnPicker from '@/components/workspace/ColumnPicker.jsx';
import DataTable, { StatusChip } from '@/components/workspace/DataTable.jsx';
import { useColumnVisibility } from '@/components/workspace/useColumnVisibility.js';
import { usePagedList } from '@/components/workspace/usePagedList.js';
import ContractStatusDialog from './ContractStatusDialog.jsx';
import {
    contractAmount,
    contractNumber,
    contractParties,
    contractPeriod,
    contractWhen,
} from './contractForm.js';
import { contractError } from './contractError.js';
import {
    getContractColor,
    getContractMetricCardStyle,
    getContractStatusBadge,
} from './contractColors.js';

const TYPES = ['sale', 'rent'];
const DEAL_STATUSES = ['draft', 'open', 'completed', 'cancelled'];
const TERMS = ['expiring', 'expired'];
const OPTIONAL_COLUMNS = ['type', 'property', 'branch', 'parties', 'period', 'user', 'date'];

/**
 * Modern ERP Interactive Metric Card with Theme Adaptivity & High Contrast.
 */
function KpiMetricCard({ type, label, value, subtitle, isSelected, onClick }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const colors = getContractColor(type, isDark);
    const cardSx = getContractMetricCardStyle(type, isDark, isSelected);

    return (
        <Paper
            variant="outlined"
            onClick={onClick}
            sx={cardSx}
        >
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                <Typography variant="caption" sx={{ color: colors.iconColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {label}
                </Typography>
                {isSelected && (
                    <Chip
                        size="small"
                        label="●"
                        sx={{
                            height: 16,
                            fontSize: '0.65rem',
                            bgcolor: colors.bgColor,
                            color: colors.iconColor,
                            fontWeight: 800,
                        }}
                    />
                )}
            </Stack>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, fontVariantNumeric: 'tabular-nums' }}>
                {value}
            </Typography>
            {subtitle && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                    {subtitle}
                </Typography>
            )}
        </Paper>
    );
}

/**
 * Clickable header that triggers sort toggle (ASC -> DESC -> ASC).
 */
function SortHeader({ label, sortKey, currentSort, onSort }) {
    const isCurrent = currentSort === sortKey || currentSort === `-${sortKey}`;
    const isDesc = currentSort === `-${sortKey}`;
    return (
        <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            onClick={(e) => {
                e.stopPropagation();
                onSort(isCurrent && !isDesc ? `-${sortKey}` : sortKey);
            }}
            sx={{
                cursor: 'pointer',
                userSelect: 'none',
                display: 'inline-flex',
                color: isCurrent ? 'primary.main' : 'inherit',
                fontWeight: isCurrent ? 700 : 600,
                '&:hover': { color: 'primary.main' },
            }}
        >
            <span>{label}</span>
            {isCurrent && (
                <Typography variant="caption" sx={{ fontWeight: 800 }}>
                    {isDesc ? '↓' : '↑'}
                </Typography>
            )}
        </Stack>
    );
}

/**
 * Unicode UTF-8 BOM CSV Export Preserving Arabic/Kurdish in Excel.
 */
function exportContractsCsv(items, t) {
    if (!items || !items.length) return;
    const headers = [
        `"${t('contracts.number')}"`,
        `"${t('contracts.deal')}"`,
        `"${t('contracts.type')}"`,
        `"${t('contracts.status')}"`,
        `"${t('contracts.property')}"`,
        `"${t('contracts.branch')}"`,
        `"${t('contracts.parties')}"`,
        `"${t('contracts.amount')}"`,
        `"${t('contracts.currency') || 'Currency'}"`,
        `"${t('contracts.period')}"`,
        `"${t('contracts.issued_by')}"`,
        `"${t('contracts.date')}"`,
    ];

    const rows = items.map((row) => {
        const amount = row.transaction_type === 'rent' ? row.rent_amount : row.purchase_price;
        const propTitle = [row.property_reference, row.property_title].filter(Boolean).join(' · ');
        const partiesStr = (row.parties || [])
            .map((p) => `${t(`transactions.roles.${p.role}`, { defaultValue: p.role })}: ${p.name}`)
            .join('; ');
        const period = row.transaction_type === 'rent'
            ? `${contractWhen(row.period_start)} – ${contractWhen(row.period_end)}`
            : '';

        return [
            `"${contractNumber(row.id)}"`,
            `"${(row.reference_number || '').replace(/"/g, '""')}"`,
            `"${t(`contracts.${row.transaction_type}`, { defaultValue: row.transaction_type })}"`,
            `"${t(`contracts.${row.status}`, { defaultValue: row.status })}"`,
            `"${propTitle.replace(/"/g, '""')}"`,
            `"${(row.branch_name || '').replace(/"/g, '""')}"`,
            `"${partiesStr.replace(/"/g, '""')}"`,
            `"${amount != null && amount !== '' ? amount : ''}"`,
            `"${row.currency_code || ''}"`,
            `"${period.replace(/"/g, '""')}"`,
            `"${(row.issued_by || '').replace(/"/g, '""')}"`,
            `"${contractWhen(row.created_at)}"`,
        ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `contracts-registry-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export default function Index() {
    const { t } = useTranslation();
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const user = useAuthStore((state) => state.user);
    const canDownload = can(user, 'document:download');
    const canIssue = can(user, 'document:generate');
    const [offices, setOffices] = useState([]);
    const [pending, setPending] = useState(null);
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState('');

    useEffect(() => {
        let active = true;
        fetch.get('branches/options')
            .then((res) => {
                if (active) setOffices(res.data?.data?.branches || []);
            })
            .catch(() => { });
        return () => { active = false; };
    }, []);

    const fetchPage = useCallback(async ({ page, q, filters }) => {
        const queryParams = {
            page,
            limit: 25,
            status: filters.state === 'archived' ? 'archived' : 'active',
        };
        if (q) queryParams.q = q;
        if (filters.sort) queryParams.sort = filters.sort;
        if (filters.type) queryParams.type = filters.type;
        if (filters.deal) queryParams.deal = filters.deal;
        if (filters.term) queryParams.term = filters.term;
        if (filters.branch) queryParams.branch = filters.branch;
        if (filters.from) queryParams.from = filters.from;
        if (filters.to) queryParams.to = filters.to;
        const res = await fetch.get('documents/contracts', { params: queryParams });
        return res.data?.data || {};
    }, []);

    const list = usePagedList(fetchPage, {
        q: params.get('q') || '',
        filters: {
            sort: params.get('sort') || '-created_at',
            type: params.get('type') || '',
            deal: params.get('deal') || '',
            term: params.get('term') || '',
            branch: params.get('branch') || '',
            from: params.get('from') || '',
            to: params.get('to') || '',
            state: (params.get('state') === 'archived' || params.get('status') === 'archived') ? 'archived' : '',
        },
    });

    const { applyQuery } = list;
    useEffect(() => {
        applyQuery({
            q: params.get('q') || '',
            filters: {
                sort: params.get('sort') || '-created_at',
                type: params.get('type') || '',
                deal: params.get('deal') || '',
                term: params.get('term') || '',
                branch: params.get('branch') || '',
                from: params.get('from') || '',
                to: params.get('to') || '',
                state: (params.get('state') === 'archived' || params.get('status') === 'archived') ? 'archived' : '',
            },
        });
    }, [applyQuery, params]);

    const summary = list.payload?.summary || { contracts: 0, sales: 0, rents: 0, active: 0, archived: 0, totals: [] };
    const archived = list.filters.state === 'archived';
    const columns = useColumnVisibility('contracts.table.columns', OPTIONAL_COLUMNS);
    const hidden = new Set(columns.hidden);

    const handleSort = (sortKey) => {
        list.setFilter('sort', sortKey);
    };

    const changeStatus = async () => {
        if (!pending) return;
        setSaving(true);
        list.setError('');
        try {
            await fetch.patch(`documents/contracts/${pending.id}`, {
                template_id: pending.template_id,
                status: archived ? 'active' : 'archived',
                reason: reason.trim(),
                version: pending.row_version,
            });
            setNotice(t(archived ? 'contracts.restored' : 'contracts.archived_notice'));
            setPending(null);
            setReason('');
            list.reload();
        } catch (err) {
            list.setError(contractError(err, t));
        } finally {
            setSaving(false);
        }
    };

    const openReport = () => {
        const urlParams = new URLSearchParams();
        if (list.query) urlParams.set('q', list.query);
        if (list.filters.sort) urlParams.set('sort', list.filters.sort);
        if (list.filters.type) urlParams.set('type', list.filters.type);
        urlParams.set('status', archived ? 'archived' : 'active');
        if (list.filters.deal) urlParams.set('deal', list.filters.deal);
        if (list.filters.term) urlParams.set('term', list.filters.term);
        if (list.filters.branch) urlParams.set('branch', list.filters.branch);
        if (list.filters.from) urlParams.set('from', list.filters.from);
        if (list.filters.to) urlParams.set('to', list.filters.to);
        const query = urlParams.toString();
        navigate(query ? `/admin/contracts/report?${query}` : '/admin/contracts/report');
    };

    const pickerColumns = [
        { key: 'number', label: t('contracts.number'), locked: true },
        { key: 'deal', label: t('contracts.deal'), locked: true },
        { key: 'type', label: t('contracts.type') },
        { key: 'property', label: t('contracts.property') },
        { key: 'branch', label: t('contracts.branch') },
        { key: 'parties', label: t('contracts.parties') },
        { key: 'amount', label: t('contracts.amount'), locked: true },
        { key: 'period', label: t('contracts.period') },
        { key: 'user', label: t('contracts.issued_by') },
        { key: 'date', label: t('contracts.date') },
        { key: 'actions', label: t('workspace_ui.actions'), locked: true },
    ];

    const currentSort = list.filters.sort || '-created_at';

    const tableColumns = [
        {
            key: 'number',
            locked: true,
            header: (
                <SortHeader
                    label={t('contracts.number')}
                    sortKey="contract_number"
                    currentSort={currentSort}
                    onSort={handleSort}
                />
            ),
            render: (row) => {
                const badge = getContractStatusBadge(row.status, isDark);
                return (
                    <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                            {contractNumber(row.id)}
                        </Typography>
                        <Chip
                            size="small"
                            label={t(`contracts.${row.status}`, { defaultValue: row.status })}
                            sx={{
                                height: 20,
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                bgcolor: badge.bg,
                                color: badge.color,
                                border: `1px solid ${badge.border}`,
                            }}
                        />
                    </Stack>
                );
            },
        },
        {
            key: 'deal',
            locked: true,
            header: (
                <SortHeader
                    label={t('contracts.deal')}
                    sortKey="deal_reference"
                    currentSort={currentSort}
                    onSort={handleSort}
                />
            ),
            render: (row) => (
                <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
                    <Typography fontWeight={600}>{row.reference_number || '—'}</Typography>
                    {row.transaction_status && (
                        <StatusChip status={row.transaction_status} label={t(`transactions.statuses.${row.transaction_status}`)} />
                    )}
                </Stack>
            ),
        },
        {
            key: 'type',
            header: (
                <SortHeader
                    label={t('contracts.type')}
                    sortKey="deal_type"
                    currentSort={currentSort}
                    onSort={handleSort}
                />
            ),
            render: (row) => <StatusChip status={row.transaction_type} label={t(`contracts.${row.transaction_type}`)} />,
        },
        {
            key: 'property',
            header: (
                <SortHeader
                    label={t('contracts.property')}
                    sortKey="property"
                    currentSort={currentSort}
                    onSort={handleSort}
                />
            ),
            render: (row) => [row.property_reference, row.property_title].filter(Boolean).join(' · ') || '—',
        },
        { key: 'branch', header: t('contracts.branch'), render: (row) => row.branch_name || '—' },
        { key: 'parties', header: t('contracts.parties'), render: (row) => contractParties(row, t) },
        {
            key: 'amount',
            locked: true,
            header: (
                <SortHeader
                    label={t('contracts.amount')}
                    sortKey="amount"
                    currentSort={currentSort}
                    onSort={handleSort}
                />
            ),
            render: (row) => (
                <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {contractAmount(row)}
                </Typography>
            ),
        },
        {
            key: 'period',
            header: (
                <SortHeader
                    label={t('contracts.period')}
                    sortKey="period_end"
                    currentSort={currentSort}
                    onSort={handleSort}
                />
            ),
            render: (row) => (
                <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
                    <span>{contractPeriod(row)}</span>
                    {(row.term_state === 'expiring' || row.term_state === 'expired') && (
                        <StatusChip status={row.term_state} label={t(`contracts.${row.term_state}`)} />
                    )}
                </Stack>
            ),
        },
        { key: 'user', header: t('contracts.issued_by'), render: (row) => row.issued_by || '—' },
        {
            key: 'date',
            header: (
                <SortHeader
                    label={t('contracts.date')}
                    sortKey="created_at"
                    currentSort={currentSort}
                    onSort={handleSort}
                />
            ),
            render: (row) => contractWhen(row.created_at),
        },
        {
            key: 'actions',
            locked: true,
            header: (
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
                    <span>{t('workspace_ui.actions')}</span>
                    <ColumnPicker columns={pickerColumns} hidden={columns.hidden} onToggle={columns.toggle} onReset={columns.reset} />
                </Stack>
            ),
            pin: 'end',
            render: (row) => (
                <Stack direction="row" spacing={0.5} onClick={(event) => event.stopPropagation()}>
                    <ActionIconButton action="view" onClick={() => navigate(`/admin/contracts/${row.id}/show`)} />
                    {!archived && row.status !== 'signed' && canIssue && (
                        <ActionIconButton action="edit" onClick={() => navigate(`/admin/contracts/${row.id}/edit`)} />
                    )}
                    {canDownload && (
                        <ActionIconButton
                            action="print"
                            title={t('contracts.preview')}
                            onClick={() => navigate(`/admin/contracts/${row.id}/show`)}
                        />
                    )}
                    {canIssue && (
                        <ActionIconButton
                            action={archived ? 'restore' : 'delete'}
                            title={t(archived ? 'contracts.restore' : 'contracts.archive')}
                            onClick={() => { setReason(''); setPending(row); }}
                        />
                    )}
                </Stack>
            ),
        },
    ];

    const totals = summary.totals || [];

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            <PageHeader
                title={t('contracts.title')}
                description={t('contracts.hint')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Button
                            variant="outlined"
                            startIcon={<FileDownloadIcon />}
                            onClick={() => exportContractsCsv(list.items, t)}
                            disabled={list.loading || list.items.length === 0}
                        >
                            {t('contracts.export_csv') || 'Export CSV'}
                        </Button>
                        <Can permission="document:generate">
                            <Button
                                variant="outlined"
                                startIcon={<DescriptionIcon />}
                                onClick={() => navigate('/admin/contracts/templates')}
                            >
                                {t('contracts.templates')}
                            </Button>
                        </Can>
                        <Button
                            variant="outlined"
                            startIcon={<AssessmentIcon />}
                            onClick={openReport}
                        >
                            {t('contracts.report')}
                        </Button>
                        <Can permission="document:generate">
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => navigate('/admin/contracts/create')}
                            >
                                {t('contracts.add_new')}
                            </Button>
                        </Can>
                    </Stack>
                )}
            />
            {list.error && <Alert severity="error" sx={{ mb: 2 }}>{list.error}</Alert>}
            {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}

            {/* 5 Modern Theme-Adaptive KPI Metric Cards */}
            <Stack direction="row" useFlexGap spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap', width: '100%' }}>
                <KpiMetricCard
                    type="total"
                    label={t('contracts.summary_contracts')}
                    value={summary.contracts}
                    subtitle={t('contracts.all_records') || 'All records in register'}
                    isSelected={!list.filters.type && !list.filters.term && list.filters.state !== 'archived'}
                    onClick={() => {
                        list.setFilter('type', '');
                        list.setFilter('term', '');
                        list.setFilter('state', '');
                    }}
                />
                <KpiMetricCard
                    type="active"
                    label={t('contracts.active')}
                    value={summary.active}
                    subtitle={t('contracts.active_signed') || 'Enforceable & signed'}
                    isSelected={list.filters.state !== 'archived' && !list.filters.type && !list.filters.term}
                    onClick={() => {
                        list.setFilter('state', '');
                        list.setFilter('type', '');
                        list.setFilter('term', '');
                    }}
                />
                <KpiMetricCard
                    type="expiring"
                    label={t('contracts.expiring')}
                    value={summary.expiring || 0}
                    subtitle={t('contracts.within_30_days') || 'Expires within 30 days'}
                    isSelected={list.filters.term === 'expiring'}
                    onClick={() => {
                        list.setFilter('term', list.filters.term === 'expiring' ? '' : 'expiring');
                    }}
                />
                <KpiMetricCard
                    type="rent"
                    label={t('contracts.summary_rents')}
                    value={summary.rents || 0}
                    subtitle={t('contracts.lease_agreements') || 'Rental agreements'}
                    isSelected={list.filters.type === 'rent'}
                    onClick={() => {
                        list.setFilter('type', list.filters.type === 'rent' ? '' : 'rent');
                    }}
                />
                <KpiMetricCard
                    type="sale"
                    label={t('contracts.summary_sales')}
                    value={summary.sales || 0}
                    subtitle={t('contracts.sales_contracts') || 'Ownership transfers'}
                    isSelected={list.filters.type === 'sale'}
                    onClick={() => {
                        list.setFilter('type', list.filters.type === 'sale' ? '' : 'sale');
                    }}
                />
            </Stack>

            {/* Currency Totals Strip */}
            {totals.length > 0 && (
                <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }} alignItems="center">
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mr: 0.5 }}>
                        {t('contracts.value_breakdown') || 'Registry Total:'}
                    </Typography>
                    {totals.map((row) => {
                        const currency = currencyLabel(row.symbol || row.currency_code);
                        return (
                            <Chip
                                key={row.currency_code || currency || 'value'}
                                size="small"
                                variant="outlined"
                                label={`${formatPrice(row.total)} ${currency || ''}`}
                                sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                            />
                        );
                    })}
                </Stack>
            )}

            <ListToolbar
                search={list.query}
                onSearch={list.setSearch}
                filters={[
                    {
                        key: 'type',
                        label: t('contracts.type'),
                        value: list.filters.type || '',
                        allLabel: t('contracts.all_types'),
                        onChange: (value) => list.setFilter('type', value),
                        options: TYPES.map((type) => ({ value: type, label: t(`contracts.${type}`) })),
                    },
                    {
                        key: 'deal',
                        label: t('contracts.deal_status'),
                        value: list.filters.deal || '',
                        allLabel: t('contracts.all_statuses'),
                        onChange: (value) => list.setFilter('deal', value),
                        options: DEAL_STATUSES.map((status) => ({ value: status, label: t(`transactions.statuses.${status}`) })),
                    },
                    {
                        key: 'term',
                        label: t('contracts.term'),
                        value: list.filters.term || '',
                        allLabel: t('contracts.all_terms'),
                        onChange: (value) => list.setFilter('term', value),
                        options: TERMS.map((term) => ({ value: term, label: t(`contracts.${term}`) })),
                    },
                    ...(offices.length && !user?.branch_id ? [{
                        key: 'branch',
                        label: t('contracts.branch'),
                        value: list.filters.branch || '',
                        allLabel: t('contracts.all_branches'),
                        onChange: (value) => list.setFilter('branch', value),
                        options: offices.map((office) => ({ value: String(office.id), label: office.name })),
                    }] : []),
                    {
                        key: 'from',
                        type: 'date',
                        label: t('contracts.from'),
                        value: list.filters.from || '',
                        onChange: (value) => list.setFilter('from', value),
                    },
                    {
                        key: 'to',
                        type: 'date',
                        label: t('contracts.to'),
                        value: list.filters.to || '',
                        onChange: (value) => list.setFilter('to', value),
                    },
                ]}
                end={(
                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={archived ? 'archived' : 'active'}
                        onChange={(_, value) => {
                            if (value) list.setFilter('state', value === 'archived' ? 'archived' : '');
                        }}
                    >
                        <ToggleButton value="active">{t('contracts.active')}</ToggleButton>
                        <ToggleButton value="archived">
                            {summary.archived > 0 ? `${t('contracts.archived')} (${summary.archived})` : t('contracts.archived')}
                        </ToggleButton>
                    </ToggleButtonGroup>
                )}
            />
            <DataTable
                columns={tableColumns.filter((column) => column.locked || !hidden.has(column.key))}
                rows={list.items}
                loading={list.loading}
                empty={archived ? t('contracts.empty_archived') : t('contracts.empty')}
                page={list.page}
                limit={list.limit}
                total={list.total}
                onPageChange={list.setPage}
                onRowClick={archived ? undefined : (row) => navigate(`/admin/contracts/${row.id}/show`)}
            />
            <ContractStatusDialog
                open={Boolean(pending)}
                title={t(archived ? 'contracts.restore_title' : 'contracts.archive_title')}
                body={t(archived ? 'contracts.restore_confirm' : 'contracts.archive_confirm', { number: pending ? contractNumber(pending.id) : '' })}
                reason={reason}
                onReason={setReason}
                onClose={() => setPending(null)}
                onConfirm={changeStatus}
                busy={saving}
                confirmLabel={t(archived ? 'contracts.restore' : 'contracts.archive')}
                color={archived ? 'primary' : 'error'}
            />
        </Box>
    );
}
