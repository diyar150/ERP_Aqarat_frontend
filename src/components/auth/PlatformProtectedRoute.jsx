import { Navigate, Outlet } from 'react-router-dom';
import { usePlatformAuthStore } from '@/store/platformAuthStore';

export default function PlatformProtectedRoute() {
    const isAuthenticated = usePlatformAuthStore((state) => state.isAuthenticated);
    return isAuthenticated ? <Outlet /> : <Navigate to="/platform/login" replace />;
}
