import { can, canAll, canAny } from '@/auth/can';
import { useAuthStore } from '@/store/authStore';

export default function Can({ permission, any = false, children }) {
    const user = useAuthStore((state) => state.user);
    if (!permission) return <>{children}</>;

    const names = Array.isArray(permission) ? permission : [permission];
    const allowed = Array.isArray(permission)
        ? (any ? canAny(user, names) : canAll(user, names))
        : can(user, permission);

    return allowed ? <>{children}</> : null;
}
