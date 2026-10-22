import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';
import HomeWorkOutlinedIcon from '@mui/icons-material/HomeWorkOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';

import fetch from '@/utils/fetch';
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
import { PARTY_ROLES, PIPELINE_STAGES, partyError, partyWhen } from './partyForm.js';
import { getPartyColorTokens } from './partyColors.js';

const KINDS = ['person', 'organization'];
const OPTIONAL_COLUMNS = ['stage', 'phone', 'email', 'city', 'when'];

function MetricCard({ icon: Icon, label, value, color = 'total' }) {
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
                    const tokens = getPartyColorTokens(color, theme);
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
                    bgcolor: (theme) => getPartyColorTokens(color, theme).bgColor,
                    color: (theme) => getPartyColorTokens(color, theme).iconColor,
                    border: (theme) => `1px solid ${getPartyColorTokens(color, theme).borderColor}`,
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

function RoleLabel({ roles, t }) {
    const names = roles || [];
    if (!names.length) return '—';
    const primary = names[0];
    const extra = names.length - 1;
    return (
        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ alignItems: 'center' }}>
            <Chip size="small" label={t(`parties.roles.${primary}`, primary)} variant="outlined" />
            {extra > 0 ? (
                <Typography variant="caption" color="text.secondary">+{extra}</Typography>
            ) : null}
        </Stack>
    );
}

function PipelineStageChip({ stage, t }) {
    if (!stage) return '—';
    let color = 'default';
    if (stage === 'won') color = 'success';
    else if (stage === 'lost') color = 'error';
    else if (stage === 'negotiating') color = 'info';
    else if (stage === 'viewing') color = 'primary';
    else if (stage === 'lead' || stage === 'qualified') color = 'warning';

    const label = t(`parties.pipeline_stages.${stage}`, t(`reports_suite.${stage}`, stage));
    return <Chip size="small" label={label} color={color} variant="outlined" />;
}

