/** Default map center: Erbil (matches seeded property coords in tests). */
export const DEFAULT_MAP_CENTER = [36.191113, 44.009167];
export const DEFAULT_MAP_ZOOM = 12;
export const DETAIL_MAP_ZOOM = 16;

export function parseCoordinate(value) {
    if (value == null || value === '') return null;
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return number;
}

export function hasMapPoint(latitude, longitude) {
    return parseCoordinate(latitude) != null && parseCoordinate(longitude) != null;
}

export function toLatLng(latitude, longitude) {
    if (!hasMapPoint(latitude, longitude)) return null;
    return [parseCoordinate(latitude), parseCoordinate(longitude)];
}

export function formatCoordinate(value) {
    const number = parseCoordinate(value);
    if (number == null) return '';
    return number.toFixed(6);
}

export function markersWithPoints(items = []) {
    return items.filter((item) => hasMapPoint(item.latitude, item.longitude));
}
