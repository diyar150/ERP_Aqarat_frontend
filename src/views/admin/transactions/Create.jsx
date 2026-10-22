import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Button, CircularProgress } from '@mui/material';
import fetch from '@/utils/fetch';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import { useAuthStore } from '@/store/authStore';
import TransactionForm from './TransactionForm.jsx';
import {
    buildTransactionPayload,
    emptyTransactionForm,
    mapTransactionFieldErrors,
} from './transactionForm.js';

export default function Create() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const user = useAuthStore((state) => state.user);
    const [ready, setReady] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        const propertyId = Number(params.get('property_id'));
        const type = params.get('type') === 'rent' ? 'rent' : 'sale';

        const boot = async () => {
            try {
                const [agencyRes, agentsRes] = await Promise.all([
                    fetch.get('agency'),
                    fetch.get('properties/agents'),
                ]);
                if (!active) return;

                const currencies = agencyRes.data?.data?.currencies || [];
                const agentsPayload = agentsRes.data?.data;
                const agents = agentsPayload?.items || agentsPayload || [];
                const seed = {
                    form: {
                        ...emptyTransactionForm,
                        transaction_type: type,
                    },
                    property: null,
                    principal: null,
                    counterparty: null,
                    staffAgent: null,
                };

                if (Number.isInteger(propertyId) && propertyId > 0) {
                    try {
                        const res = await fetch.get(`properties/${propertyId}`);
                        const row = res.data?.data;
                        if (active && row) {
                            seed.property = row;
                            seed.form.currency_id = row.currency_id || '';
                            seed.form.purchase_price = type === 'sale' ? (row.price || '') : '';
                            seed.form.rent_amount = type === 'rent' ? (row.price || '') : '';
                            const owner = (row.owners || []).find((item) => !item.effective_to);
                            if (owner) {
                                seed.counterparty = {
                                    id: owner.party_id,
                                    display_name: owner.display_name,
                                };
                            }
                        }
                    } catch {
                        // keep empty create if property cannot load
                    }
                }

                if (!active) return;
                setReady({ currencies, agents, seed });
            } catch (err) {
                if (active) setError(err.response?.data?.error?.message || t('login.error'));
            }
        };

        boot();
        return () => { active = false; };
    }, [params, t]);

    const submit = async (draft, setFieldErrors) => {
        setSaving(true);
        setError('');
        try {
            const payload = buildTransactionPayload({
                ...draft,
                assignedUserId: user?.id,
            });
            const res = await fetch.post('transactions', payload);
            navigate(`/admin/transactions/${res.data.data.id}/show`);
        } catch (err) {
            const fields = err.response?.data?.error?.fields;
            if (fields && Object.keys(fields).length) {
                setFieldErrors(mapTransactionFieldErrors(fields));
            }
            setError(err.response?.data?.error?.message || t('login.error'));
        } finally {
            setSaving(false);
        }
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
                title={t('transactions.create')}
                description={t('transactions.create_hint')}
                action={(
                    <Button onClick={() => navigate('/admin/transactions/index')}>
                        {t('transactions.back')}
                    </Button>
                )}
            />
            <TransactionForm
                initial={ready.seed}
                currencies={ready.currencies}
                agents={ready.agents}
                saving={saving}
                error={error}
                onSubmit={submit}
                onCancel={() => navigate('/admin/transactions/index')}
            />
        </Box>
    );
}
