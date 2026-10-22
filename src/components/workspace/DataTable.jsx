import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Chip,
    CircularProgress,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    Typography,
} from '@mui/material';

function cellSx(column, head = false) {
    return {
        fontWeight: head ? 600 : undefined,
        whiteSpace: 'nowrap',
        ...(column.pin === 'end' ? {
            position: 'sticky',
            insetInlineEnd: 0,
            zIndex: head ? 3 : 1,
            bgcolor: 'background.paper',
            boxShadow: (theme) => {
                const edge = theme.direction === 'rtl' ? '8px' : '-8px';
                return `${edge} 0 8px -8px rgba(0,0,0,0.25)`;
            },
        } : {}),
    };
}

const TONE = {
    active: 'success',
    suspended: 'warning',
    available: 'success',
    open: 'success',
    posted: 'success',
    reserved: 'warning',
    under_contract: 'warning',
    sold: 'info',
    rented: 'info',
    completed: 'info',
    cancelled: 'default',
    void: 'default',
    reversed: 'default',
    inactive: 'default',
    disabled: 'default',
    archived: 'default',
    signed: 'info',
    draft: 'default',
    sale: 'info',
    rent: 'success',
    pending: 'warning',
    approved: 'success',
    rejected: 'error',
    expiring: 'warning',
    expired: 'error',
    paid: 'success',
    partial: 'warning',
    scheduled: 'info',
    invoiced: 'warning',
    trialing: 'info',
    grace: 'warning',
};

export function StatusChip({ status, label }) {
    return <Chip size="small" label={label || status} color={TONE[status] || 'default'} variant="outlined" />;
}

export default function DataTable({
    columns,
    rows,
    loading = false,
    empty,
    page = 1,
    limit = 25,
    total = 0,
    onPageChange,
    onRowClick,
    rowKey = 'id',
    fill = false,
    renderExpanded,
    isRowExpanded,
    sx,
}) {
    const { t } = useTranslation();
    const colSpan = columns.length;

    return (
        <Paper
            variant="outlined"
            sx={{
                overflow: 'hidden',
                ...(fill ? {
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                } : {}),
                ...sx,
            }}
        >
            <TableContainer sx={fill ? { flex: 1, minHeight: 0, overflow: 'auto' } : undefined}>
                <Table size="medium" stickyHeader={fill}>
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                            {columns.map((column) => (
                                <TableCell key={column.key} align={column.align || 'inherit'} sx={cellSx(column, true)}>
                                    {column.header}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading && (
                            <TableRow>
                                <TableCell colSpan={colSpan} align="center" sx={{ py: 6 }}>
                                    <CircularProgress size={28} />
                                </TableCell>
                            </TableRow>
                        )}
                        {!loading && rows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={colSpan} align="center" sx={{ py: 6 }}>
                                    <Typography color="text.secondary">{empty}</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                        {!loading && rows.map((row) => (
                            <Fragment key={row[rowKey]}>
                                <TableRow
                                    hover={Boolean(onRowClick)}
                                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                                    sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                                >
                                    {columns.map((column) => (
                                        <TableCell key={column.key} align={column.align || 'inherit'} sx={cellSx(column)}>
                                            {column.render ? column.render(row) : row[column.key]}
                                        </TableCell>
                                    ))}
                                </TableRow>
                                {renderExpanded && isRowExpanded?.(row) && (
                                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                                        <TableCell colSpan={colSpan} sx={{ p: 0 }}>
                                            {renderExpanded(row)}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </Fragment>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                component="div"
                count={total}
                page={Math.max(0, page - 1)}
                onPageChange={(_, next) => onPageChange(next + 1)}
                rowsPerPage={limit}
                rowsPerPageOptions={[]}
                labelDisplayedRows={({ from, to, count }) => t('workspace_ui.range', { from, to, count })}
            />
        </Paper>
    );
}
