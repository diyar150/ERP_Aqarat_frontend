import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import fetch from '@/utils/fetch';
import { balanceTone, currencyLabel, moneyLabel } from '@/utils/money.js';
import Can from '@/components/auth/Can.jsx';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import { StatusChip } from '@/components/workspace/DataTable.jsx';
import { branchError } from './branchError.js';
import WalletAmount from './WalletAmount.jsx';

function Fact({ label, value }) {
    return (
        <Box>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography>{value || '—'}</Typography>
        </Box>
    );
}

export default function Show() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();
    const [branch, setBranch] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        fetch.get(`branches/${id}`)
            .then((res) => {
                if (active) setBranch(res.data.data);
            })
            .catch((err) => {
                if (active) setError(branchError(err, t));
            });
        return () => { active = false; };
    }, [id, t]);

    if (!branch && !error) {
        return <Typography sx={{ p: 3 }}>{t('login.loading')}</Typography>;
    }

    const bookBalance = branch?.wallet?.balance || 0;
    const bookTone = balanceTone(bookBalance);
    const bookWallet = moneyLabel(bookBalance, branch?.wallet?.currency_code, '');
    const wallets = Array.isArray(branch?.wallets) ? branch.wallets : [];

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={branch?.name || t('branches.show_title')}
                description={t('branches.hint')}
                action={(
                    <Stack direction="row" spacing={1}>
                        <Button onClick={() => navigate('/admin/branches/index')}>{t('branches.back')}</Button>
                        <Can permission="branch:update">
                            <Button variant="contained" onClick={() => navigate(`/admin/branches/${id}/edit`)}>{t('common.edit')}</Button>
                        </Can>
                    </Stack>
                )}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {branch && (
                <Stack spacing={2}>
                    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
                            <Typography fontWeight={700}>{t('branches.wallet')}</Typography>
                            {branch.is_main && <Chip size="small" label={t('branches.main')} color="primary" variant="outlined" />}
                            <StatusChip status={branch.status} label={t(`branches.statuses.${branch.status}`)} />
                        </Stack>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
                            {wallets.map((row) => {
                                const label = row.currency_code === 'USD'
                                    ? t('branches.wallet_usd')
                                    : row.currency_code === 'IQD'
                                        ? t('branches.wallet_iqd')
                                        : currencyLabel(row.currency_code);
                                return (
                                    <WalletAmount
                                        key={row.currency_code || row.currency_id}
                                        variant="card"
                                        label={label}
                                        value={row.balance || 0}
                                        currency={row.currency_code}
                                        empty=""
                                    />
                                );
                            })}
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{t('branches.wallet_hint')}</Typography>
                        <Typography
                            variant="body2"
                            sx={{
                                mb: 2,
                                color: bookTone === 'negative'
                                    ? 'error.dark'
                                    : bookTone === 'positive'
                                        ? 'success.dark'
                                        : 'text.secondary',
                                fontVariantNumeric: 'tabular-nums',
                            }}
                        >
                            {t('branches.book_total')}: {bookWallet}
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                            <Fact label={t('branches.name')} value={branch.name} />
                            <Fact label={t('branches.code')} value={branch.code} />
                            <Fact label={t('branches.phone')} value={branch.phone} />
                            <Fact label={t('branches.city')} value={branch.city} />
                            <Fact label={t('branches.neighborhood')} value={branch.neighborhood} />
                            <Fact label={t('branches.address')} value={branch.address} />
                            <Fact label={t('branches.notes')} value={branch.notes} />
                        </Box>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                        <Typography fontWeight={700} sx={{ mb: 1 }}>{t('branches.activity')}</Typography>
                        {(branch.activity || []).length === 0 && (
                            <Typography color="text.secondary">{t('branches.no_activity')}</Typography>
                        )}
                        {(branch.activity || []).length > 0 && (
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>{t('branches.date')}</TableCell>
                                        <TableCell>{t('branches.reference')}</TableCell>
                                        <TableCell>{t('branches.entry_type')}</TableCell>
                                        <TableCell>{t('branches.direction')}</TableCell>
                                        <TableCell>{t('branches.amount')}</TableCell>
                                        <TableCell>{t('workspace_ui.status')}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {branch.activity.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell>{row.occurred_on}</TableCell>
                                            <TableCell>{row.reference_number}</TableCell>
                                            <TableCell>{t(`branches.entry_types.${row.entry_type}`, row.entry_type)}</TableCell>
                                            <TableCell>{t(`branches.${row.direction}`)}</TableCell>
                                            <TableCell>
                                                <WalletAmount
                                                    value={row.direction === 'out' ? -Math.abs(Number(row.amount) || 0) : row.amount}
                                                    currency={row.currency_code}
                                                    empty=""
                                                />
                                            </TableCell>
                                            <TableCell>{t(`branches.entry_statuses.${row.status}`, row.status)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </Paper>
                </Stack>
            )}
        </Box>
    );
}
