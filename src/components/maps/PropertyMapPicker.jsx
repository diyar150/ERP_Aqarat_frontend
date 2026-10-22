import { useEffect } from 'react';
import { Marker, useMap, useMapEvents } from 'react-leaflet';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import MapShell from './MapShell.jsx';
import MapFullscreenFrame from './MapFullscreenFrame.jsx';
import {
    DEFAULT_MAP_CENTER,
    DEFAULT_MAP_ZOOM,
    DETAIL_MAP_ZOOM,
    formatCoordinate,
    parseCoordinate,
    toLatLng,
} from './mapDefaults.js';

function PickerEvents({ onPick }) {
    useMapEvents({
        click(event) {
            onPick(event.latlng.lat, event.latlng.lng);
        },
    });
    return null;
}

function SyncView({ position }) {
    const map = useMap();
    const lat = position?.[0];
    const lng = position?.[1];
    useEffect(() => {
        if (lat == null || lng == null) return;
        map.setView([lat, lng], Math.max(map.getZoom(), DETAIL_MAP_ZOOM));
    }, [map, lat, lng]);
    return null;
}

export default function PropertyMapPicker({ latitude, longitude, onChange, height = 320 }) {
    const { t } = useTranslation();
    const position = toLatLng(latitude, longitude);
    const center = position || DEFAULT_MAP_CENTER;
    const zoom = position ? DETAIL_MAP_ZOOM : DEFAULT_MAP_ZOOM;

    const setPoint = (lat, lng) => {
        onChange({
            latitude: formatCoordinate(lat),
            longitude: formatCoordinate(lng),
        });
    };

    const setField = (key) => (event) => {
        const raw = event.target.value;
        onChange({
            latitude: key === 'latitude' ? raw : (latitude ?? ''),
            longitude: key === 'longitude' ? raw : (longitude ?? ''),
        });
    };

    const clearPoint = () => onChange({ latitude: '', longitude: '' });

    const useCurrentLocation = () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (result) => setPoint(result.coords.latitude, result.coords.longitude),
            () => {},
            { enableHighAccuracy: true, timeout: 10000 },
        );
    };

    return (
        <Stack spacing={1.5} sx={{ gridColumn: { md: '1 / -1' } }}>
            <Typography variant="body2" color="text.secondary">
                {t('properties.map_picker_hint')}
            </Typography>
            <MapFullscreenFrame height={height}>
                {({ expanded, height: mapHeight, width: mapWidth }) => (
                    <MapShell
                        key={`${position ? 'set' : 'empty'}-${expanded ? 'full' : 'normal'}`}
                        center={center}
                        zoom={zoom}
                        height={mapHeight}
                        width={mapWidth}
                        scrollWheelZoom
                        resizeKey={expanded ? 'expanded' : 'normal'}
                    >
                        <PickerEvents onPick={setPoint} />
                        <SyncView position={position} />
                        {position && (
                            <Marker
                                position={position}
                                draggable
                                eventHandlers={{
                                    dragend(event) {
                                        const next = event.target.getLatLng();
                                        setPoint(next.lat, next.lng);
                                    },
                                }}
                            />
                        )}
                    </MapShell>
                )}
            </MapFullscreenFrame>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr auto auto' }, gap: 1.5, alignItems: 'start' }}>
                <TextField
                    label={t('properties.latitude')}
                    value={latitude ?? ''}
                    onChange={setField('latitude')}
                    slotProps={{ htmlInput: { inputMode: 'decimal', dir: 'ltr' } }}
                    helperText={parseCoordinate(latitude) == null && latitude ? t('properties.map_invalid') : ' '}
                    error={Boolean(latitude) && parseCoordinate(latitude) == null}
                />
                <TextField
                    label={t('properties.longitude')}
                    value={longitude ?? ''}
                    onChange={setField('longitude')}
                    slotProps={{ htmlInput: { inputMode: 'decimal', dir: 'ltr' } }}
                    helperText={parseCoordinate(longitude) == null && longitude ? t('properties.map_invalid') : ' '}
                    error={Boolean(longitude) && parseCoordinate(longitude) == null}
                />
                <Button variant="outlined" onClick={useCurrentLocation} sx={{ height: 56 }}>
                    {t('properties.map_use_location')}
                </Button>
                <Button variant="outlined" color="inherit" onClick={clearPoint} disabled={!latitude && !longitude} sx={{ height: 56 }}>
                    {t('properties.map_clear')}
                </Button>
            </Box>
        </Stack>
    );
}
