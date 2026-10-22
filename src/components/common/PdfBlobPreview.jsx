import { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

/**
 * In-browser preview for server-generated PDF blobs (contract invoices, template previews).
 * Matches the layout feel of PdfReportPreview / contracts Report.
 */
export default function PdfBlobPreview({
    src,
    loading = false,
    empty = false,
    emptyLabel,
    error = '',
    height = 820,
    title = 'PDF',
}) {
    const { t } = useTranslation();
    const [frameReady, setFrameReady] = useState(false);

    useEffect(() => {
        setFrameReady(false);
    }, [src]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 10, gap: 2 }}>
                <CircularProgress size={28} />
                <Typography variant="body2" color="text.secondary">{t('common.loading')}</Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ py: 8, textAlign: 'center', px: 2 }}>
                <Typography fontWeight={600}>{t('expenses.pdf_preview_failed', { defaultValue: 'PDF preview failed' })}</Typography>
                <Typography variant="caption" color="text.secondary">{error}</Typography>
            </Box>
        );
    }

    if (empty || !src) {
        return (
            <Box sx={{ py: 8, textAlign: 'center' }}>
                <Typography color="text.secondary">
                    {emptyLabel || t('operations.empty')}
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ position: 'relative', width: '100%', height, bgcolor: 'grey.100' }}>
            {!frameReady && (
                <Box sx={{
                    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 2, zIndex: 1,
                }}
                >
                    <CircularProgress size={28} />
                    <Typography variant="body2" color="text.secondary">
                        {t('expenses.preparing_pdf', { defaultValue: 'Preparing PDF…' })}
                    </Typography>
                </Box>
            )}
            <Box
                component="iframe"
                title={title}
                src={src}
                onLoad={() => setFrameReady(true)}
                sx={{
                    border: 'none',
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    opacity: frameReady ? 1 : 0,
                }}
            />
        </Box>
    );
}
