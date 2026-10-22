import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import Can from '@/components/auth/Can.jsx';
import { AGENCY_REPORTS } from './reportCatalog.js';

export default function ReportsHub() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('reports.hub_title')}
                description={t('reports.hub_hint')}
            />
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' },
                    gap: 2,
                }}
            >
                {AGENCY_REPORTS.map((report) => {
                    const card = (
                        <Paper key={report.slug} variant="outlined" sx={{ p: 2.5, height: '100%' }}>
                            <Stack spacing={1.5} sx={{ height: '100%' }}>
                                <Typography fontWeight={700}>{t(report.titleKey)}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                                    {t(report.hintKey)}
                                </Typography>
                                <Button
                                    variant="contained"
                                    onClick={() => navigate(`/admin/reports/${report.slug}`)}
                                >
                                    {t('reports.open')}
                                </Button>
                            </Stack>
                        </Paper>
                    );
                    if (report.permissionAny) {
                        return (
                            <Can key={report.slug} permission={report.permissionAny} any>
                                {card}
                            </Can>
                        );
                    }
                    return (
                        <Can key={report.slug} permission={report.permission}>
                            {card}
                        </Can>
                    );
                })}
            </Box>
        </Box>
    );
}
