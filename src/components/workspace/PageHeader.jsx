import { Box, Stack, Typography } from '@mui/material';

export default function PageHeader({ title, description, action }) {
    return (
        <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 2.5 }}
        >
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="h5" fontWeight={700}>{title}</Typography>
                {description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {description}
                    </Typography>
                )}
            </Box>
            {action}
        </Stack>
    );
}
