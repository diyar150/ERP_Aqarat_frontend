import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Box, CircularProgress } from '@mui/material';
import fetch from '@/utils/fetch';
import { loadPdfCompany } from '@/utils/pdfCompany';
import { contractError } from '../contractForm.js';
import ContractTemplateBuilder from './ContractTemplateBuilder.jsx';
import { normalizeBlocks, normalizeDealType, normalizeLocale, starterBlocks } from './blockCatalog.js';

export default function TemplateBuilderPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { templateId } = useParams();
    const isEdit = Boolean(templateId);

    const [name, setName] = useState('');
    const [dealType, setDealType] = useState('both');
    const [locale, setLocale] = useState('en');
    const [lifecycle, setLifecycle] = useState('draft');
    const [isDefault, setIsDefault] = useState(false);
    const [revision, setRevision] = useState(1);
    const [blocks, setBlocks] = useState(() => starterBlocks('both', 'en'));
    const [company, setCompany] = useState({});
    const [loading, setLoading] = useState(isEdit);
    const [loadFailed, setLoadFailed] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [activeTemplateId, setActiveTemplateId] = useState(templateId);

    if (templateId !== activeTemplateId) {
        setActiveTemplateId(templateId);
        setLoading(Boolean(templateId));
        setLoadFailed(false);
        setError('');
    }

    useEffect(() => {
        let active = true;
        loadPdfCompany().then((brand) => { if (active) setCompany(brand); }).catch(() => {});
        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (!isEdit) return undefined;
        let active = true;
        fetch.get(`documents/templates/${templateId}`)
            .then((res) => {
                if (!active) return;
                const row = res.data?.data || {};
                setName(row.name || '');
                setDealType(normalizeDealType(row.deal_type));
                setLocale(normalizeLocale(row.locale));
                setLifecycle(row.lifecycle === 'published' ? 'published' : 'draft');
                setIsDefault(Boolean(row.is_default));
                setRevision(Number(row.revision || 1));
                setBlocks(normalizeBlocks(row.structure, row.body || ''));
                setLoading(false);
            })
            .catch((err) => {
                if (!active) return;
                setError(contractError(err, t));
                setLoadFailed(true);
                setLoading(false);
            });
        return () => { active = false; };
    }, [isEdit, templateId, t]);

    const save = async (payload) => {
        setSaving(true);
        setError('');
        try {
            let saved;
            if (isEdit) {
                const res = await fetch.patch(`documents/templates/${templateId}`, payload);
                saved = res.data?.data;
            } else {
                const res = await fetch.post('documents/templates', payload);
                saved = res.data?.data;
                // New templates are draft by default; publish so they appear on contract issue.
                if (saved?.id) {
                    try {
                        const published = await fetch.post(`documents/templates/${saved.id}/publish`);
                        saved = published.data?.data || saved;
                    } catch {
                        // Keep the draft if publish fails; create page can still publish on issue.
                    }
                }
            }
            if (saved?.lifecycle) setLifecycle(saved.lifecycle);
            if (saved?.revision) setRevision(Number(saved.revision));
            navigate('/admin/contracts/templates');
        } catch (err) {
            setError(contractError(err, t));
        } finally {
            setSaving(false);
        }
    };

    const publish = async () => {
        if (!isEdit) return;
        setSaving(true);
        setError('');
        try {
            const res = await fetch.post(`documents/templates/${templateId}/publish`);
            const row = res.data?.data || {};
            setLifecycle(row.lifecycle || 'published');
            setRevision(Number(row.revision || revision));
        } catch (err) {
            setError(contractError(err, t));
        } finally {
            setSaving(false);
        }
    };

    const unpublish = async () => {
        if (!isEdit) return;
        setSaving(true);
        setError('');
        try {
            const res = await fetch.post(`documents/templates/${templateId}/unpublish`);
            setLifecycle(res.data?.data?.lifecycle || 'draft');
        } catch (err) {
            setError(contractError(err, t));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress size={28} />
            </Box>
        );
    }

    if (isEdit && loadFailed) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">{error || t('contracts.loading')}</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ height: { lg: '100%' }, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <ContractTemplateBuilder
                name={name}
                onNameChange={setName}
                dealType={dealType}
                onDealTypeChange={(value) => {
                    setDealType(value);
                    if (!isEdit) setBlocks(starterBlocks(value, locale));
                }}
                locale={locale}
                onLocaleChange={(value) => {
                    setLocale(value);
                    if (!isEdit) setBlocks(starterBlocks(dealType, value));
                }}
                lifecycle={lifecycle}
                isDefault={isDefault}
                onIsDefaultChange={setIsDefault}
                revision={revision}
                blocks={blocks}
                onBlocksChange={setBlocks}
                company={company}
                saving={saving}
                error={error}
                onSave={save}
                onPublish={isEdit ? publish : null}
                onUnpublish={isEdit ? unpublish : null}
                onBack={() => navigate('/admin/contracts/templates')}
            />
        </Box>
    );
}
