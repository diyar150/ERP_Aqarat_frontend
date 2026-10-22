import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, CircularProgress, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import fetch from '@/utils/fetch';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import { contractAmount, contractError, contractNumber, contractPeriod, contractWhen } from './contractForm.js';

function Fact({ label, value }) {
    return (
        <Box>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography>{value || '—'}</Typography>
        </Box>
    );
}

export default function Edit() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();
    const [contract, setContract] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [templateId, setTemplateId] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});

    useEffect(() => {
        let active = true;
        Promise.allSettled([
            fetch.get(`documents/contracts/${id}`),
            fetch.get('documents/templates/register', { params: { status: 'active' } }),
            fetch.get('documents/templates'),
        ]).then(([contractRes, registerRes, publishedRes]) => {
            if (!active) return;
            if (contractRes.status !== 'fulfilled') {
                if (contractRes.reason?.response?.status === 404) navigate('/admin/contracts/index');
                else setError(contractError(contractRes.reason, t));
                return;
            }
            const row = contractRes.value.data?.data;
            setContract(row);
            setTemplateId(row?.template_id ? String(row.template_id) : '');
            const registerItems = registerRes.status === 'fulfilled'
                ? (registerRes.value.data?.data?.items || [])
                : [];
            const publishedItems = publishedRes.status === 'fulfilled'
                ? (Array.isArray(publishedRes.value.data?.data) ? publishedRes.value.data.data : [])
                : [];
            const byId = new Map();
            for (const item of [...publishedItems, ...registerItems]) {
                if (item?.id == null) continue;
                const dealType = item.deal_type || 'both';
                if (row?.transaction_type && dealType !== 'both' && dealType !== row.transaction_type) continue;
                byId.set(Number(item.id), { ...item, id: Number(item.id), deal_type: dealType });
            }
            setTemplates([...byId.values()]);
        });
        return () => { active = false; };
    }, [id, navigate, t]);

    const save = async (event) => {
        event.preventDefault();
        if (!contract || contract.status === 'archived') return;
        if (!templateId) {
            setFieldErrors({ template: t('common.required') });
            setError('');
            return;
        }
        setSaving(true);
        setError('');
        setFieldErrors({});
        try {
            const selected = templates.find((row) => String(row.id) === String(templateId));
            if (selected?.lifecycle === 'draft') {
                await fetch.post(`documents/templates/${selected.id}/publish`);
            }
            await fetch.patch(`documents/contracts/${id}`, {
                template_id: Number(templateId),
                status: contract.status,
                version: contract.row_version,
            });
            navigate(`/admin/contracts/${id}/show`);
        } catch (err) {
            setError(contractError(err, t));
        } finally {
            setSaving(false);
        }
    };

    if (!contract) {
        return (
            <Box sx={{ p: 6, display: 'flex', justifyContent: 'center' }}>
                {error || <CircularProgress size={28} />}
            </Box>
        );
    }

    const archived = contract.status === 'archived';
    const signed = contract.status === 'signed';

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={`${t('contracts.edit_title')} · ${contractNumber(contract.id)}`}
                description={t('contracts.edit_hint')}
                action={<Button onClick={() => navigate(`/admin/contracts/${id}/show`)}>{t('contracts.back')}</Button>}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {archived && <Alert severity="info" sx={{ mb: 2 }}>{t('contracts.archived_locked')}</Alert>}
            {signed && <Alert severity="info" sx={{ mb: 2 }}>{t('contracts.signed_locked')}</Alert>}
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                    <Fact label={t('contracts.deal')} value={contract.reference_number} />
                    <Fact label={t('contracts.type')} value={t(`contracts.${contract.transaction_type}`)} />
                    <Fact label={t('contracts.property')} value={[contract.property_reference, contract.property_title].filter(Boolean).join(' · ')} />
                    <Fact label={t('contracts.amount')} value={contractAmount(contract)} />
                    <Fact label={t('contracts.period')} value={contractPeriod(contract)} />
                    <Fact label={t('contracts.date')} value={contractWhen(contract.created_at)} />
                </Box>
            </Paper>
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                <Stack component="form" spacing={2} onSubmit={save} noValidate>
                    <TextField
                        select
                        required
                        label={t('contracts.template')}
                        value={templateId}
                        onChange={(event) => {
                            setTemplateId(event.target.value);
                            setFieldErrors((current) => {
                                if (!current.template) return current;
                                const next = { ...current };
                                delete next.template;
                                return next;
                            });
                        }}
                        disabled={archived || signed}
                        error={Boolean(fieldErrors.template)}
                        helperText={fieldErrors.template}
                    >
                        {templates.map((template) => (
                            <MenuItem key={template.id} value={String(template.id)}>{template.name}</MenuItem>
                        ))}
                    </TextField>
                    <Box>
                        <Button type="submit" variant="contained" disabled={saving || archived || signed || templateId === String(contract.template_id)}>
                            {saving ? t('contracts.preparing') : t('contracts.reissue')}
                        </Button>
                    </Box>
                </Stack>
            </Paper>
        </Box>
    );
}
