import { useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import MapShell, { FitBounds } from './MapShell.jsx';
import MapFullscreenFrame from './MapFullscreenFrame.jsx';
import {
    DEFAULT_MAP_CENTER,
    DEFAULT_MAP_ZOOM,
    DETAIL_MAP_ZOOM,
    markersWithPoints,
    toLatLng,
} from './mapDefaults.js';

export default function PropertyMapView({
    properties = [],
    latitude,
    longitude,
    height = 320,
    interactive = true,
    onOpen,
    emptyLabel,
}) {
    const { t } = useTranslation();
    const markers = useMemo(() => (
        properties.length
            ? markersWithPoints(properties)
            : (toLatLng(latitude, longitude)
                ? [{ id: 'single', latitude, longitude }]
                : [])
    ), [properties, latitude, longitude]);
    const points = useMemo(
        () => markers.map((item) => toLatLng(item.latitude, item.longitude)).filter(Boolean),
        [markers],
    );
    const markerKey = useMemo(
        () => markers.map((item) => `${item.id}:${item.latitude},${item.longitude}`).join('|'),
        [markers],
    );
    const center = points[0] || DEFAULT_MAP_CENTER;
    const zoom = points.length === 1 ? DETAIL_MAP_ZOOM : DEFAULT_MAP_ZOOM;

    if (!markers.length) {
        return (
            <Box
                sx={{
                    height,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                }}
            >
                <Typography color="text.secondary">{emptyLabel || t('properties.map_empty')}</Typography>
            </Box>
        );
    }

    return (
        <MapFullscreenFrame height={height}>
            {({ expanded, height: mapHeight, width: mapWidth }) => (
                <MapShell
                    key={`${expanded ? 'full' : 'normal'}-${markerKey}`}
                    center={center}
                    zoom={zoom}
                    height={mapHeight}
                    width={mapWidth}
                    scrollWheelZoom={interactive || expanded}
                    resizeKey={expanded ? `expanded-${markerKey}` : `normal-${markerKey}`}
                >
                    <FitBounds points={points} />
                    {markers.map((item) => {
                        const position = toLatLng(item.latitude, item.longitude);
                        if (!position) return null;
                        return (
                            <Marker key={item.id} position={position}>
                                {(item.title || onOpen) && (
                                    <Popup>
                                        <Stack spacing={0.75} sx={{ minWidth: 140 }}>
                                            {item.reference_number && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {item.reference_number}
                                                </Typography>
                                            )}
                                            {item.title && (
                                                <Typography variant="body2" fontWeight={600}>
                                                    {item.title}
                                                </Typography>
                                            )}
                                            {item.status && (
                                                <Typography variant="caption">
                                                    {t(`properties.statuses.${item.status}`)}
                                                </Typography>
                                            )}
                                            {onOpen && item.id !== 'single' && (
                                                <Button size="small" onClick={() => onOpen(item)}>
                                                    {t('properties.open_property')}
                                                </Button>
                                            )}
                                        </Stack>
                                    </Popup>
                                )}
                            </Marker>
                        );
                    })}
                </MapShell>
            )}
        </MapFullscreenFrame>
    );
}
