/**
 * Expense report — filter bar on top, PDF preview driven by those filters.
 * Route: /admin/expenses/report
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material';
import fetch from '@/utils/fetch';
import { useAuthStore } from '@/store/authStore';
import { currencyLabel, formatPrice, moneyLabel } from '@/utils/money.js';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import ListToolbar from '@/components/workspace/ListToolbar.jsx';
import PdfReportShell from '@/components/common/PdfReportShell.jsx';
import { PdfTable } from '@/components/common/PdfReportTable.jsx';
import PdfReportPreview from '@/components/common/PdfReportPreview.jsx';
import useIsRTL from '@/hooks/useIsRTL';
import { DEFAULT_SUPPLIER_NAME, loadPdfCompany } from '@/utils/pdfCompany';
import { expenseError, expenseNumber, expenseWhen } from './expenseForm.js';

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

export default function ExpenseReport() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const isRTL = useIsRTL();
    const [params, setParams] = useSearchParams();
    const user = useAuthStore((state) => state.user);
    const lockedOffice = user?.branch_id || null;

    const [query, setQuery] = useState(paramFirst(params, 'q', 'search'));
    const [approval, setApproval] = useState(params.get('approval') || '');
    const [category, setCategory] = useState(paramFirst(params, 'category', 'category_id'));
    const [branch, setBranch] = useState(lockedOffice ? String(lockedOffice) : paramFirst(params, 'branch', 'branch_id'));
    const [start, setStart] = useState(paramFirst(params, 'start', 'start_date', 'from'));
    const [end, setEnd] = useState(paramFirst(params, 'end', 'end_date', 'to'));
    const [state, setState] = useState(params.get('state') === 'archived' ? 'archived' : '');

    const [offices, setOffices] = useState([]);
    const [categories, setCategories] = useState([]);
    const [items, setItems] = useState([]);
    const [summary, setSummary] = useState({ expenses: 0, pending: 0, archived: 0, totals: [] });
    const [company, setCompany] = useState({ supplier_name: DEFAULT_SUPPLIER_NAME, address: '' });
    const [brandReady, setBrandReady] = useState(false);
    const [error, setError] = useState('');
    const [loadedKey, setLoadedKey] = useState(null);

    const requestKey = JSON.stringify([query, approval, category, branch, start, end, state]);
    const loading = loadedKey !== requestKey || !brandReady;

    useEffect(() => {
        let active = true;
        Promise.all([
            fetch.get('branches/options'),
            fetch.get('admin/expense-categories/all'),
        ]).then(([branchRes, categoryRes]) => {
            if (!active) return;
            setOffices(branchRes.data?.data?.branches || []);
            setCategories(categoryRes.data?.data || []);
        }).catch(() => {});
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
        if (query) next.set('search', query);
        if (approval) next.set('approval', approval);
        if (category) next.set('category_id', category);
        if (branch && !lockedOffice) next.set('branch_id', branch);
        if (start) next.set('start_date', start);
        if (end) next.set('end_date', end);
        if (state === 'archived') next.set('state', 'archived');
        setParams(next, { replace: true });
    }, [query, approval, category, branch, start, end, state, lockedOffice, setParams]);

    useEffect(() => {
        let active = true;
        const request = { limit: 'all' };
        if (query) {
            request.q = query;
            request.searchType = 'name';
        }
        if (approval) request.approval = approval;
        if (category) request.category = category;
        if (branch) request.branch = branch;
        if (start) request.start = start;
        if (end) request.end = end;
        if (state === 'archived') request.state = 'archived';

        fetch.get('admin/expenses', { params: request })
            .then((res) => {
                if (!active) return;
                const body = res.data?.data || {};
                setItems(body.items || []);
                setSummary(body.summary || { expenses: 0, pending: 0, archived: 0, totals: [] });
                setError('');
                setLoadedKey(requestKey);
            })
            .catch((err) => {
                if (!active) return;
                setError(expenseError(err, t));
                setItems([]);
                setSummary({ expenses: 0, pending: 0, archived: 0, totals: [] });
                setLoadedKey(requestKey);
            });
        return () => { active = false; };
    }, [query, approval, category, branch, start, end, state, requestKey, t]);

    const generated = format(new Date(), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm');

    const filterLines = useMemo(() => [
        query ? `${t('workspace_ui.search')}: ${query}` : '',
        approval ? `${t('expenses.status')}: ${t(`expenses.${approval}`)}` : '',
        category ? `${t('expenses.category')}: ${categories.find((row) => String(row.id) === String(category))?.name || category}` : '',
        branch ? `${t('expenses.branch')}: ${offices.find((row) => String(row.id) === String(branch))?.name || branch}` : '',
        start ? `${t('expenses.start_date')}: ${start}` : '',
        end ? `${t('expenses.end_date')}: ${end}` : '',
        state === 'archived' ? `${t('workspace_ui.status')}: ${t('expenses.archived')}` : '',
    ].filter(Boolean), [query, approval, category, branch, start, end, state, categories, offices, t]);

    const summaryCards = useMemo(() => {
        const totals = summary.totals || [];
        const cards = [
            { label: t('expenses.summary_count'), value: summary.expenses ?? items.length },
            { label: t('expenses.waiting'), value: summary.pending || 0 },
        ];
        if (totals.length === 0) {
            cards.push({ label: t('expenses.total_sum'), value: '—' });
        } else {
            for (const row of totals) {
                const currency = currencyLabel(row.symbol || row.currency_code);
                cards.push({
                    label: currency ? `${t('expenses.total_sum')} · ${currency}` : t('expenses.total_sum'),
                    value: formatPrice(row.total_price),
                });
            }
        }
        return cards;
    }, [summary.expenses, summary.pending, summary.totals, items.length, t]);

    const columns = [
        { key: 'number', header: t('expenses.number'), width: '8%', render: (row) => expenseNumber(row.id) },
        { key: 'name', header: t('expenses.name'), width: '18%', render: (row) => row.name || '—' },
        { key: 'category', header: t('expenses.category'), width: '14%', render: (row) => row.category_name || '—' },
        { key: 'branch', header: t('expenses.branch'), width: '14%', render: (row) => row.branch_name || '—' },
        { key: 'user', header: t('expenses.user'), width: '12%', render: (row) => row.user_name || row.username || '—' },
        {
            key: 'price',
            header: t('expenses.price'),
            width: '14%',
            render: (row) => moneyLabel(row.price, row.currency_symbol || row.currency_code, ''),
        },
        {
            key: 'status',
            header: t('expenses.status'),
            width: '10%',
            render: (row) => t(`expenses.${row.approval_status || 'pending'}`),
        },
        { key: 'date', header: t('expenses.date'), width: '10%', render: (row) => expenseWhen(row.date) || '—' },
    ];

    const pdfDoc = (
        <PdfReportShell
            title={t('expenses.report_title', { defaultValue: t('expenses.report') })}
            company={company}
            filters={filterLines}
            exportDate={generated}
            exportDateLabel={t('expenses.generated_at')}
            addressLabel={t('agency.address', { defaultValue: 'Address:' })}
            isRTL={isRTL}
            summary={summaryCards}
        >
            <PdfTable columns={columns} rows={items} isRTL={isRTL} emptyLabel={t('expenses.no_expenses')} />
        </PdfReportShell>
    );

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('expenses.report_title', { defaultValue: t('expenses.report') })}
                description={t('expenses.report_hint', {
                    defaultValue: 'Expense lines by status, category, branch, and date.',
                })}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Button onClick={() => navigate('/admin/expenses/index')}>{t('common.back')}</Button>
                    </Stack>
                )}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
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
                            key: 'approval',
                            label: t('expenses.status'),
                            value: approval,
                            allLabel: t('expenses.all_statuses'),
                            onChange: setApproval,
                            options: ['pending', 'approved', 'rejected'].map((status) => ({
                                value: status,
                                label: t(`expenses.${status}`),
                            })),
                        },
                        {
                            key: 'category',
                            label: t('expenses.category'),
                            value: category,
                            allLabel: t('expenses.all_categories'),
                            onChange: setCategory,
                            options: categories.map((row) => ({ value: String(row.id), label: row.name })),
                        },
                        ...(lockedOffice ? [] : [{
                            key: 'branch',
                            label: t('expenses.branch'),
                            value: branch,
                            allLabel: t('expenses.all_branches'),
                            onChange: setBranch,
                            options: offices.map((office) => ({ value: String(office.id), label: office.name })),
                        }]),
                        {
                            key: 'start',
                            type: 'date',
                            label: t('expenses.start_date'),
                            value: start,
                            onChange: setStart,
                        },
                        {
                            key: 'end',
                            type: 'date',
                            label: t('expenses.end_date'),
                            value: end,
                            onChange: setEnd,
                        },
                        {
                            key: 'state',
                            label: t('expenses.title'),
                            value: state,
                            allLabel: t('expenses.active'),
                            onChange: setState,
                            options: [{ value: 'archived', label: t('expenses.archived') }],
                        },
                    ]}
                />
            </Box>
            <Paper variant="outlined" sx={{ overflow: 'hidden', minHeight: 520 }}>
                <PdfReportPreview
                    loading={loading}
                    ready={!loading && brandReady}
                    empty={!loading && brandReady && items.length === 0}
                    emptyLabel={t('expenses.no_expenses')}
                    document={pdfDoc}
                />
            </Paper>
        </Box>
    );
}