function exportCsv(items, t) {
    if (!items || items.length === 0) return;
    const headers = [
        t('parties.name'),
        t('parties.kind'),
        t('parties.roles_label'),
        t('parties.pipeline_stage', { defaultValue: 'Stage' }),
        t('parties.phone'),
        t('parties.email'),
        t('parties.branch'),
        t('parties.city'),
        t('parties.created'),
    ];
    const rows = items.map((p) => [
        `"${(p.display_name || '').replace(/"/g, '""')}"`,
        `"${t(p.party_kind === 'organization' ? 'parties.organization' : 'parties.person')}"`,
        `"${(p.roles || []).map((r) => t(`parties.roles.${r}`, r)).join(', ')}"`,
        `"${p.pipeline_stage ? t(`parties.pipeline_stages.${p.pipeline_stage}`, p.pipeline_stage) : ''}"`,
        `"${(p.phone || '').replace(/"/g, '""')}"`,
        `"${(p.email || '').replace(/"/g, '""')}"`,
        `"${(p.branch_name || '').replace(/"/g, '""')}"`,
        `"${(p.city_name || '').replace(/"/g, '""')}"`,
        `"${partyWhen(p.created_at).slice(0, 10)}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `parties-directory-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function filtersFromParams(params) {
    return {
        kind: params.get('kind') || '',
        role: params.get('role') || '',
        stage: params.get('stage') || '',
        branch: params.get('branch') || '',
        state: params.get('state') === 'archived' ? 'archived' : '',
    };
}

export default function Index() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const user = useAuthStore((state) => state.user);
    const canEdit = can(user, 'party:create');
    const [offices, setOffices] = useState([]);

    useEffect(() => {
        let active = true;
        fetch.get('branches/options')
            .then((res) => {
                if (active) setOffices(res.data?.data?.branches || []);
            })
            .catch(() => { });
        return () => { active = false; };
    }, []);

    const fetchPage = useCallback(async ({ page, q, filters, sort }) => {
        const query = { page, limit: 25 };
        if (q) query.q = q;
        if (filters.role) query.role = filters.role;
        if (filters.kind) query.kind = filters.kind;
        if (filters.stage) query.stage = filters.stage;
        if (filters.branch) query.branch = filters.branch;
        if (filters.state === 'archived') query.state = 'archived';
        if (sort) query.sort = sort;
        const res = await fetch.get('parties', { params: query });
        return res.data?.data || {};
    }, []);

    const list = usePagedList(fetchPage, {
        q: params.get('q') || '',
        filters: filtersFromParams(params),
    });

    const { applyQuery } = list;
    useEffect(() => {
        applyQuery({
            q: params.get('q') || '',
            filters: filtersFromParams(params),
        });
    }, [params, applyQuery]);

    const summary = list.payload?.summary || {
        parties: 0,
        persons: 0,
        organizations: 0,
        leads: 0,
        clients: 0,
        owners: 0,
        archived: 0,
    };
    const archived = list.filters.state === 'archived';
    const columns = useColumnVisibility('parties.table.columns.v3', OPTIONAL_COLUMNS);
    const hidden = new Set(columns.hidden);
    const showBranch = offices.length > 1;

    const handleArchive = async (party, event) => {
        if (event) event.stopPropagation();
        if (!canEdit) return;

        const confirm = await Swal.fire({
            title: t('parties.delete_title'),
            text: t('parties.delete_confirm', { name: party.display_name }),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: t('common.delete'),
            cancelButtonText: t('common.cancel'),
        });
        if (!confirm.isConfirmed) return;

        list.setError('');
        try {
            await fetch.delete(`parties/${party.id}`);
            Swal.fire({
                icon: 'success',
                title: t('parties.archived'),
                text: `${party.display_name} has been archived.`,
                timer: 2000,
                showConfirmButton: false,
            });
            list.reload();
        } catch (err) {
            const errorMsg = partyError(err, t);
            Swal.fire({
                icon: 'error',
                title: t('common.error'),
                text: errorMsg,
                confirmButtonText: t('common.confirm'),
            });
            list.setError(errorMsg);
        }
    };

    const handleRestore = async (party, event) => {
        if (event) event.stopPropagation();
        if (!canEdit) return;

        const confirm = await Swal.fire({
            title: t('parties.restore_title'),
            text: t('parties.restore_confirm', { name: party.display_name }),
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: t('common.restore'),
            cancelButtonText: t('common.cancel'),
        });
        if (!confirm.isConfirmed) return;

        list.setError('');
        try {
            await fetch.post(`parties/${party.id}/restore`);
            Swal.fire({
                icon: 'success',
                title: t('parties.active'),
                text: `${party.display_name} has been restored.`,
                timer: 2000,
                showConfirmButton: false,
            });
            list.reload();
        } catch (err) {
            const errorMsg = partyError(err, t);
            Swal.fire({
                icon: 'error',
                title: t('common.error'),
                text: errorMsg,
                confirmButtonText: t('common.confirm'),
            });
            list.setError(errorMsg);
        }
    };

    const openReport = () => {
        const next = new URLSearchParams();
        if (list.query) next.set('q', list.query);
        if (list.filters.kind) next.set('kind', list.filters.kind);
        if (list.filters.role) next.set('role', list.filters.role);
        if (list.filters.stage) next.set('stage', list.filters.stage);
        if (list.filters.branch) next.set('branch', list.filters.branch);
        if (list.filters.state === 'archived') next.set('state', 'archived');
        const query = next.toString();
        navigate(query ? `/admin/parties/report?${query}` : '/admin/parties/report');
    };

    const pickerColumns = [
        { key: 'display_name', label: t('parties.name'), locked: true },
        { key: 'roles', label: t('parties.role'), locked: true },
        ...(showBranch ? [{ key: 'branch', label: t('parties.branch'), locked: true }] : []),
        { key: 'stage', label: t('parties.pipeline_stage', { defaultValue: 'Stage' }) },
        { key: 'phone', label: t('parties.phone') },
        { key: 'email', label: t('parties.email') },
        { key: 'city', label: t('parties.city') },
        { key: 'when', label: t(archived ? 'parties.removed' : 'parties.created') },
        { key: 'actions', label: t('workspace_ui.actions'), locked: true },
    ];

    const tableColumns = [
        {
            key: 'display_name',
            locked: true,
            header: t('parties.name'),
            render: (row) => (
                <Box sx={{ minWidth: 0, py: 0.25 }}>
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                        <Typography fontWeight={600} noWrap>{row.display_name}</Typography>
                        {row.deleted_at ? <StatusChip status="archived" label={t('parties.archived')} /> : null}
                    </Stack>
                    <Typography variant="body2" color="text.secondary" noWrap>
                        {t(row.party_kind === 'organization' ? 'parties.organization' : 'parties.person')}
                        {row.city_name ? ` · ${row.city_name}` : ''}
                    </Typography>
                </Box>
            ),
        },
        {
            key: 'roles',
            locked: true,
            header: t('parties.role'),
            render: (row) => <RoleLabel roles={row.roles} t={t} />,
        },
        ...(showBranch ? [{
            key: 'branch',
            locked: true,
            header: t('parties.branch'),
            render: (row) => row.branch_name || '—',
        }] : []),
        {
            key: 'stage',
            header: t('parties.pipeline_stage', { defaultValue: 'Stage' }),
            render: (row) => <PipelineStageChip stage={row.pipeline_stage} t={t} />,
        },
        {
            key: 'phone',
            header: t('parties.phone'),
            render: (row) => {
                if (!row.phone) return '—';
                const clean = row.phone.replace(/[^\d+]/g, '');
                return (
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ direction: 'ltr' }}>{row.phone}</Typography>
                        <Tooltip title={t('parties.call')}>
                            <IconButton size="small" component="a" href={`tel:${clean}`} onClick={(e) => e.stopPropagation()} sx={{ color: 'primary.main', p: 0.25 }}>
                                <PhoneOutlinedIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={t('parties.whatsapp', { defaultValue: 'WhatsApp' })}>
                            <IconButton size="small" component="a" href={`https://wa.me/${clean.replace('+', '')}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} sx={{ color: '#25D366', p: 0.25 }}>
                                <WhatsAppIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                );
            },
        },
        {
            key: 'email',
            header: t('parties.email'),
            render: (row) => {
                if (!row.email) return '—';
                return (
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ direction: 'ltr', maxWidth: 180 }} noWrap>{row.email}</Typography>
                        <Tooltip title={t('parties.send_email')}>
                            <IconButton size="small" component="a" href={`mailto:${row.email}`} onClick={(e) => e.stopPropagation()} sx={{ color: 'primary.main', p: 0.25 }}>
                                <EmailOutlinedIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                );
            },
        },
        { key: 'city', header: t('parties.city'), render: (row) => row.city_name || '—' },
        {
            key: 'when',
            header: t(archived ? 'parties.removed' : 'parties.created'),
            render: (row) => partyWhen(archived ? row.deleted_at : row.created_at).slice(0, 10),
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
                        canEdit && <ActionIconButton action="restore" onClick={(e) => handleRestore(row, e)} />
                    ) : (
                        <>
                            <ActionIconButton action="view" onClick={() => navigate(`/admin/parties/${row.id}/show`)} />
                            {canEdit && <ActionIconButton action="edit" onClick={() => navigate(`/admin/parties/${row.id}/edit`)} />}
                            {canEdit && <ActionIconButton action="delete" onClick={(e) => handleArchive(row, e)} />}
                        </>
                    )}
                </Stack>
            ),
        },
    ];

    const filters = [
        {
            key: 'role',
            label: t('parties.role'),
            value: list.filters.role || '',
            allLabel: t('parties.all_roles'),
            onChange: (value) => list.setFilter('role', value),
            options: PARTY_ROLES.map((name) => ({ value: name, label: t(`parties.roles.${name}`, name) })),
        },
        {
            key: 'kind',
            label: t('parties.kind'),
            value: list.filters.kind || '',
            allLabel: t('parties.all_kinds'),
            onChange: (value) => list.setFilter('kind', value),
            options: KINDS.map((kind) => ({ value: kind, label: t(`parties.${kind}`) })),
        },
        {
            key: 'stage',
            label: t('parties.pipeline_stage', { defaultValue: 'Stage' }),
            value: list.filters.stage || '',
            allLabel: t('parties.all_stages', { defaultValue: 'All stages' }),
            onChange: (value) => list.setFilter('stage', value),
            options: PIPELINE_STAGES.map((stage) => ({
                value: stage,
                label: t(`parties.pipeline_stages.${stage}`, t(`reports_suite.${stage}`, stage)),
            })),
        },
    ];

    if (showBranch) {
        filters.push({
            key: 'branch',
            label: t('parties.branch'),
            value: list.filters.branch || '',
            allLabel: t('parties.all_branches'),
            onChange: (value) => list.setFilter('branch', value),
            options: offices.map((office) => ({ value: String(office.id), label: office.name })),
        });
    }

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, width: '100%' }}>
            <PageHeader
                title={t('parties.title')}
                description={t('parties.hint')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Button
                            variant="outlined"
                            startIcon={<FileDownloadOutlinedIcon />}
                            onClick={() => exportCsv(list.items, t)}
                            disabled={!list.items || list.items.length === 0}
                        >
                            {t('parties.export_csv', { defaultValue: 'Export CSV' })}
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<AssessmentOutlinedIcon />}
                            onClick={openReport}
                        >
                            {t('parties.report')}
                        </Button>
                        <Can permission="party:create">
                            <Button
                                variant="contained"
                                startIcon={<AddCircleOutlineOutlinedIcon />}
                                onClick={() => navigate('/admin/parties/create')}
                            >
                                {t('parties.create')}
                            </Button>
                        </Can>
                    </Stack>
                )}
            />

            {list.error ? <Alert severity="error" sx={{ mb: 2 }}>{list.error}</Alert> : null}

            {/* 5 Modern Theme-Adaptive ERP KPI Cards */}
            <Stack
                direction="row"
                useFlexGap
                spacing={1.5}
                sx={{ mb: 2.5, flexWrap: 'wrap' }}
            >
                <MetricCard
                    icon={PeopleAltOutlinedIcon}
                    label={t('parties.summary_parties')}
                    value={summary.parties}
                    color="parties"
                />
                <MetricCard
                    icon={PersonSearchOutlinedIcon}
                    label={t('parties.summary_clients', { defaultValue: 'Clients & Buyers' })}
                    value={summary.clients}
                    color="clients"
                />
                <MetricCard
                    icon={HomeWorkOutlinedIcon}
                    label={t('parties.summary_owners', { defaultValue: 'Property Owners' })}
                    value={summary.owners}
                    color="owners"
                />
                <MetricCard
                    icon={TrendingUpOutlinedIcon}
                    label={t('parties.summary_leads')}
                    value={summary.leads}
                    color="leads"
                />
                <MetricCard
                    icon={BusinessOutlinedIcon}
                    label={t('parties.summary_organizations')}
                    value={summary.organizations}
                    color="organizations"
                />
            </Stack>

            <ListToolbar
                search={list.query}
                onSearch={list.setSearch}
                filters={filters}
                end={(
                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={archived ? 'archived' : 'active'}
                        onChange={(_, value) => {
                            if (value) list.setFilter('state', value === 'archived' ? 'archived' : '');
                        }}
                    >
                        <ToggleButton value="active">{t('parties.active')}</ToggleButton>
                        <ToggleButton value="archived">
                            {summary.archived > 0
                                ? `${t('parties.archived')} (${summary.archived})`
                                : t('parties.archived')}
                        </ToggleButton>
                    </ToggleButtonGroup>
                )}
            />

            <DataTable
                columns={tableColumns.filter((column) => column.locked || !hidden.has(column.key))}
                rows={list.items}
                loading={list.loading}
                empty={archived ? t('parties.empty_archived') : t('parties.empty')}
                page={list.page}
                limit={list.limit}
                total={list.total}
                onPageChange={list.setPage}
                onRowClick={archived ? undefined : (row) => navigate(`/admin/parties/${row.id}/show`)}
            />
        </Box>
    );
}
