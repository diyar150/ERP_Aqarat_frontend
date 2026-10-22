import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import fetch from '@/utils/fetch';
import { formatPrice, currencyLabel, moneyLabel } from '@/utils/money.js';
import Can from '@/components/auth/Can.jsx';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import { StatusChip } from '@/components/workspace/DataTable.jsx';
import { useAuthStore } from '@/store/authStore';
import { can } from '@/auth/can';
import { PropertyMapView } from '@/components/maps';
import PropertyDesk from './PropertyDesk.jsx';
import { draftNotReadyMessage, fieldsNotReadyMessage } from './propertyReadiness.js';

function Fact({ label, value }) {
    return (
        <Box>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography>{value || '—'}</Typography>
        </Box>
    );
}

function revokePreviews(items) {
    items.forEach((item) => URL.revokeObjectURL(item.url));
}

async function fetchPropertyView(propertyId) {
    const res = await fetch.get(`properties/${propertyId}`);
    const data = res.data.data;
    const images = data.images || [];
    const previews = [];
    for (const image of images) {
        const file = await fetch.get(`properties/${propertyId}/images/${image.id}`, { responseType: 'blob' });
        previews.push({ id: image.id, url: URL.createObjectURL(file.data), name: image.original_name, is_cover: Boolean(image.is_cover) });
    }
    return { data, previews };
}

