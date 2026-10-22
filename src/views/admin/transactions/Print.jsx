import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import fetch from '@/utils/fetch';
import { formatPrice, currencyLabel } from '@/utils/money.js';
import { dealAmount, dealPeriod, dealWhen } from './transactionForm.js';

function money(value, symbol) {
    if (value == null || value === '') return '—';
    return `${formatPrice(value)}${symbol ? ` ${symbol}` : ''}`;
}

function Row({ label, value }) {
    return (
        <Stack direction="row" spacing={2} sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography sx={{ width: 180, color: 'text.secondary', flexShrink: 0 }}>{label}</Typography>
            <Typography fontWeight={600} sx={{ wordBreak: 'break-word' }}>{value || '—'}</Typography>
        </Stack>
    );
}

export default function Print() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [deal, setDeal] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        fetch.get(`transactions/${id}`)
            .then((res) => {
                if (!active) return;
                setDeal(res.data.data);
                setError('');
            })
            .catch((err) => {
                if (active) setError(err.response?.data?.error?.message || t('login.error'));
            });
        return () => { active = false; };
    }, [id, t]);

    useEffect(() => {
        if (!deal) return undefined;
        const timer = setTimeout(() => window.print(), 400);
        return () => clearTimeout(timer);
    }, [deal]);

    if (!deal && !error) {
        return (
            <Box sx={{ p: 6, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress size={28} />
            </Box>
        );
    }

    const symbol = currencyLabel(deal?.currency_symbol || deal?.currency_code);

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 900, mx: 'auto' }} className="deal-print">
            <Stack direction="row" spacing={1} sx={{ mb: 2, '@media print': { display: 'none' } }}>
                <Button onClick={() => navigate(`/admin/transactions/${id}/show`)}>{t('transactions.back')}</Button>
                <Button variant="contained" onClick={() => window.print()}>{t('transactions.print')}</Button>
            </Stack>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {deal && (
                <>
                    <Typography variant="h5" fontWeight={800}>{t('transactions.summary_title')}</Typography>
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                        {deal.reference_number} · {t(`transactions.types.${deal.transaction_type}`)} · {t(`transactions.statuses.${deal.status}`)}
                    </Typography>
                    <Row label={t('transactions.property')} value={[deal.property_reference, deal.property_title].filter(Boolean).join(' · ')} />
                    <Row label={t('transactions.branch')} value={deal.branch_name} />
                    <Row label={t('transactions.agent')} value={deal.agent_name} />
                    <Row label={t('transactions.value')} value={dealAmount(deal)} />
                    {deal.transaction_type === 'sale' ? (
                        <>
                            <Row label={t('transactions.down_payment')} value={money(deal.down_payment, symbol)} />
                            <Row label={t('transactions.balance')} value={money(deal.balance, symbol)} />
                        </>
                    ) : (
                        <>
                            <Row label={t('transactions.deposit')} value={money(deal.deposit_amount, symbol)} />
                            <Row label={t('transactions.period')} value={dealPeriod(deal)} />
                        </>
                    )}
                    <Row label={t('transactions.date')} value={dealWhen(deal.created_at)} />
                    <Typography fontWeight={700} sx={{ mt: 3, mb: 1 }}>{t('transactions.parties')}</Typography>
                    {(deal.parties || []).map((party) => (
                        <Row
                            key={`${party.party_id}-${party.participant_role}`}
                            label={t(`transactions.roles.${party.participant_role}`)}
                            value={party.display_name}
                        />
                    ))}
                    <Typography fontWeight={700} sx={{ mt: 3, mb: 1 }}>{t('transactions.commission')}</Typography>
                    {(deal.commissions || []).length === 0 && <Typography color="text.secondary">—</Typography>}
                    {(deal.commissions || []).map((line) => (
                        <Row
                            key={line.id}
                            label={[
                                line.beneficiary_kind === 'staff' ? t('transactions.staff_commission') : t('transactions.agency_commission'),
                                line.payer_side ? t(`transactions.roles.${line.payer_side}`) : null,
                            ].filter(Boolean).join(' · ')}
                            value={line.calc_kind === 'percent'
                                ? `${Number(line.rate_percent)}% → ${money(line.amount, symbol)}`
                                : money(line.amount, symbol)}
                        />
                    ))}
                    {(deal.offers || []).length > 0 && (
                        <>
                            <Typography fontWeight={700} sx={{ mt: 3, mb: 1 }}>{t('transactions.offers')}</Typography>
                            {(deal.offers || []).map((offer) => (
                                <Row
                                    key={offer.id}
                                    label={`${t(`transactions.offer_kinds.${offer.offer_kind}`)} · ${t(`transactions.roles.${offer.side}`)}`}
                                    value={`${money(offer.amount, symbol)} · ${t(`transactions.offer_statuses.${offer.status}`)}`}
                                />
                            ))}
                        </>
                    )}
                </>
            )}
        </Box>
    );
}
