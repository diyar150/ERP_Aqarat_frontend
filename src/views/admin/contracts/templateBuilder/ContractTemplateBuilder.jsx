import { useMemo, useState } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    useDraggable,
    useDroppable,
    DragOverlay,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
    Alert,
    Box,
    Button,
    Chip,
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Switch,
    Tab,
    Tabs,
    TextField,
    Typography,
    useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PdfReportPreview from '@/components/common/PdfReportPreview.jsx';
import ContractInvoicePdf from '../ContractInvoicePdf.jsx';
import MergeFieldPalette from './MergeFieldPalette.jsx';
import SortableBlockList from './SortableBlockList.jsx';
import {
    BLOCK_TYPES,
    DEAL_TYPES,
    TEMPLATE_LOCALES,
    compileBlocks,
    compileSections,
    createBlock,
    findUnknownTokens,
    localeIsRtl,
    serializeStructure,
} from './blockCatalog.js';

const PALETTE_PREFIX = 'palette:';
const CANVAS_ID = 'canvas-drop';

const panelSx = {
    p: { xs: 1.25, md: 1.5 },
    overflow: 'auto',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
};

function PaletteItem({ type, label, onClick }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `${PALETTE_PREFIX}${type}`,
        data: { fromPalette: true, type },
    });

    return (
        <Button
            ref={setNodeRef}
            fullWidth
            variant="outlined"
            size="small"
            onClick={onClick}
            disabled={isDragging}
            sx={{
                justifyContent: 'flex-start',
                textTransform: 'none',
                opacity: isDragging ? 0.5 : 1,
                cursor: 'grab',
                minHeight: 36,
                px: 1,
            }}
            {...listeners}
            {...attributes}
        >
            {label}
        </Button>
    );
}

function ToolsPanel({ t, onAddBlock, onInsertToken }) {
    return (
        <Paper
            variant="outlined"
            sx={{
                ...panelSx,
                gridArea: 'tools',
                height: { xs: 'auto', lg: '100%' },
            }}
        >
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75 }}>
                {t('contracts.builder.blocks')}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25 }}>
                {t('contracts.builder.blocks_hint')}
            </Typography>
            <Box
                sx={{
                    display: 'grid',
                    gap: 1,
                    gridTemplateColumns: {
                        xs: 'repeat(2, minmax(0, 1fr))',
                        sm: 'repeat(3, minmax(0, 1fr))',
                        md: 'repeat(4, minmax(0, 1fr))',
                        lg: '1fr',
                    },
                }}
            >
                {BLOCK_TYPES.map((item) => (
                    <PaletteItem
                        key={item.type}
                        type={item.type}
                        label={t(item.labelKey)}
                        onClick={() => onAddBlock(item.type)}
                    />
                ))}
            </Box>
            <Box sx={{ mt: 2 }}>
                <MergeFieldPalette onInsert={onInsertToken} />
            </Box>
        </Paper>
    );
}

function CanvasPanel({ t, blocks, onChange, onRemove, onFocusText, activeTextId }) {
    const { setNodeRef, isOver } = useDroppable({ id: CANVAS_ID });

    return (
        <Paper
            ref={setNodeRef}
            variant="outlined"
            sx={{
                ...panelSx,
                gridArea: 'canvas',
                minHeight: { xs: 320, md: 380, lg: 0 },
                height: { lg: '100%' },
                outline: isOver ? '2px solid' : 'none',
                outlineColor: 'primary.main',
            }}
        >
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                {t('contracts.builder.canvas')}
            </Typography>
            <Box sx={{ flex: 1, minHeight: 0 }}>
                <SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
                    {blocks.length === 0 ? (
                        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                            {t('contracts.builder.canvas_empty')}
                        </Typography>
                    ) : (
                        <SortableBlockList
                            blocks={blocks}
                            onChange={onChange}
                            onRemove={onRemove}
                            onFocusText={onFocusText}
                            activeTextId={activeTextId}
                        />
                    )}
                </SortableContext>
            </Box>
        </Paper>
    );
}

