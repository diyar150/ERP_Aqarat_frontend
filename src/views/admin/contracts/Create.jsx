import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Autocomplete, Box, Button, CircularProgress, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import fetch from '@/utils/fetch';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import { contractAmount, contractError, contractNumber, contractParties, contractPeriod } from './contractForm.js';
import { MERGE_FIELDS, tokenMarkup } from './templateBuilder/blockCatalog.js';

function readTemplateList(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
}

function templateDealType(template) {
    return template?.deal_type || 'both';
}

export default function Create() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const renewFrom = searchParams.get('renew');
    const presetDeal = searchParams.get('deal');
    const [deals, setDeals] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [dealId, setDealId] = useState('');
    const [dealQuery, setDealQuery] = useState('');
    const [selectedDeal, setSelectedDeal] = useState(null);
    const [searched, setSearched] = useState(false);
    const idempotencyKey = useRef('');
    const searchTimer = useRef(null);
    const [deal, setDeal] = useState(null);
    const [dealKey, setDealKey] = useState('');
    const [templateId, setTemplateId] = useState('');
    const [ready, setReady] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [renewal, setRenewal] = useState(null);

    useEffect(() => {
        let active = true;
        const loads = [
            fetch.get('documents/deals'),
            // Active register includes drafts + published (issue list used to hide drafts).
            fetch.get('documents/templates/register', { params: { status: 'active' } }),
            fetch.get('documents/templates'),
        ];
        if (renewFrom) loads.push(fetch.get(`documents/contracts/${renewFrom}`));
        else if (presetDeal) loads.push(fetch.get(`transactions/${presetDeal}`));

        Promise.allSettled(loads).then((results) => {
            if (!active) return;
            const dealRes = results[0];
            const registerRes = results[1];
            const publishedRes = results[2];
            const extraRes = results[3];

            const openDeals = dealRes.status === 'fulfilled' ? (dealRes.value.data?.data || []) : [];
            const fromRegister = registerRes.status === 'fulfilled'
                ? readTemplateList(registerRes.value.data?.data)
                : [];
            const fromPublished = publishedRes.status === 'fulfilled'
                ? readTemplateList(publishedRes.value.data?.data)
                : [];
            const byId = new Map();
            for (const row of [...fromPublished, ...fromRegister]) {
                if (row?.id == null) continue;
                byId.set(Number(row.id), {
                    ...row,
                    id: Number(row.id),
                    deal_type: templateDealType(row),
                    lifecycle: row.lifecycle || 'draft',
                });
            }
            setTemplates([...byId.values()].sort((a, b) => {
                if (Boolean(b.is_default) !== Boolean(a.is_default)) return Number(b.is_default) - Number(a.is_default);
                return String(a.name || '').localeCompare(String(b.name || ''));
            }));

            const extra = extraRes?.status === 'fulfilled' ? (extraRes.value.data?.data || null) : null;
            if (renewFrom) {
                setRenewal(extra);
                setDeals(openDeals);
                if (extra?.current_deal_status === 'open') {
                    const match = openDeals.find((row) => Number(row.id) === Number(extra.transaction_id));
                    if (match) {
                        setSelectedDeal(match);
                        setDealId(String(match.id));
                        setDealQuery([match.reference_number, t(`contracts.${match.transaction_type}`), match.property_title].filter(Boolean).join(' · '));
                    }
                }
            } else if (extra?.status === 'open') {
                const option = {
                    id: extra.id,
                    reference_number: extra.reference_number,
                    transaction_type: extra.transaction_type,
                    property_title: extra.property_title,
                };
                const match = openDeals.find((row) => Number(row.id) === Number(extra.id)) || option;
                setDeals(openDeals.some((row) => Number(row.id) === Number(match.id)) ? openDeals : [match, ...openDeals]);
                setSelectedDeal(match);
                setDealId(String(match.id));
                setDealQuery([match.reference_number, t(`contracts.${match.transaction_type}`), match.property_title].filter(Boolean).join(' · '));
            } else {
                setDeals(openDeals);
            }

            if (dealRes.status === 'rejected' && registerRes.status === 'rejected' && publishedRes.status === 'rejected') {
                setError(contractError(dealRes.reason, t));
            }
            setReady(true);
        });
        return () => { active = false; };
    }, [renewFrom, presetDeal, t]);

    const dealType = deal?.transaction_type || selectedDeal?.transaction_type || '';
    const matchingTemplates = useMemo(() => templates.filter((template) => {
        const type = templateDealType(template);
        return !dealType || type === 'both' || type === dealType;
    }), [templates, dealType]);

    const resolvedTemplateId = useMemo(() => {
        if (!matchingTemplates.length) return '';
        if (matchingTemplates.some((row) => String(row.id) === templateId)) return templateId;
        const preferred = matchingTemplates.find((row) => row.is_default)
            || matchingTemplates.find((row) => row.lifecycle === 'published')
            || matchingTemplates[0];
        return preferred ? String(preferred.id) : '';
    }, [matchingTemplates, templateId]);

    useEffect(() => {
        if (!dealId) return undefined;
        let active = true;
        fetch.get(`transactions/${dealId}`)
            .then((res) => {
                if (!active) return;
                const row = res.data?.data || null;
                setDeal(row ? {
                    ...row,
                    parties: (row.parties || []).map((party) => ({
                        id: party.party_id,
                        role: party.participant_role,
                        name: party.display_name,
                    })),
                } : null);
                setDealKey(String(dealId));
            })
            .catch(() => {
                if (!active) return;
                setDeal(null);
                setDealKey(String(dealId));
            });
        return () => { active = false; };
    }, [dealId]);

    const issue = async (event) => {
        event.preventDefault();
        const required = t('common.required');
        const nextErrors = {};
        if (!dealId) nextErrors.deal = required;
        if (!resolvedTemplateId) nextErrors.template = required;
        if (Object.keys(nextErrors).length) {
            setFieldErrors(nextErrors);
            setError('');
            return;
        }
        setSaving(true);
        setError('');
        setFieldErrors({});
        try {
            const selected = matchingTemplates.find((row) => String(row.id) === String(resolvedTemplateId));
            if (!selected) {
                setError(t('contracts.builder.no_matching_templates'));
                return;
            }
            if (selected.lifecycle !== 'published') {
                await fetch.post(`documents/templates/${selected.id}/publish`);
                setTemplates((current) => current.map((row) => (
                    Number(row.id) === Number(selected.id) ? { ...row, lifecycle: 'published' } : row
                )));
            }
            if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
            const res = await fetch.post('documents/contracts', {
                transaction_id: Number(dealId),
                template_id: Number(resolvedTemplateId),
                ...(renewFrom ? { renewed_from_id: Number(renewFrom) } : {}),
            }, {
                headers: { 'Idempotency-Key': idempotencyKey.current },
            });
            const body = res.data?.data || {};
            if (body.status === 'ready' && body.document?.generated_id) {
                idempotencyKey.current = '';
                navigate(`/admin/contracts/${body.document.generated_id}/show`);
                return;
            }
            if (body.status === 'queued' && body.job_id) {
                const job = await waitForJob(body.job_id);
                if (job?.status === 'failed') {
                    idempotencyKey.current = '';
                    setError(t('login.error'));
                    return;
                }
                idempotencyKey.current = '';
                const listed = await fetch.get('documents/contracts', { params: { transaction_id: dealId } });
                const match = (listed.data?.data || []).find((row) => Number(row.document_id) === Number(job?.document_id));
                navigate(match ? `/admin/contracts/${match.id}/show` : '/admin/contracts/index');
                return;
            }
            idempotencyKey.current = '';
            navigate('/admin/contracts/index');
        } catch (err) {
            setError(contractError(err, t));
        } finally {
            setSaving(false);
        }
    };

    const openDeals = deals;
    const preview = dealKey === String(dealId) ? deal : null;

    const searchDeals = (value) => {
        const term = value.trim();
        setSearched(Boolean(term));
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            fetch.get('documents/deals', { params: term ? { q: term } : {} })
                .then((res) => setDeals(res.data?.data || []))
                .catch(() => {});
        }, 300);
    };

    if (!ready) {
        return (
            <Box sx={{ p: 6, display: 'flex', justifyContent: 'center' }}>
                {error || <CircularProgress size={28} />}
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('contracts.create_title')}
                description={t('contracts.create_hint')}
                action={<Button onClick={() => navigate('/admin/contracts/index')}>{t('contracts.back')}</Button>}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {renewal && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    {t('contracts.renewing', { number: contractNumber(renewal.id) })}
                </Alert>
            )}
            {openDeals.length === 0 && !searched && <Alert severity="info" sx={{ mb: 2 }}>{t('contracts.no_deals')}</Alert>}
            {templates.length === 0 && (
                <Alert
                    severity="warning"
                    sx={{ mb: 2 }}
                    action={(
                        <Button color="inherit" size="small" onClick={() => navigate('/admin/contracts/templates/new')}>
                            {t('contracts.new_template')}
                        </Button>
                    )}
                >
                    {t('contracts.builder.no_templates_yet')}
                </Alert>
            )}
            {preview && (
                <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 2 }}>
                    <Typography fontWeight={700} sx={{ mb: 2 }}>{t('contracts.commercial')}</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary">{t('contracts.deal')}</Typography>
                            <Typography>{preview.reference_number}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">{t('contracts.type')}</Typography>
                            <Typography>{t(`contracts.${preview.transaction_type}`)}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">{t('contracts.deal_status')}</Typography>
                            <Typography>{t(`transactions.statuses.${preview.status}`)}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">{t('contracts.property')}</Typography>
                            <Typography>{[preview.property_reference, preview.property_title].filter(Boolean).join(' · ') || '—'}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">{t('contracts.amount')}</Typography>
                            <Typography>{contractAmount({ ...preview, currency_code: preview.currency_code })}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">{t('contracts.period')}</Typography>
                            <Typography>{contractPeriod(preview)}</Typography>
                        </Box>
                        <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                            <Typography variant="caption" color="text.secondary">{t('contracts.parties')}</Typography>
                            <Typography>{contractParties(preview, t)}</Typography>
                        </Box>
                    </Box>
                </Paper>
            )}
            {openDeals.length > 0 && !preview && <Alert severity="info" sx={{ mb: 2 }}>{t('contracts.select_deal')}</Alert>}
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                <Stack component="form" spacing={2} onSubmit={issue} noValidate>
                    <Typography fontWeight={700}>{t('contracts.details')}</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                        <Autocomplete
                            options={openDeals}
                            value={selectedDeal}
                            inputValue={dealQuery}
                            loading={!ready}
                            filterOptions={(options) => options}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            getOptionLabel={(option) => [option.reference_number, t(`contracts.${option.transaction_type}`), option.property_title].filter(Boolean).join(' · ')}
                            onChange={(_, value) => {
                                setSelectedDeal(value);
                                setDealId(value ? String(value.id) : '');
                                setFieldErrors((current) => {
                                    if (!current.deal) return current;
                                    const next = { ...current };
                                    delete next.deal;
                                    return next;
                                });
                            }}
                            onInputChange={(_, value, reason) => {
                                if (reason === 'reset' && !value && dealQuery) return;
                                setDealQuery(value);
                                if (reason === 'input' || reason === 'clear') searchDeals(value);
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    required
                                    label={t('contracts.search_deal')}
                                    error={Boolean(fieldErrors.deal)}
                                    helperText={fieldErrors.deal}
                                />
                            )}
                        />
                        <TextField
                            select
                            required
                            label={t('contracts.template')}
                            value={resolvedTemplateId}
                            onChange={(event) => {
                                setTemplateId(event.target.value);
                                setFieldErrors((current) => {
                                    if (!current.template) return current;
                                    const next = { ...current };
                                    delete next.template;
                                    return next;
                                });
                            }}
                            disabled={matchingTemplates.length === 0}
                            error={Boolean(fieldErrors.template)}
                            helperText={fieldErrors.template || (matchingTemplates.length === 0
                                ? (templates.length === 0
                                    ? t('contracts.builder.no_templates_yet')
                                    : t('contracts.builder.no_matching_templates'))
                                : undefined)}
                        >
                            {matchingTemplates.map((template) => (
                                <MenuItem key={template.id} value={String(template.id)}>
                                    {template.name}
                                    {template.is_default ? ` · ${t('contracts.builder.default_badge')}` : ''}
                                    {template.lifecycle === 'draft' ? ` · ${t('contracts.builder.lifecycle_draft')}` : ''}
                                    {template.locale ? ` · ${template.locale}` : ''}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Box>
                    <Box>
                        <Button type="submit" variant="contained" disabled={saving}>
                            {saving ? t('contracts.preparing') : t('contracts.issue')}
                        </Button>
                    </Box>
                </Stack>
                <Stack spacing={1.5} sx={{ mt: 3 }}>
                    <Typography fontWeight={700}>{t('contracts.new_template')}</Typography>
                    <Typography variant="body2" color="text.secondary">{t('contracts.builder.open_from_issue')}</Typography>
                    <Typography variant="caption" color="text.secondary" dir="ltr" sx={{ display: 'block' }}>
                        {MERGE_FIELDS.map((field) => tokenMarkup(field.token)).join(' ')}
                    </Typography>
                    <Box>
                        <Button onClick={() => navigate('/admin/contracts/templates/new')}>
                            {t('contracts.builder.open_builder')}
                        </Button>
                    </Box>
                </Stack>
            </Paper>
        </Box>
    );
}

async function waitForJob(jobId) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
        const res = await fetch.get(`documents/jobs/${jobId}`);
        const job = res.data?.data;
        if (job?.status === 'ready' || job?.status === 'failed') return job;
        await new Promise((resolve) => setTimeout(resolve, 400));
    }
    return null;
}
