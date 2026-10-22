import { Component } from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

class PDFErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    render() {
        if (this.state.hasError) {
            return (
                <Box sx={{ py: 8, textAlign: 'center', px: 2 }}>
                    <Typography fontWeight={600}>{this.props.failedLabel}</Typography>
                    <Typography variant="caption" color="text.secondary">{this.state.error?.message}</Typography>
                </Box>
            );
        }
        return this.props.children;
    }
}

export default function PdfReportPreview({
    ready,
    loading,
    empty,
    emptyLabel,
    document: pdfDocument,
    height = 820,
    fill = false,
}) {
    const { t } = useTranslation();
    const shellSx = fill
        ? { width: '100%', height: '100%', minHeight: 280, display: 'flex', flexDirection: 'column' }
        : undefined;

    if (loading) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 10, gap: 2, ...shellSx }}>
                <CircularProgress size={28} />
                <Typography variant="body2" color="text.secondary">{t('common.loading')}</Typography>
            </Box>
        );
    }
    if (empty) {
        return (
            <Box sx={{ py: 8, textAlign: 'center', ...shellSx }}>
                <Typography color="text.secondary">{emptyLabel}</Typography>
            </Box>
        );
    }
    if (!ready || !pdfDocument) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 10, gap: 2, ...shellSx }}>
                <CircularProgress size={28} />
                <Typography variant="body2" color="text.secondary">{t('expenses.preparing_pdf', { defaultValue: 'Preparing PDF…' })}</Typography>
            </Box>
        );
    }
    return (
        <PDFErrorBoundary failedLabel={t('expenses.pdf_preview_failed', { defaultValue: 'PDF preview failed' })}>
            <Box sx={fill ? { width: '100%', height: '100%', minHeight: 280, '& iframe': { border: 'none' } } : undefined}>
                <PDFViewer
                    width="100%"
                    height={fill ? '100%' : height}
                    showToolbar
                    style={{ border: 'none', display: 'block', ...(fill ? { height: '100%', minHeight: 280 } : null) }}
                >
                    {pdfDocument}
                </PDFViewer>
            </Box>
        </PDFErrorBoundary>
    );
}
