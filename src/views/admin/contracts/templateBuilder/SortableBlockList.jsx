import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import {
    Box,
    Button,
    IconButton,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { BLOCK_TYPES, DEFAULT_TEXT_COLOR, blockSupportsColor } from './blockCatalog.js';
import BlockLayoutControls from './BlockLayoutControls.jsx';

function blockLabel(type, t) {
    const found = BLOCK_TYPES.find((item) => item.type === type);
    return found ? t(found.labelKey) : type;
}

function TableEditor({ block, onChange }) {
    const { t } = useTranslation();
    const rows = Array.isArray(block.rows) && block.rows.length ? block.rows : [['', '']];

    const updateCell = (rowIndex, cellIndex, value) => {
        const next = rows.map((row, r) => (
            r === rowIndex ? row.map((cell, c) => (c === cellIndex ? value : cell)) : row
        ));
        onChange({ rows: next });
    };

    const addRow = () => {
        const cols = Math.max(...rows.map((row) => row.length), 2);
        onChange({ rows: [...rows, Array.from({ length: cols }, () => '')] });
    };

    return (
        <Stack spacing={1}>
            {rows.map((row, rowIndex) => (
                <Stack key={`row-${rowIndex}`} direction="row" spacing={1}>
                    {row.map((cell, cellIndex) => (
                        <TextField
                            key={`cell-${rowIndex}-${cellIndex}`}
                            size="small"
                            fullWidth
                            value={cell}
                            label={rowIndex === 0 ? t('contracts.builder.table_header') : t('contracts.builder.table_cell')}
                            onChange={(event) => updateCell(rowIndex, cellIndex, event.target.value)}
                        />
                    ))}
                </Stack>
            ))}
            <Button size="small" onClick={addRow}>{t('contracts.builder.table_add_row')}</Button>
        </Stack>
    );
}

function SortableBlock({ block, index, onChange, onRemove, onFocusText, activeTextId }) {
    const { t } = useTranslation();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
    };

    const editable = blockSupportsColor(block.type);
    const textColor = block.textColor || DEFAULT_TEXT_COLOR;
    const backgroundColor = block.backgroundColor || null;
    const fieldSx = editable
        ? {
            '& .MuiInputBase-root': {
                bgcolor: backgroundColor || 'background.paper',
                color: textColor,
                fontWeight: block.bold ? 700 : 400,
                textAlign: block.align === 'center' ? 'center' : block.align === 'end' ? 'right' : 'left',
            },
            '& .MuiInputBase-input': {
                color: textColor,
                fontWeight: block.bold ? 700 : 400,
                textAlign: block.align === 'center' ? 'center' : block.align === 'end' ? 'right' : 'left',
            },
        }
        : undefined;

    const fixedTypes = new Set(['owners', 'divider', 'spacer', 'pagebreak']);

    return (
        <Paper
            ref={setNodeRef}
            style={style}
            variant="outlined"
            sx={{
                p: { xs: 1, sm: 1.5 },
                bgcolor: isDragging ? 'action.hover' : 'background.paper',
                borderLeft: editable && (block.textColor || block.backgroundColor) ? '3px solid' : undefined,
                borderLeftColor: editable
                    ? (block.backgroundColor || block.textColor || 'transparent')
                    : undefined,
            }}
        >
            <Stack direction="row" spacing={{ xs: 0.5, sm: 1 }} sx={{ alignItems: 'flex-start' }}>
                <IconButton
                    size="small"
                    {...attributes}
                    {...listeners}
                    aria-label={t('contracts.builder.drag')}
                    sx={{ mt: 0.25, cursor: 'grab', touchAction: 'none', flexShrink: 0 }}
                >
                    <DragIndicatorIcon fontSize="small" />
                </IconButton>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                        {blockLabel(block.type, t)}
                        {block.type === 'clause' ? ` · #${index + 1}` : ''}
                        {block.when && block.when !== 'always' ? ` · ${t(`contracts.builder.when_${block.when}`)}` : ''}
                    </Typography>
                    {block.type === 'heading' && (
                        <TextField
                            fullWidth
                            size="small"
                            label={t('contracts.builder.heading_text')}
                            value={block.title || ''}
                            onFocus={() => onFocusText?.(block.id, 'title')}
                            onChange={(event) => onChange(block.id, { title: event.target.value })}
                            sx={fieldSx}
                        />
                    )}
                    {block.type === 'paragraph' && (
                        <TextField
                            fullWidth
                            size="small"
                            multiline
                            minRows={3}
                            label={t('contracts.builder.paragraph_text')}
                            value={block.text || ''}
                            onFocus={() => onFocusText?.(block.id, 'text')}
                            onChange={(event) => onChange(block.id, { text: event.target.value })}
                            inputProps={{ 'data-block-field': `${block.id}:text` }}
                            sx={fieldSx}
                        />
                    )}
                    {block.type === 'clause' && (
                        <Stack spacing={1}>
                            <TextField
                                fullWidth
                                size="small"
                                label={t('contracts.builder.clause_title')}
                                value={block.title || ''}
                                onFocus={() => onFocusText?.(block.id, 'title')}
                                onChange={(event) => onChange(block.id, { title: event.target.value })}
                                sx={fieldSx}
                            />
                            <TextField
                                fullWidth
                                size="small"
                                multiline
                                minRows={3}
                                label={t('contracts.builder.clause_body')}
                                value={block.text || ''}
                                onFocus={() => onFocusText?.(block.id, 'text')}
                                onChange={(event) => onChange(block.id, { text: event.target.value })}
                                sx={fieldSx}
                            />
                        </Stack>
                    )}
                    {block.type === 'table' && (
                        <TableEditor block={block} onChange={(patch) => onChange(block.id, patch)} />
                    )}
                    {fixedTypes.has(block.type) && (
                        <Typography variant="body2" color="text.secondary">
                            {t(`contracts.builder.fixed_${block.type}`, { defaultValue: t('contracts.builder.fixed_block') })}
                        </Typography>
                    )}
                    {(block.type === 'parties' || block.type === 'signature') && (
                        <Typography variant="body2" color="text.secondary">
                            {t(`contracts.builder.fixed_${block.type}`)}
                        </Typography>
                    )}
                    {activeTextId === block.id && editable && (
                        <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 0.75 }}>
                            {t('contracts.builder.insert_target')}
                        </Typography>
                    )}
                    <BlockLayoutControls
                        block={block}
                        onChange={(patch) => onChange(block.id, patch)}
                    />
                </Box>
                <IconButton size="small" color="error" onClick={() => onRemove(block.id)} aria-label={t('contracts.builder.remove')}>
                    <DeleteOutlinedIcon fontSize="small" />
                </IconButton>
            </Stack>
        </Paper>
    );
}

export default function SortableBlockList({ blocks, onChange, onRemove, onFocusText, activeTextId }) {
    let clauseIndex = 0;
    return (
        <Stack spacing={1.25}>
            {blocks.map((block) => {
                const index = block.type === 'clause' ? clauseIndex++ : 0;
                return (
                    <SortableBlock
                        key={block.id}
                        block={block}
                        index={index}
                        onChange={onChange}
                        onRemove={onRemove}
                        onFocusText={onFocusText}
                        activeTextId={activeTextId}
                    />
                );
            })}
        </Stack>
    );
}
