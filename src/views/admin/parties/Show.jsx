import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Avatar, Box, Button, Chip, MenuItem, Paper, Stack, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import fetch from '@/utils/fetch';
import { formatPrice, moneyLabel } from '@/utils/money.js';
import Can from '@/components/auth/Can.jsx';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import { StatusChip } from '@/components/workspace/DataTable.jsx';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import { ACTIVITY_TYPES, CHANNELS, DIRECTIONS, PIPELINE_STAGES, activityFeed, partyError, partyInitials, partyWhen } from './partyForm.js';

function Fact({ label, value }) {
    const empty = value == null || value === '';
    return (
        <Box>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography fontWeight={500}>{empty ? '—' : value}</Typography>
        </Box>
    );
}

function dayLabel(value) {
    if (!value) return '—';
    return String(value).slice(0, 10);
}

function feedLabel(item, t) {
    if (item.kind === 'note') return t('parties.note');
    if (item.kind === 'activity') return t(`parties.activity_types.${item.activity_type}`);
    return `${t(`parties.channels.${item.channel}`)} · ${t(`parties.directions.${item.direction}`)}`;
}

export default function Show() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();
    const [party, setParty] = useState(null);
    const [loadedId, setLoadedId] = useState(null);
    const [matches, setMatches] = useState([]);
    const [error, setError] = useState('');
    const [tab, setTab] = useState('activity');
    const [composer, setComposer] = useState('note');
    const [note, setNote] = useState('');
    const [activity, setActivity] = useState({ activity_type: 'call', body: '' });
    const [communication, setCommunication] = useState({ channel: 'phone', direction: 'outbound', subject: '', body: '' });
    const [saving, setSaving] = useState(false);
    const [updatingStage, setUpdatingStage] = useState(false);

    const applyParty = (partyRes, matchRes) => {
        setParty(partyRes.data.data);
        setMatches(matchRes.data?.data?.properties || []);
        setLoadedId(id);
        setError('');
    };

    const load = () => Promise.all([
        fetch.get(`parties/${id}`),
        fetch.get(`parties/${id}/matches`),
    ]).then(([partyRes, matchRes]) => {
        applyParty(partyRes, matchRes);
    });

    useEffect(() => {
        let active = true;
        Promise.all([
            fetch.get(`parties/${id}`),
            fetch.get(`parties/${id}/matches`),
        ]).then(([partyRes, matchRes]) => {
            if (!active) return;
            setParty(partyRes.data.data);
            setMatches(matchRes.data?.data?.properties || []);
            setLoadedId(id);
            setError('');
        }).catch((err) => {
            if (!active) return;
            setParty(null);
            setMatches([]);
            setLoadedId(id);
            setError(partyError(err, t));
        });
        return () => { active = false; };
    }, [id, t]);

    const changePipelineStage = async (nextStage) => {
        if (!nextStage || nextStage === party?.pipeline_stage) return;
        setUpdatingStage(true);
        try {
            await fetch.patch(`parties/${id}/pipeline`, { pipeline_stage: nextStage });
            await load();
        } catch (err) {
            setError(partyError(err, t));
        } finally {
            setUpdatingStage(false);
        }
    };

    const add = async (path, body, clear) => {
        setSaving(true);
        setError('');
        try {
            await fetch.post(`parties/${id}/${path}`, body);
            clear();
            await load();
        } catch (err) {
            setError(partyError(err, t));
        } finally {
            setSaving(false);
        }
    };

    const submitComposer = () => {
        if (composer === 'note') {
            add('notes', { body: note.trim() }, () => setNote(''));
            return;
        }
        if (composer === 'communication') {
            add('communications', {
                channel: communication.channel,
                direction: communication.direction,
                subject: communication.subject.trim() || null,
                body: communication.body.trim() || null,
            }, () => setCommunication({ channel: 'phone', direction: 'outbound', subject: '', body: '' }));
            return;
        }
        add('activities', { activity_type: activity.activity_type, body: activity.body.trim() }, () => setActivity({ activity_type: 'call', body: '' }));
    };

    const current = String(loadedId) === String(id);
    if (!current || (!party && !error)) {
        return <Typography sx={{ p: 3 }}>{t('login.loading')}</Typography>;
    }

    const preference = party?.preference;
    const feed = party ? activityFeed(party) : [];
    const holdings = party?.holdings || [];
    const deals = party?.deals || [];
    const settlements = party?.settlements || [];
    const priceRange = [moneyLabel(preference?.min_price, preference?.currency_code), moneyLabel(preference?.max_price, preference?.currency_code)]
        .filter(Boolean)
        .join(' – ');
    const composerReady = composer === 'note'
        ? Boolean(note.trim())
        : composer === 'communication'
            ? Boolean(communication.subject.trim() || communication.body.trim())
            : Boolean(activity.body.trim());

    const cleanPhone = party?.phone ? party.phone.replace(/[^\d+]/g, '') : '';

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, width: '100%' }}>
            <PageHeader
                title={party?.display_name || t('parties.show_title')}
                description={party
                    ? [t(party.party_kind === 'organization' ? 'parties.organization' : 'parties.person'), party.phone].filter(Boolean).join(' · ')
                    : t('parties.hint')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        <Button
                            variant="outlined"
                            startIcon={<ArrowBackOutlinedIcon />}
                            onClick={() => navigate('/admin/parties/index')}
                        >
                            {t('parties.back')}
                        </Button>
                        {party?.phone && (
                            <>
                                <Button
                                    variant="outlined"
                                    startIcon={<PhoneOutlinedIcon />}
                                    component="a"
                                    href={`tel:${cleanPhone}`}
                                >
                                    {t('parties.call')}
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<WhatsAppIcon sx={{ color: '#25D366' }} />}
                                    component="a"
                                    href={`https://wa.me/${cleanPhone.replace('+', '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {t('parties.whatsapp', { defaultValue: 'WhatsApp' })}
                                </Button>
                            </>
                        )}
                        {party?.email && (
                            <Button
                                variant="outlined"
                                startIcon={<EmailOutlinedIcon />}
                                component="a"
                                href={`mailto:${party.email}`}
                            >
                                {t('parties.send_email')}
                            </Button>
                        )}
                        <Can permission="party:create">
                            <Button
                                variant="contained"
                                startIcon={<EditOutlinedIcon />}
                                onClick={() => navigate(`/admin/parties/${id}/edit`)}
                            >
                                {t('common.edit')}
                            </Button>
                        </Can>
                    </Stack>
                )}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {party && (
                <Stack spacing={2}>
                    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 2.5 }}>
                            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                                <Avatar sx={{ width: 52, height: 52, bgcolor: 'primary.main', fontWeight: 700, fontSize: '1.2rem' }}>
                                    {partyInitials(party.display_name)}
                                </Avatar>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="h6" fontWeight={700} noWrap>
                                        {party.display_name}
                                    </Typography>
                                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ alignItems: 'center', mt: 0.5 }}>
                                        <Chip size="small" label={t(party.party_kind === 'organization' ? 'parties.organization' : 'parties.person')} variant="outlined" />
                                        {(party.roles || []).map((name) => (
                                            <Chip key={name} size="small" label={t(`parties.roles.${name}`, name)} color="primary" variant="outlined" />
                                        ))}
                                    </Stack>
                                </Box>
                            </Stack>

                            {/* Pipeline Stage Quick-Advancer */}
                            <Can permission="party:create">
                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                    <Typography variant="caption" color="text.secondary">
                                        {t('parties.pipeline_stage', { defaultValue: 'Stage' })}:
                                    </Typography>
                                    <TextField
                                        select
                                        size="small"
                                        disabled={updatingStage}
                                        value={party.pipeline_stage || 'lead'}
                                        onChange={(e) => changePipelineStage(e.target.value)}
                                        sx={{ minWidth: 140 }}
                                    >
                                        {PIPELINE_STAGES.map((s) => (
                                            <MenuItem key={s} value={s}>
                                                {t(`parties.pipeline_stages.${s}`, t(`reports_suite.${s}`, s))}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Stack>
                            </Can>
                        </Stack>

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                            <Fact label={t('parties.phone')} value={party.phone} />
                            <Fact label={t('parties.email')} value={party.email} />
                            <Fact label={t('parties.created')} value={dayLabel(party.created_at)} />
                            <Fact label={t('parties.branch')} value={party.branch_name} />
                            <Fact label={t('parties.city')} value={party.city_name} />
                            <Fact label={t('parties.address')} value={party.address} />
                        </Box>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                        <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" sx={{ mb: 2 }}>
                            <Tab value="activity" label={`${t('parties.activity_tab')} (${feed.length})`} />
                            <Tab value="preferences" label={t('parties.preferences_tab')} />
                            <Tab value="portfolio" label={`${t('parties.portfolio')} (${holdings.length + deals.length + matches.length + settlements.length})`} />
                        </Tabs>

                        {tab === 'activity' && (
                            <Stack spacing={2}>
                                <Can permission="party:create">
                                    <Box>
                                        <ToggleButtonGroup exclusive size="small" value={composer} onChange={(_, value) => { if (value) setComposer(value); }} sx={{ mb: 1.5 }}>
                                            <ToggleButton value="note">{t('parties.composer_note')}</ToggleButton>
                                            <ToggleButton value="communication">{t('parties.composer_communication')}</ToggleButton>
                                            <ToggleButton value="activity">{t('parties.composer_activity')}</ToggleButton>
                                        </ToggleButtonGroup>
                                        {composer === 'note' && (
                                            <TextField fullWidth multiline minRows={2} label={t('parties.note')} value={note} onChange={(event) => setNote(event.target.value)} slotProps={{ htmlInput: { maxLength: 5000 } }} />
                                        )}
                                        {composer === 'communication' && (
                                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
                                                <TextField select size="small" label={t('parties.channel')} value={communication.channel} onChange={(event) => setCommunication({ ...communication, channel: event.target.value })}>
                                                    {CHANNELS.map((name) => <MenuItem key={name} value={name}>{t(`parties.channels.${name}`)}</MenuItem>)}
                                                </TextField>
                                                <TextField select size="small" label={t('parties.direction')} value={communication.direction} onChange={(event) => setCommunication({ ...communication, direction: event.target.value })}>
                                                    {DIRECTIONS.map((name) => <MenuItem key={name} value={name}>{t(`parties.directions.${name}`)}</MenuItem>)}
                                                </TextField>
                                                <TextField size="small" label={t('parties.subject')} value={communication.subject} onChange={(event) => setCommunication({ ...communication, subject: event.target.value })} slotProps={{ htmlInput: { maxLength: 200 } }} sx={{ gridColumn: { md: '1 / -1' } }} />
                                                <TextField size="small" multiline minRows={2} label={t('parties.communication')} value={communication.body} onChange={(event) => setCommunication({ ...communication, body: event.target.value })} slotProps={{ htmlInput: { maxLength: 5000 } }} sx={{ gridColumn: { md: '1 / -1' } }} />
                                            </Box>
                                        )}
                                        {composer === 'activity' && (
                                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '220px 1fr' }, gap: 1.5 }}>
                                                <TextField select size="small" label={t('parties.activity')} value={activity.activity_type} onChange={(event) => setActivity({ ...activity, activity_type: event.target.value })}>
                                                    {ACTIVITY_TYPES.map((name) => <MenuItem key={name} value={name}>{t(`parties.activity_types.${name}`)}</MenuItem>)}
                                                </TextField>
                                                <TextField size="small" label={t('parties.note')} value={activity.body} onChange={(event) => setActivity({ ...activity, body: event.target.value })} slotProps={{ htmlInput: { maxLength: 5000 } }} />
                                            </Box>
                                        )}
                                        <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 1.5 }}>
                                            <Button variant="contained" disabled={saving || !composerReady} onClick={submitComposer}>{t('parties.add')}</Button>
                                        </Stack>
                                    </Box>
                                </Can>
                                {feed.length === 0 && <Typography color="text.secondary">{t('parties.timeline_empty')}</Typography>}
                                {feed.map((item) => (
                                    <Box key={item.id} sx={{ py: 1.25, borderTop: '1px solid', borderColor: 'divider' }}>
                                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                                            <Chip size="small" label={feedLabel(item, t)} variant="outlined" />
                                            <Typography variant="caption" color="text.secondary">{partyWhen(item.at)}</Typography>
                                        </Stack>
                                        {item.title && <Typography fontWeight={600}>{item.title}</Typography>}
                                        {item.body && <Typography variant="body2">{item.body}</Typography>}
                                    </Box>
                                ))}
                            </Stack>
                        )}

                        {tab === 'preferences' && (
                            <Stack spacing={2}>
                                {!preference && <Typography color="text.secondary">{t('parties.no_preferences')}</Typography>}
                                {preference && (
                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                                        <Fact label={t('parties.purpose')} value={preference.purpose ? t(`properties.purposes.${preference.purpose}`) : ''} />
                                        <Fact label={t('parties.type')} value={preference.property_type ? t(`properties.types.${preference.property_type}`) : ''} />
                                        <Fact label={t('parties.price_range')} value={priceRange} />
                                        <Fact label={t('parties.currency')} value={preference.currency_code} />
                                        <Fact label={t('parties.preferred_city')} value={preference.city} />
                                        <Fact label={t('parties.district')} value={preference.district} />
                                        <Fact label={t('parties.area_range')} value={[preference.min_area, preference.max_area].filter((value) => value != null && value !== '').map((value) => formatPrice(value)).join(' – ')} />
                                        <Fact label={t('parties.rooms')} value={preference.rooms} />
                                        <Fact label={t('parties.bathrooms')} value={preference.bathrooms} />
                                        <Fact label={t('parties.requirements')} value={preference.requirements} />
                                    </Box>
                                )}
                                <Can permission="party:create">
                                    <Box>
                                        <Button variant="outlined" onClick={() => navigate(`/admin/parties/${id}/edit`)}>{t('common.edit')}</Button>
                                    </Box>
                                </Can>
                            </Stack>
                        )}

                        {tab === 'portfolio' && (
                            <Stack spacing={3}>
                                <Box>
                                    <Typography fontWeight={700} sx={{ mb: 1 }}>{t('parties.matches')}</Typography>
                                    {matches.length === 0 && <Typography color="text.secondary">{t('parties.no_matches')}</Typography>}
                                    {matches.length > 0 && (
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>{t('properties.reference')}</TableCell>
                                                    <TableCell>{t('properties.name')}</TableCell>
                                                    <TableCell>{t('parties.city')}</TableCell>
                                                    <TableCell>{t('properties.price')}</TableCell>
                                                    <TableCell>{t('workspace_ui.status')}</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {matches.map((item) => (
                                                    <TableRow key={item.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/properties/${item.id}/show`)}>
                                                        <TableCell>{item.reference_number}</TableCell>
                                                        <TableCell>{item.title}</TableCell>
                                                        <TableCell>{[item.city, item.district].filter(Boolean).join(' · ') || '—'}</TableCell>
                                                        <TableCell>{moneyLabel(item.price, item.currency_code) || '—'}</TableCell>
                                                        <TableCell><StatusChip status={item.status} label={t(`properties.statuses.${item.status}`, item.status)} /></TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </Box>
                                <Box>
                                    <Typography fontWeight={700} sx={{ mb: 1 }}>{t('parties.holdings')}</Typography>
                                    {holdings.length === 0 && <Typography color="text.secondary">{t('parties.no_holdings')}</Typography>}
                                    {holdings.length > 0 && (
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>{t('properties.reference')}</TableCell>
                                                    <TableCell>{t('properties.name')}</TableCell>
                                                    <TableCell>{t('parties.share')}</TableCell>
                                                    <TableCell>{t('parties.since')}</TableCell>
                                                    <TableCell>{t('workspace_ui.status')}</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {holdings.map((item) => (
                                                    <TableRow key={item.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/properties/${item.property_id}/show`)}>
                                                        <TableCell>{item.reference_number}</TableCell>
                                                        <TableCell>{item.title}</TableCell>
                                                        <TableCell>{formatPrice(item.share_percent)}%</TableCell>
                                                        <TableCell>{dayLabel(item.effective_from)}</TableCell>
                                                        <TableCell>{item.effective_to ? t('parties.ended') : t('parties.current')}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </Box>
                                <Box>
                                    <Typography fontWeight={700} sx={{ mb: 1 }}>{t('parties.deals')}</Typography>
                                    {deals.length === 0 && <Typography color="text.secondary">{t('parties.no_deals')}</Typography>}
                                    {deals.length > 0 && (
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>{t('transactions.reference')}</TableCell>
                                                    <TableCell>{t('transactions.type')}</TableCell>
                                                    <TableCell>{t('transactions.property')}</TableCell>
                                                    <TableCell>{t('parties.role')}</TableCell>
                                                    <TableCell>{t('transactions.price')}</TableCell>
                                                    <TableCell>{t('workspace_ui.status')}</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {deals.map((item) => (
                                                    <TableRow key={`${item.id}-${item.participant_role}`} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/transactions/${item.id}/show`)}>
                                                        <TableCell>{item.reference_number}</TableCell>
                                                        <TableCell>{t(`transactions.types.${item.transaction_type}`)}</TableCell>
                                                        <TableCell>{item.property_title}</TableCell>
                                                        <TableCell>{t(`transactions.roles.${item.participant_role}`)}</TableCell>
                                                        <TableCell>{moneyLabel(item.amount, item.currency_code) || '—'}</TableCell>
                                                        <TableCell><StatusChip status={item.status} label={t(`transactions.statuses.${item.status}`)} /></TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </Box>
                                <Box>
                                    <Typography fontWeight={700} sx={{ mb: 1 }}>{t('parties.settlements', { defaultValue: 'Owner Settlements' })}</Typography>
                                    {settlements.length === 0 && <Typography color="text.secondary">{t('parties.no_settlements', { defaultValue: 'No owner settlements on this record' })}</Typography>}
                                    {settlements.length > 0 && (
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>{t('properties.name')}</TableCell>
                                                    <TableCell>{t('expenses.date', { defaultValue: 'Date' })}</TableCell>
                                                    <TableCell>{t('parties.period', { defaultValue: 'Period' })}</TableCell>
                                                    <TableCell>{t('expenses.price', { defaultValue: 'Net Payout' })}</TableCell>
                                                    <TableCell>{t('workspace_ui.status')}</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {settlements.map((item) => (
                                                    <TableRow key={item.id} hover>
                                                        <TableCell>{item.property_title || '—'}</TableCell>
                                                        <TableCell>{dayLabel(item.occurred_on || item.created_at)}</TableCell>
                                                        <TableCell>{`${dayLabel(item.period_from)} – ${dayLabel(item.period_to)}`}</TableCell>
                                                        <TableCell>{moneyLabel(item.net_amount, item.currency_code) || '—'}</TableCell>
                                                        <TableCell><StatusChip status={item.status} label={t(`transactions.statuses.${item.status}`, item.status)} /></TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </Box>
                            </Stack>
                        )}
                    </Paper>
                </Stack>
            )}
        </Box>
    );
}