export default function Show() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const user = useAuthStore((state) => state.user);
    const [property, setProperty] = useState(null);
    const [status, setStatus] = useState('draft');
    const [owner, setOwner] = useState({ display_name: '', share_percent: '', effective_from: '' });
    const [error, setError] = useState('');
    const [warning, setWarning] = useState('');
    const [previews, setPreviews] = useState([]);
    const [fileTarget, setFileTarget] = useState(null);
    const [removingFile, setRemovingFile] = useState(false);
    const [documentKind, setDocumentKind] = useState('ownership');

    const applyProperty = ({ data, previews }) => {
        setProperty(data);
        setStatus(data.status);
        setPreviews((current) => {
            revokePreviews(current);
            return previews;
        });
    };

    const load = () => fetchPropertyView(id).then(applyProperty);

    useEffect(() => {
        let active = true;
        fetchPropertyView(id)
            .then((view) => {
                if (!active) {
                    revokePreviews(view.previews);
                    return;
                }
                applyProperty(view);
            })
            .catch((err) => {
                if (active) setError(err.response?.data?.error?.message || t('login.error'));
            });
        return () => { active = false; };
    }, [id, t]);

    const saveStatus = async () => {
        setError('');
        setWarning('');
        try {
            const res = await fetch.post(`properties/${id}/status`, { status });
            setProperty(res.data.data);
        } catch (err) {
            const fields = err.response?.data?.error?.fields;
            if (fields?.status)
                setError(t('properties.status_blocked'));
            else if (fields && typeof fields === 'object') {
                const message = fieldsNotReadyMessage(fields, t);
                if (message) {
                    setWarning(message);
                    return;
                }
            }
            setError(err.response?.data?.error?.message || t('login.error'));
        }
    };

    const upload = async (kind, file) => {
        if (!file) return;
        const body = new FormData();
        body.append('file', file);
        setError('');
        try {
            await fetch.post(kind === 'image' ? `properties/${id}/images` : `properties/${id}/documents?category=${documentKind}`, body);
            await load();
        } catch (err) {
            setError(err.response?.data?.error?.message || t('login.error'));
        }
    };

    const downloadDocument = async (documentId, name) => {
        const res = await fetch.get(`properties/${id}/documents/${documentId}`, { responseType: 'blob' });
        const url = URL.createObjectURL(res.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        link.click();
        URL.revokeObjectURL(url);
    };

    const moveImage = async (imageId, direction) => {
        setError('');
        try {
            await fetch.post(`properties/${id}/images/${imageId}/move`, { direction });
            await load();
        } catch (err) {
            setError(err.response?.data?.error?.message || t('login.error'));
        }
    };

    const setCover = async (imageId) => {
        setError('');
        try {
            await fetch.post(`properties/${id}/images/${imageId}/cover`, {});
            await load();
        } catch (err) {
            setError(err.response?.data?.error?.message || t('login.error'));
        }
    };

    const removeFile = async () => {
        if (!fileTarget) return;
        setRemovingFile(true);
        setError('');
        const path = fileTarget.kind === 'image'
            ? `properties/${id}/images/${fileTarget.id}`
            : `properties/${id}/documents/${fileTarget.id}`;
        try {
            await fetch.delete(path);
            setFileTarget(null);
            await load();
        } catch (err) {
            const message = err.response?.data?.error?.message || '';
            setError(err.response?.status === 409 ? t('properties.document_in_use') : (message || t('login.error')));
            setFileTarget(null);
        } finally {
            setRemovingFile(false);
        }
    };

    const addOwner = async (event) => {
        event.preventDefault();
        setError('');
        try {
            await fetch.put(`properties/${id}/ownerships`, owner);
            setOwner({ display_name: '', share_percent: '', effective_from: '' });
            await load();
        } catch (err) {
            setError(err.response?.data?.error?.message || t('login.error'));
        }
    };

    const readinessWarning = useMemo(
        () => warning || draftNotReadyMessage(property, t),
        [warning, property, t],
    );

    if (!property && !error) return null;
    const canOpenDeal = can(user, 'transaction:create') || can(user, 'financial:view');
    const statuses = [property?.status, ...(property?.next_statuses || [])]
        .filter((item, index, list) => item && list.indexOf(item) === index)
        .filter((item) => item !== 'archived' || can(user, 'property:archive'));

    const price = property?.price ? moneyLabel(property.price, property.currency_code, '') : t('properties.no_price');
    const place = [property?.address, property?.neighborhood, property?.district, property?.city].filter(Boolean).join(' · ');
    const mapPoint = property?.latitude != null && property?.longitude != null
        ? `${property.latitude}, ${property.longitude}`
        : '';

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={property?.title || t('properties.title')}
                description={property?.reference_number || t('workspace_ui.properties_hint')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Button onClick={() => navigate('/admin/properties/index')}>{t('common.back')}</Button>
                        <Can permission="transaction:create">
                            <Button
                                variant="outlined"
                                onClick={() => {
                                    const type = property?.purpose === 'rent' ? 'rent' : 'sale';
                                    navigate(`/admin/transactions/create?property_id=${id}&type=${type}`);
                                }}
                            >
                                {t('properties.start_deal')}
                            </Button>
                        </Can>
                        <Can permission="property:update">
                            <Button variant="contained" onClick={() => navigate(`/admin/properties/${id}/edit`)}>{t('common.edit')}</Button>
                        </Can>
                    </Stack>
                )}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {readinessWarning && (
                <Alert severity="warning" sx={{ mb: 2 }} onClose={warning ? () => setWarning('') : undefined}>
                    {readinessWarning}
                </Alert>
            )}
            {property && (
                <Stack spacing={2}>
                    <Paper variant="outlined" sx={{ p: 3 }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
                            <StatusChip status={property.status} label={t(`properties.statuses.${property.status}`)} />
                            <Typography color="text.secondary">{property.reference_number}</Typography>
                        </Stack>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                            <Fact label={t('properties.type')} value={t(`properties.types.${property.property_type}`)} />
                            <Fact label={t('properties.purpose')} value={t(`properties.purposes.${property.purpose}`)} />
                            <Fact label={t('properties.price')} value={price} />
                            <Fact label={t('properties.area')} value={property.area} />
                            <Fact label={t('properties.rooms')} value={property.rooms} />
                            <Fact label={t('properties.bathrooms')} value={property.bathrooms} />
                            <Fact label={t('properties.floors')} value={property.floors} />
                            <Fact label={t('properties.year_built')} value={property.year_built} />
                            <Fact label={t('properties.location')} value={place} />
                            <Fact label={t('properties.map')} value={mapPoint || t('properties.map_none')} />
                            <Fact label={t('properties.branch')} value={property.branch_name} />
                            <Fact label={t('properties.keys')} value={property.key_branch_name || t('properties.no_keys')} />
                            <Fact label={t('properties.agent')} value={property.agent_name} />
                            {property.parent_title && <Fact label={t('properties.building')} value={property.parent_title} />}
                            <Fact label={t('properties.deed_number')} value={property.deed_number} />
                            <Fact label={t('properties.available_from')} value={property.available_from} />
                            <Fact label={t('properties.available_to')} value={property.available_to} />
                            <Fact label={t('properties.description')} value={property.description} />
                            <Fact label={t('properties.created_by')} value={property.created_by_name} />
                            <Fact label={t('common.created_at')} value={property.created_at} />
                        </Box>
                        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mt: 2 }}>
                            {(property.features || []).map((feature) => (
                                <Chip key={feature} label={t(`properties.feature_names.${feature}`)} size="small" />
                            ))}
                        </Stack>
                        <Box sx={{ mt: 2 }}>
                            <Typography fontWeight={700} sx={{ mb: 1 }}>{t('properties.map')}</Typography>
                            <PropertyMapView
                                latitude={property.latitude}
                                longitude={property.longitude}
                                height={280}
                            />
                            {mapPoint && (
                                <Button
                                    sx={{ mt: 1 }}
                                    component="a"
                                    href={`https://www.openstreetmap.org/?mlat=${property.latitude}&mlon=${property.longitude}#map=16/${property.latitude}/${property.longitude}`}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    {t('properties.open_map')}
                                </Button>
                            )}
                        </Box>
                    </Paper>
                    <Paper sx={{ p: 3 }}>
                        <Typography fontWeight={700} mb={0.5}>{t('properties.deals')}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{t('properties.deals_hint')}</Typography>
                        {(property.deals || []).length === 0 && <Typography color="text.secondary">{t('properties.no_deals')}</Typography>}
                        <Stack spacing={1}>
                            {(property.deals || []).map((deal) => {
                                const amount = deal.amount ? moneyLabel(deal.amount, deal.currency_code, '') : t('properties.no_price');
                                return (
                                    <Stack key={deal.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
                                        {canOpenDeal ? (
                                            <Button onClick={() => navigate(`/admin/transactions/${deal.id}/show`)}>{deal.reference_number}</Button>
                                        ) : (
                                            <Typography>{deal.reference_number}</Typography>
                                        )}
                                        <StatusChip status={deal.status} label={t(`transactions.statuses.${deal.status}`)} />
                                        <Typography color="text.secondary">{t(`transactions.types.${deal.transaction_type}`)} · {amount}</Typography>
                                    </Stack>
                                );
                            })}
                        </Stack>
                    </Paper>
                    <Paper sx={{ p: 3 }}>
                        <Typography fontWeight={700} mb={1}>{t('properties.history')}</Typography>
                        {(property.status_history || []).map((row) => (
                            <Typography key={row.id}>
                                {row.from_status ? t(`properties.statuses.${row.from_status}`) : '—'} → {t(`properties.statuses.${row.to_status}`)}
                            </Typography>
                        ))}
                        <Can permission="property:update">
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2, alignItems: { sm: 'center' } }}>
                                <TextField select size="small" value={status} onChange={(event) => setStatus(event.target.value)} label={t('workspace_ui.status')} helperText={t('properties.status_hint')}>
                                    {statuses.map((item) => <MenuItem key={item} value={item}>{t(`properties.statuses.${item}`)}</MenuItem>)}
                                </TextField>
                                <Button variant="outlined" onClick={saveStatus} disabled={status === property.status}>{t('properties.save_status')}</Button>
                            </Stack>
                        </Can>
                    </Paper>
                    <Paper sx={{ p: 3 }}>
                        <Typography fontWeight={700} mb={1}>{t('properties.images')}</Typography>
                        {previews.length === 0 && <Typography color="text.secondary">{t('properties.no_images')}</Typography>}
                        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                            {previews.map((image, index) => (
                                <Box key={image.id} sx={{ width: 140 }}>
                                    <Box component="img" alt={image.name} src={image.url} sx={{ width: 140, height: 100, objectFit: 'cover', borderRadius: 1, outline: image.is_cover ? '2px solid' : 'none', outlineColor: 'primary.main' }} />
                                    {image.is_cover && <Chip size="small" label={t('properties.cover')} sx={{ mt: 0.5 }} />}
                                    <Can permission="property:update">
                                        <Stack>
                                            {!image.is_cover && <Button size="small" onClick={() => setCover(image.id)}>{t('properties.make_cover')}</Button>}
                                            <Button size="small" disabled={index === 0} onClick={() => moveImage(image.id, 'up')}>{t('properties.move_earlier')}</Button>
                                            <Button size="small" disabled={index === previews.length - 1} onClick={() => moveImage(image.id, 'down')}>{t('properties.move_later')}</Button>
                                            <Button size="small" color="error" onClick={() => setFileTarget({ kind: 'image', id: image.id, name: image.name })}>{t('common.delete')}</Button>
                                        </Stack>
                                    </Can>
                                </Box>
                            ))}
                        </Stack>
                        <Can permission="property:update">
                            <Button component="label" sx={{ mt: 1 }}>{t('properties.upload_image')}<input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload('image', event.target.files?.[0])} /></Button>
                        </Can>
                    </Paper>
                    <Paper sx={{ p: 3 }}>
                        <Typography fontWeight={700} mb={1}>{t('properties.documents')}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{t('properties.documents_hint')}</Typography>
                        {(property.documents || []).length === 0 && <Typography color="text.secondary">{t('properties.no_documents')}</Typography>}
                        {(property.documents || []).map((file) => (
                            <Stack key={file.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                {can(user, 'document:download') ? (
                                    <Button onClick={() => downloadDocument(file.id, file.original_name)}>{file.original_name}</Button>
                                ) : (
                                    <Typography sx={{ flex: 1 }}>{file.original_name}</Typography>
                                )}
                                <Can permission="property:update">
                                    <Button color="error" onClick={() => setFileTarget({ kind: 'document', id: file.id, name: file.original_name })}>{t('common.delete')}</Button>
                                </Can>
                            </Stack>
                        ))}
                        <Can permission="property:update">
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
                                <TextField select size="small" label={t('properties.document_kind')} value={documentKind} onChange={(event) => setDocumentKind(event.target.value)}>
                                    {['ownership', 'floor_plan', 'municipal', 'other'].map((kind) => <MenuItem key={kind} value={kind}>{t(`properties.document_kinds.${kind}`)}</MenuItem>)}
                                </TextField>
                                <Button component="label">{t('properties.upload_document')}<input hidden type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => upload('document', event.target.files?.[0])} /></Button>
                            </Stack>
                        </Can>
                    </Paper>
                    <PropertyDesk property={property} onReload={load} />
                    {property.owners && (
                        <Paper component="form" onSubmit={addOwner} sx={{ p: 3 }}>
                            <Typography fontWeight={700} mb={1}>{t('properties.owners')}</Typography>
                            {property.owners.map((row) => (
                                <Typography key={row.id}>
                                    {row.display_name} · {row.share_percent}% · {row.effective_from}
                                    {row.phone ? ` · ${row.phone}` : ''}
                                </Typography>
                            ))}
                            <Can permission="property:owners">
                                <Stack spacing={1} mt={2}>
                                    <TextField label={t('properties.owner_name')} value={owner.display_name} onChange={(event) => setOwner({ ...owner, display_name: event.target.value })} />
                                    <TextField label={t('properties.share')} value={owner.share_percent} onChange={(event) => setOwner({ ...owner, share_percent: event.target.value })} />
                                    <TextField label={t('properties.effective_from')} type="date" value={owner.effective_from} onChange={(event) => setOwner({ ...owner, effective_from: event.target.value })} InputLabelProps={{ shrink: true }} />
                                    <Button type="submit" variant="contained">{t('properties.add_owner')}</Button>
                                </Stack>
                            </Can>
                        </Paper>
                    )}
                </Stack>
            )}
            <Dialog open={Boolean(fileTarget)} onClose={() => { if (!removingFile) setFileTarget(null); }}>
                <DialogTitle>{t(fileTarget?.kind === 'document' ? 'properties.remove_document_title' : 'properties.remove_image_title')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t(fileTarget?.kind === 'document' ? 'properties.remove_document_confirm' : 'properties.remove_image_confirm', { name: fileTarget?.name || '' })}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFileTarget(null)} disabled={removingFile}>{t('common.cancel')}</Button>
                    <Button color="error" variant="contained" onClick={removeFile} disabled={removingFile}>{t('common.delete')}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
