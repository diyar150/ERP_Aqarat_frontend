import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Box, IconButton, Tooltip } from '@mui/material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import { useTranslation } from 'react-i18next';

export default function MapFullscreenFrame({ children, height = 320, border = true }) {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false);
    const mapHeight = expanded ? '100%' : height;
    const mapWidth = '100%';

    useEffect(() => {
        if (!expanded) return undefined;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (event) => {
            if (event.key === 'Escape') setExpanded(false);
        };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = previous;
            window.removeEventListener('keydown', onKey);
        };
    }, [expanded]);

    const frame = (
        <Box
            sx={expanded
                ? {
                    position: 'fixed',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: (theme) => theme.zIndex.modal + 2,
                    bgcolor: 'background.paper',
                }
                : {
                    position: 'relative',
                    border: border ? 1 : 0,
                    borderColor: 'divider',
                    borderRadius: 1,
                    overflow: 'hidden',
                    height,
                }}
        >
            <Tooltip title={expanded ? t('properties.map_exit_fullscreen') : t('properties.map_fullscreen')}>
                <IconButton
                    size="small"
                    onClick={() => setExpanded((current) => !current)}
                    aria-label={expanded ? t('properties.map_exit_fullscreen') : t('properties.map_fullscreen')}
                    sx={{
                        position: 'absolute',
                        bottom: 16,
                        left: 16,
                        zIndex: 1100,
                        bgcolor: 'background.paper',
                        boxShadow: 1,
                        '&:hover': { bgcolor: 'background.paper' },
                    }}
                >
                    {expanded ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
                </IconButton>
            </Tooltip>
            <Box sx={{ width: '100%', height: '100%' }}>
                {typeof children === 'function'
                    ? children({ expanded, height: mapHeight, width: mapWidth })
                    : children}
            </Box>
        </Box>
    );

    if (expanded && typeof document !== 'undefined') {
        return (
            <>
                <Box aria-hidden sx={{ height, borderRadius: 1 }} />
                {createPortal(frame, document.body)}
            </>
        );
    }

    return frame;
}
