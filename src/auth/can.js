/** Exact permission membership. The API already applied role grants and subscription limits. */

export function can(user, permission) {
    if (!user || !Array.isArray(user.permissions) || typeof permission !== 'string') return false;
    return user.permissions.includes(permission);
}

export function canAny(user, permissions) {
    return permissions.some((permission) => can(user, permission));
}

export function canAll(user, permissions) {
    return permissions.every((permission) => can(user, permission));
}