function PreviewPanel({ t, previewReady, pdfDoc }) {
    return (
        <Paper
            variant="outlined"
            sx={{
                ...panelSx,
                gridArea: 'preview',
                minHeight: { xs: 420, md: 480, lg: 0 },
                height: { xs: 480, md: 560, lg: '100%' },
                overflow: 'hidden',
            }}
        >
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                {t('contracts.preview')}
            </Typography>
            <Box sx={{ flex: 1, minHeight: 0, height: '100%' }}>
                <PdfReportPreview
                    loading={false}
                    ready={previewReady}
                    empty={!previewReady}
                    emptyLabel={t('contracts.builder.preview_empty')}
                    document={pdfDoc}
                    fill
                />
            </Box>
        </Paper>
    );
}

export default function ContractTemplateBuilder({
    name,
    onNameChange,
    dealType = 'both',
    onDealTypeChange,
    locale = 'en',
    onLocaleChange,
    lifecycle = 'draft',
    isDefault = false,
    onIsDefaultChange,
    revision = 1,
    blocks,
    onBlocksChange,
    company,
    saving,
    error,
    onSave,
    onPublish,
    onUnpublish,
    onBack,
}) {
    const { t } = useTranslation();
    const theme = useTheme();
    const docRtl = localeIsRtl(locale);
    const isCompact = useMediaQuery(theme.breakpoints.down('md'));
    const [activeDrag, setActiveDrag] = useState(null);
    const [focusTarget, setFocusTarget] = useState(null);
    const [mobileTab, setMobileTab] = useState(0);
    const frozen = lifecycle === 'published';

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const body = useMemo(() => compileBlocks(blocks, { locale, dealType }), [blocks, locale, dealType]);
    const previewSections = useMemo(
        () => compileSections(blocks, undefined, { locale, dealType: dealType === 'both' ? 'rent' : dealType }),
        [blocks, locale, dealType],
    );
    const unknownTokens = useMemo(() => findUnknownTokens(blocks, locale), [blocks, locale]);
    const previewReady = Boolean(body) || previewSections.some((section) => (
        section.type === 'spacer'
        || section.type === 'divider'
        || section.type === 'pagebreak'
        || section.type === 'table'
        || String(section.text || '').trim()
    ));
    const exportDate = useMemo(
        () => format(new Date(), docRtl ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm'),
        [docRtl],
    );

    const pdfDoc = (
        <ContractInvoicePdf
            title={name.trim() || t('contracts.builder.untitled')}
            body={body}
            sections={previewSections}
            watermark={lifecycle === 'draft' ? 'DRAFT' : null}
            forceRtl={docRtl}
            company={company}
            exportDate={exportDate}
            exportDateLabel={t('expenses.generated_at')}
            addressLabel={t('agency.address', { defaultValue: 'Address:' })}
            isRTL={docRtl}
        />
    );

    const addBlock = (type, atIndex = null) => {
        if (frozen) return;
        const next = createBlock(type);
        if (atIndex == null || atIndex < 0) {
            onBlocksChange([...blocks, next]);
            return;
        }
        const copy = [...blocks];
        copy.splice(atIndex, 0, next);
        onBlocksChange(copy);
    };

    const updateBlock = (id, patch) => {
        if (frozen) return;
        onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, ...patch } : block)));
    };

    const removeBlock = (id) => {
        if (frozen) return;
        onBlocksChange(blocks.filter((block) => block.id !== id));
        if (focusTarget?.id === id) setFocusTarget(null);
    };

    const insertToken = (markup) => {
        if (!focusTarget) {
            const lastEditable = [...blocks].reverse().find((block) => (
                block.type === 'paragraph' || block.type === 'clause' || block.type === 'heading'
            ));
            if (!lastEditable) {
                const next = createBlock('paragraph');
                next.text = markup;
                onBlocksChange([...blocks, next]);
                setFocusTarget({ id: next.id, field: 'text' });
                return;
            }
            const field = lastEditable.type === 'heading' ? 'title' : 'text';
            const current = String(lastEditable[field] || '');
            updateBlock(lastEditable.id, { [field]: current ? `${current} ${markup}` : markup });
            setFocusTarget({ id: lastEditable.id, field });
            return;
        }
        const block = blocks.find((item) => item.id === focusTarget.id);
        if (!block) return;
        const field = focusTarget.field || (block.type === 'heading' ? 'title' : 'text');
        if (field !== 'title' && field !== 'text') return;
        const current = String(block[field] || '');
        updateBlock(block.id, { [field]: current ? `${current} ${markup}` : markup });
    };

    const onDragStart = (event) => {
        const id = String(event.active.id);
        if (id.startsWith(PALETTE_PREFIX)) {
            setActiveDrag({ kind: 'palette', type: id.slice(PALETTE_PREFIX.length) });
            return;
        }
        setActiveDrag({ kind: 'block', id });
    };

    const onDragEnd = (event) => {
        const { active, over } = event;
        setActiveDrag(null);
        if (!over) return;

        const activeStr = String(active.id);
        const overStr = String(over.id);

        if (activeStr.startsWith(PALETTE_PREFIX)) {
            const type = active.data.current?.type || activeStr.slice(PALETTE_PREFIX.length);
            if (overStr === CANVAS_ID) {
                addBlock(type);
                return;
            }
            const overIndex = blocks.findIndex((block) => block.id === overStr);
            addBlock(type, overIndex >= 0 ? overIndex + 1 : null);
            return;
        }

        if (activeStr === overStr) return;
        const oldIndex = blocks.findIndex((block) => block.id === activeStr);
        const newIndex = blocks.findIndex((block) => block.id === overStr);
        if (oldIndex < 0 || newIndex < 0) return;
        onBlocksChange(arrayMove(blocks, oldIndex, newIndex));
    };

    const workspace = (
        <Box
            sx={{
                flex: { md: 1 },
                minHeight: { md: 0, lg: 0 },
                display: 'grid',
                gap: { xs: 1.5, md: 2 },
                width: '100%',
                alignItems: 'stretch',
                gridTemplateColumns: {
                    xs: '1fr',
                    md: 'minmax(0, 1fr) minmax(0, 1fr)',
                    lg: '220px minmax(0, 1.15fr) minmax(280px, 0.95fr)',
                },
                gridTemplateRows: {
                    xs: 'auto',
                    md: 'auto minmax(420px, 1fr)',
                    lg: 'minmax(0, 1fr)',
                },
                gridTemplateAreas: {
                    xs: `
                        "tools"
                        "canvas"
                        "preview"
                    `,
                    md: `
                        "tools tools"
                        "canvas preview"
                    `,
                    lg: `"tools canvas preview"`,
                },
                // Below lg the page scrolls; on lg the workspace fills the viewport.
                height: { lg: '100%' },
            }}
        >
            <ToolsPanel t={t} onAddBlock={addBlock} onInsertToken={insertToken} />
            <CanvasPanel
                t={t}
                blocks={blocks}
                onChange={updateBlock}
                onRemove={removeBlock}
                onFocusText={(id, field) => setFocusTarget({ id, field })}
                activeTextId={focusTarget?.id}
            />
            <PreviewPanel t={t} previewReady={previewReady} pdfDoc={pdfDoc} />
        </Box>
    );

    return (
        <Box
            sx={{
                p: { xs: 1.5, sm: 2, md: 3 },
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                minHeight: { xs: 'auto', lg: '100%' },
                height: { lg: '100%' },
                display: 'flex',
                flexDirection: 'column',
                gap: { xs: 1.5, md: 2 },
            }}
        >
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.25}
                sx={{ alignItems: { sm: 'flex-start' }, justifyContent: 'space-between', gap: 1 }}
            >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
                        {t('contracts.builder.title')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {t('contracts.builder.hint')}
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1} useFlexGap sx={{ width: { xs: '100%', sm: 'auto' }, flexShrink: 0, flexWrap: 'wrap' }}>
                    <Button fullWidth={isCompact} onClick={onBack}>{t('contracts.back')}</Button>
                    {lifecycle === 'published' && onUnpublish && (
                        <Button fullWidth={isCompact} disabled={saving} onClick={onUnpublish}>
                            {t('contracts.builder.unpublish')}
                        </Button>
                    )}
                    {lifecycle === 'draft' && onPublish && (
                        <Button fullWidth={isCompact} disabled={saving || !body || unknownTokens.length > 0} onClick={onPublish}>
                            {t('contracts.builder.publish')}
                        </Button>
                    )}
                    <Button
                        fullWidth={isCompact}
                        variant="contained"
                        disabled={saving || frozen || !name.trim() || !body || unknownTokens.length > 0}
                        onClick={() => onSave({
                            name: name.trim(),
                            body,
                            structure: serializeStructure(blocks),
                            deal_type: dealType,
                            locale,
                            is_default: isDefault,
                            lifecycle: 'draft',
                        })}
                    >
                        {saving ? t('contracts.preparing') : t('contracts.save')}
                    </Button>
                </Stack>
            </Stack>

            {error && <Alert severity="error">{error}</Alert>}
            {frozen && (
                <Alert severity="info">{t('contracts.builder.published_locked')}</Alert>
            )}
            {unknownTokens.length > 0 && (
                <Alert severity="warning">
                    {t('contracts.builder.unknown_tokens', { tokens: unknownTokens.join(', ') })}
                </Alert>
            )}

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap', alignItems: { md: 'center' } }}>
                <TextField
                    required
                    fullWidth
                    label={t('contracts.template_name')}
                    value={name}
                    disabled={frozen}
                    onChange={(event) => onNameChange(event.target.value)}
                    sx={{ maxWidth: { sm: 360 } }}
                />
                <FormControl size="small" sx={{ minWidth: 140 }} disabled={frozen}>
                    <InputLabel>{t('contracts.builder.deal_type')}</InputLabel>
                    <Select
                        label={t('contracts.builder.deal_type')}
                        value={dealType}
                        onChange={(event) => onDealTypeChange?.(event.target.value)}
                    >
                        {DEAL_TYPES.map((value) => (
                            <MenuItem key={value} value={value}>{t(`contracts.builder.deal_${value}`)}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }} disabled={frozen}>
                    <InputLabel>{t('contracts.builder.locale')}</InputLabel>
                    <Select
                        label={t('contracts.builder.locale')}
                        value={locale}
                        onChange={(event) => onLocaleChange?.(event.target.value)}
                    >
                        {TEMPLATE_LOCALES.map((value) => (
                            <MenuItem key={value} value={value}>{t(`contracts.builder.locale_${value}`)}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControlLabel
                    control={(
                        <Switch
                            checked={Boolean(isDefault)}
                            disabled={frozen}
                            onChange={(event) => onIsDefaultChange?.(event.target.checked)}
                        />
                    )}
                    label={t('contracts.builder.is_default')}
                />
                <Chip
                    size="small"
                    color={lifecycle === 'published' ? 'success' : 'default'}
                    label={`${t(`contracts.builder.lifecycle_${lifecycle}`)} · v${revision}`}
                />
            </Stack>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
            >
                {isCompact ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minHeight: 0 }}>
                        <Tabs
                            value={mobileTab}
                            onChange={(_, value) => setMobileTab(value)}
                            variant="fullWidth"
                            sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 42 }}
                        >
                            <Tab label={t('common.edit')} sx={{ minHeight: 42, textTransform: 'none' }} />
                            <Tab label={t('contracts.preview')} sx={{ minHeight: 42, textTransform: 'none' }} />
                        </Tabs>
                        {mobileTab === 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                <ToolsPanel t={t} onAddBlock={addBlock} onInsertToken={insertToken} />
                                <CanvasPanel
                                    t={t}
                                    blocks={blocks}
                                    onChange={updateBlock}
                                    onRemove={removeBlock}
                                    onFocusText={(id, field) => setFocusTarget({ id, field })}
                                    activeTextId={focusTarget?.id}
                                />
                            </Box>
                        ) : (
                            <PreviewPanel t={t} previewReady={previewReady} pdfDoc={pdfDoc} />
                        )}
                    </Box>
                ) : (
                    workspace
                )}

                <DragOverlay>
                    {activeDrag?.kind === 'palette' ? (
                        <Paper sx={{ p: 1.25, width: 200, maxWidth: '70vw', boxShadow: 3 }}>
                            <Typography variant="body2">
                                {t(BLOCK_TYPES.find((item) => item.type === activeDrag.type)?.labelKey || 'contracts.builder.block_paragraph')}
                            </Typography>
                        </Paper>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </Box>
    );
}
