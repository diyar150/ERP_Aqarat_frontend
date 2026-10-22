import { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from './mapDefaults.js';

// Vite bundles marker assets; reset Leaflet's default icon paths.
const DefaultIcon = L.icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function MapInvalidateSize({ resizeKey }) {
    const map = useMap();
    useEffect(() => {
        const refresh = () => map.invalidateSize({ animate: false });
        refresh();
        const timers = [50, 150, 300].map((ms) => window.setTimeout(refresh, ms));
        window.addEventListener('resize', refresh);
        return () => {
            timers.forEach((id) => window.clearTimeout(id));
            window.removeEventListener('resize', refresh);
        };
    }, [map, resizeKey]);
    return null;
}

export function FitBounds({ points, padding = 48 }) {
    const map = useMap();
    const pointsKey = (points || []).map((point) => `${point[0]},${point[1]}`).join('|');
    useEffect(() => {
        if (!points?.length) return;
        if (points.length === 1) {
            map.setView(points[0], Math.max(map.getZoom(), 14));
            return;
        }
        map.fitBounds(L.latLngBounds(points), { padding: [padding, padding], maxZoom: 15 });
    }, [map, points, pointsKey, padding]);
    return null;
}

export default function MapShell({
    center = DEFAULT_MAP_CENTER,
    zoom = DEFAULT_MAP_ZOOM,
    height = 320,
    width = '100%',
    scrollWheelZoom = false,
    resizeKey,
    children,
}) {
    const pixelHeight = typeof height === 'number' ? height : undefined;
    const pixelWidth = typeof width === 'number' ? width : undefined;

    return (
        <MapContainer
            center={center}
            zoom={zoom}
            scrollWheelZoom={scrollWheelZoom}
            style={{
                height: pixelHeight ?? '100%',
                width: pixelWidth ?? '100%',
                minHeight: pixelHeight || '100%',
                borderRadius: typeof height === 'number' ? 8 : 0,
                zIndex: 0,
            }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapInvalidateSize resizeKey={`${resizeKey || 'map'}-${pixelWidth || 'auto'}x${pixelHeight || 'auto'}`} />
            {children}
        </MapContainer>
    );
}
