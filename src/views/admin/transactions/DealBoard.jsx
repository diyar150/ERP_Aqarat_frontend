import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DndContext, DragOverlay, PointerSensor, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { Box, Paper, Stack, TextField, Typography } from '@mui/material';
import { StatusChip } from '@/components/workspace/DataTable.jsx';
import { dealAmount, dealParties } from './transactionForm.js';

const COLUMNS = ['draft', 'open', 'completed', 'cancelled'];

function DealCard({ deal, t, dragging = false }) {
    return (
        <Paper
            variant="outlined"
            sx={{
                p: 1.25,
                cursor: dragging ? 'grabbing' : 'grab',
                opacity: dragging ? 0.85 : 1,
                bgcolor: 'background.paper',
            }}
        >
            <Typography fontWeight={700} variant="body2" sx={{ wordBreak: 'break-word' }}>
                {deal.reference_number}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {[deal.property_reference, deal.property_title].filter(Boolean).join(' · ') || '—'}
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ mt: 0.75, flexWrap: 'wrap' }} useFlexGap>
                <StatusChip status={deal.transaction_type} label={t(`transactions.types.${deal.transaction_type}`)} />
            </Stack>
            <Typography variant="body2" sx={{ mt: 0.75 }}>{dealAmount(deal)}</Typography>
            <Typography variant="caption" color="text.secondary">{dealParties(deal, t)}</Typography>
            {deal.agent_name ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{deal.agent_name}</Typography>
            ) : null}
        </Paper>
    );
}

function DraggableCard({ deal, t, onOpen }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `deal-${deal.id}`,
        data: { deal },
    });
    return (
        <Box
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            onDoubleClick={() => onOpen(deal)}
            sx={{ opacity: isDragging ? 0.4 : 1 }}
        >
            <DealCard deal={deal} t={t} />
        </Box>
    );
}

function Column({ status, deals, t, onOpen }) {
    const { setNodeRef, isOver } = useDroppable({ id: status });
    return (
        <Paper
            ref={setNodeRef}
            variant="outlined"
            sx={{
                p: 1.25,
                minWidth: 240,
                flex: '1 1 240px',
                bgcolor: isOver ? 'action.hover' : 'background.default',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '100%',
            }}
        >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <StatusChip status={status} label={t(`transactions.statuses.${status}`)} />
                <Typography variant="caption" color="text.secondary">{deals.length}</Typography>
            </Stack>
            <Stack spacing={1} sx={{ overflowY: 'auto', flex: 1, minHeight: 120 }}>
                {deals.length === 0 && (
                    <Typography variant="caption" color="text.secondary">{t('transactions.board_empty')}</Typography>
                )}
                {deals.map((deal) => (
                    <DraggableCard key={deal.id} deal={deal} t={t} onOpen={onOpen} />
                ))}
            </Stack>
        </Paper>
    );
}

export default function DealBoard({ columns, onMove, cancelReason, onCancelReason }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [active, setActive] = useState(null);
    const [needCancelReason, setNeedCancelReason] = useState(false);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
    const byId = useMemo(() => {
        const map = new Map();
        COLUMNS.forEach((status) => {
            (columns?.[status] || []).forEach((deal) => map.set(deal.id, deal));
        });
        return map;
    }, [columns]);

    return (
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">{t('transactions.board_hint')}</Typography>
            {needCancelReason && (
                <Typography variant="body2" color="error.main">{t('transactions.board_cancel_required')}</Typography>
            )}
            <DndContext
                sensors={sensors}
                onDragStart={(event) => {
                    const deal = event.active.data.current?.deal;
                    setActive(deal || null);
                }}
                onDragEnd={async (event) => {
                    const deal = event.active.data.current?.deal;
                    const to = event.over?.id;
                    setActive(null);
                    if (!deal || !to || !COLUMNS.includes(String(to)) || deal.status === to)
                        return;
                    if (to === 'cancelled' && !String(cancelReason || '').trim()) {
                        setNeedCancelReason(true);
                        return;
                    }
                    setNeedCancelReason(false);
                    await onMove(deal, String(to));
                }}
                onDragCancel={() => setActive(null)}
            >
                <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'stretch', flex: 1, minHeight: 0 }}>
                    {COLUMNS.map((status) => (
                        <Column
                            key={status}
                            status={status}
                            deals={columns?.[status] || []}
                            t={t}
                            onOpen={(deal) => navigate(`/admin/transactions/${deal.id}/show`)}
                        />
                    ))}
                </Stack>
                <DragOverlay>
                    {active ? <DealCard deal={active} t={t} dragging /> : null}
                </DragOverlay>
            </DndContext>
            {byId.size > 0 && (
                <TextField
                    size="small"
                    label={t('transactions.cancel_reason')}
                    value={cancelReason || ''}
                    onChange={(event) => {
                        setNeedCancelReason(false);
                        onCancelReason?.(event.target.value);
                    }}
                    helperText={t('transactions.board_cancel_hint')}
                    error={needCancelReason}
                    sx={{ maxWidth: 420 }}
                />
            )}
        </Box>
    );
}
