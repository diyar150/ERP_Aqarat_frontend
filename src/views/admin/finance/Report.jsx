/**
 * Finance report — filter bar on top, PDF preview driven by those filters.
 * Route: /admin/finance/report
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material';
import fetch from '@/utils/fetch';
import { useAuthStore } from '@/store/authStore';
import { moneyLabel } from '@/utils/money.js';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import ListToolbar from '@/components/workspace/ListToolbar.jsx';
import PdfReportShell from '@/components/common/PdfReportShell.jsx';
import { PdfTable } from '@/components/common/PdfReportTable.jsx';
import PdfReportPreview from '@/components/common/PdfReportPreview.jsx';
import useIsRTL from '@/hooks/useIsRTL';
import { DEFAULT_SUPPLIER_NAME, loadPdfCompany } from '@/utils/pdfCompany';

const ENTRY_TYPES = ['payment', 'commission', 'expense', 'reversal'];
const STATUSES = ['posted', 'void', 'reversed'];

function SummaryCard({ label, value }) {
    return (
        <Paper variant="outlined" sx={{ px: 2, py: 1.5, flex: '1 1 140px', minWidth: 140 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="h6" fontWeight={700}>{value}</Typography>
        </Paper>
    );
}

function paramFirst(params, ...keys) {
    for (const key of keys) {
        const value = params.get(key);
        if (value) return value;
    }
    return '';
}

function financeError(err, t) {
    return err?.response?.data?.error?.message
        || err?.response?.data?.message
        || t('finance.load_error');
}

function entryLabel(row, t) {
    if (String(row.reference_number || '').startsWith('STAFF-COM-')) {
        return t('finance.staff_commission');
    }
    if (String(row.reference_number || '').startsWith('XFER-')) {
        return t('finance.transfer');
    }
    return t(`finance.types.${row.entry_type}`, { defaultValue: row.entry_type });
}

export default function FinanceReport() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const isRTL = useIsRTL();
    const [params, setParams] = useSearchParams();
    const user = useAuthStore((state) => state.user);
    const lockedOffice = user?.branch_id || null;

    const [query, setQuery] = useState(paramFirst(params, 'q', 'search'));
    const [entryType, setEntryType] = useState(params.get('entry_type') || '');
    const [status, setStatus] = useState(params.get('status') || '');
    const [branch, setBranch] = useState(lockedOffice ? String(lockedOffice) : paramFirst(params, 'branch', 'branch_id'));
    const [start, setStart] = useState(paramFirst(params, 'start', 'from', 'start_date'));
    const [end, setEnd] = useState(paramFirst(params, 'end', 'to', 'end_date'));

    const [offices, setOffices] = useState([]);
    const [items, setItems] = useState([]);
    const [totals, setTotals] = useState(null);
    const [company, setCompany] = useState({ supplier_name: DEFAULT_SUPPLIER_NAME, address: '' });
    const [brandReady, setBrandReady] = useState(false);
    const [error, setError] = useState('');
    const [loadedKey, setLoadedKey] = useState(null);

    const requestKey = JSON.stringify([query, entryType, status, branch, start, end]);
    const loading = loadedKey !== requestKey || !brandReady;

    useEffect(() => {
        let active = true;
        fetch.get('branches/options')
            .then((res) => {
                if (active) setOffices(res.data?.data?.branches || []);
            })
            .catch(() => {});
        loadPdfCompany()
            .then((brand) => {
                if (!active) return;
                setCompany({
                    ...brand,
                    supplier_name: brand.supplier_name || DEFAULT_SUPPLIER_NAME,
                    address: brand.address || '',
                });
            })
            .catch(() => {
                if (active) setCompany({ supplier_name: DEFAULT_SUPPLIER_NAME, address: '' });
            })
            .finally(() => {
                if (active) setBrandReady(true);
            });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        const next = new URLSearchParams();
        if (query) next.set('q', query);
        if (entryType) next.set('entry_type', entryType);
        if (status) next.set('status', status);
        if (branch && !lockedOffice) next.set('branch', branch);
        if (start) next.set('from', start);
        if (end) next.set('to', end);
        setParams(next, { replace: true });
    }, [query, entryType, status, branch, start, end, lockedOffice, setParams]);

    useEffect(() => {
        let active = true;
        const request = { limit: 'all', sort: '-occurred_on' };
        if (query) request.q = query;
        if (entryType) request.entry_type = entryType;
        if (status) request.status = status;
        if (branch) request.branch = branch;
        if (start) request.from = start;
        if (end) request.to = end;

        fetch.get('finance', { params: request })
            .then((res) => {
                if (!active) return;
                const body = res.data?.data || {};
                setItems(body.items || []);
                setTotals(body.totals || null);
                setError('');
                setLoadedKey(requestKey);
            })
            .catch((err) => {
                if (!active) return;
                setError(financeError(err, t));
                setItems([]);
                setTotals(null);
                setLoadedKey(requestKey);
            });
        return () => { active = false; };
    }, [query, entryType, status, branch, start, end, requestKey, t]);

    const generated = format(new Date(), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm');

    const filterLines = useMemo(() => [
        query ? `${t('workspace_ui.search')}: ${query}` : '',
        entryType ? `${t('finance.type')}: ${t(`finance.types.${entryType}`)}` : '',
        status ? `${t('workspace_ui.status')}: ${t(`finance.statuses.${status}`)}` : '',
        branch ? `${t('finance.office')}: ${offices.find((row) => String(row.id) === String(branch))?.name || branch}` : '',
        start ? `${t('operations.from')}: ${start}` : '',
        end ? `${t('operations.to')}: ${end}` : '',
    ].filter(Boolean), [query, entryType, status, branch, start, end, offices, t]);

    const summaryCards = useMemo(() => {
        const byCurrency = totals?.by_currency || [];
        const cards = [
            { label: t('finance.summary_count'), value: items.length },
        ];
        if (byCurrency.length === 0) {
            cards.push(
                { label: t('finance.cash_in'), value: moneyLabel(totals?.cash_in, '') },
                { label: t('finance.cash_out'), value: moneyLabel(totals?.cash_out, '') },
                { label: t('finance.cash_balance'), value: moneyLabel(totals?.cash_balance, '') },
            );
        } else {
            for (const row of byCurrency) {
                cards.push(
                    {
                        label: `${t('finance.cash_in')} (${row.currency_code})`,
                        value: moneyLabel(row.cash_in, row.currency_code),
                    },
                    {
                        label: `${t('finance.cash_out')} (${row.currency_code})`,
                        value: moneyLabel(row.cash_out, row.currency_code),
                    },
                    {
                        label: `${t('finance.cash_balance')} (${row.currency_code})`,
                        value: moneyLabel(row.cash_balance, row.currency_code),
                    },
                );
            }
        }
        return cards;
    }, [items.length, totals, t]);

    const columns = [
        {
            key: 'invoice_id',
            header: t('finance.invoice_id'),
            width: '12%',
            render: (row) => row.invoice_id || `FIN-${row.id}`,
        },
        { key: 'occurred_on', header: t('finance.date'), width: '11%', render: (row) => row.occurred_on || '—' },
        { key: 'reference_number', header: t('finance.reference'), width: '14%', render: (row) => row.reference_number || '—' },
        { key: 'branch_name', header: t('finance.office'), width: '13%', render: (row) => row.branch_name || '—' },
        { key: 'entry_type', header: t('finance.type'), width: '13%', render: (row) => entryLabel(row, t) },
        {
            key: 'direction',
            header: t('finance.direction'),
            width: '10%',
            render: (row) => t(row.direction === 'out' ? 'finance.out' : 'finance.in'),
        },
        {
            key: 'status',
            header: t('workspace_ui.status'),
            width: '11%',
            render: (row) => t(`finance.statuses.${row.status}`, { defaultValue: row.status }),
        },
        {
            key: 'amount',
            header: t('finance.amount'),
            width: '16%',
            render: (row) => moneyLabel(row.amount, row.currency_code, ''),
        },
    ];

    const pdfDoc = (
        <PdfReportShell
            title={t('finance.report_title')}
            company={company}
            filters={filterLines}
            exportDate={generated}
            exportDateLabel={t('finance.generated_at')}
            addressLabel={t('agency.address', { defaultValue: 'Address:' })}
            isRTL={isRTL}
            summary={summaryCards}
        >
            <PdfTable columns={columns} rows={items} isRTL={isRTL} emptyLabel={t('finance.empty')} />
        </PdfReportShell>
    );

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('finance.report_title')}
                description={t('finance.report_hint')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Button onClick={() => navigate('/admin/finance')}>{t('common.back')}</Button>
                    </Stack>
                )}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {start && end && start > end && (
                <Alert severity="warning" sx={{ mb: 2 }}>{t('finance.date_range_error')}</Alert>
            )}
            <Stack direction="row" useFlexGap spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap' }}>
                {summaryCards.map((card) => (
                    <SummaryCard key={card.label} label={card.label} value={card.value} />
                ))}
            </Stack>
            <Box sx={{ mb: 2 }}>
                <ListToolbar
                    search={query}
                    onSearch={setQuery}
                    filters={[
                        {
                            key: 'entry_type',
                            label: t('finance.type'),
                            value: entryType,
                            allLabel: t('finance.all_types'),
                            onChange: setEntryType,
                            options: ENTRY_TYPES.map((type) => ({
                                value: type,
                                label: t(`finance.types.${type}`),
                            })),
                        },
                        {
                            key: 'status',
                            label: t('workspace_ui.status'),
                            value: status,
                            allLabel: t('finance.all_statuses'),
                            onChange: setStatus,
                            options: STATUSES.map((value) => ({
                                value,
                                label: t(`finance.statuses.${value}`),
                            })),
                        },
                        ...(lockedOffice ? [] : [{
                            key: 'branch',
                            label: t('finance.office'),
                            value: branch,
                            allLabel: t('finance.all_offices'),
                            onChange: setBranch,
                            options: offices.map((office) => ({ value: String(office.id), label: office.name })),
                        }]),
                        {
                            key: 'start',
                            type: 'date',
                            label: t('operations.from'),
                            value: start,
                            onChange: setStart,
                        },
                        {
                            key: 'end',
                            type: 'date',
                            label: t('operations.to'),
                            value: end,
                            onChange: setEnd,
                        },
                    ]}
                />
            </Box>
            <Paper variant="outlined" sx={{ overflow: 'hidden', minHeight: 520 }}>
                <PdfReportPreview
                    loading={loading}
                    ready={!loading && brandReady}
                    empty={!loading && brandReady && items.length === 0}
                    emptyLabel={t('finance.empty')}
                    document={pdfDoc}
                />
            </Paper>
        </Box>
    );
}
