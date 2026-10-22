// components/auth/PermissionProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import LoopIcon from "@mui/icons-material/Loop";

const PermissionProtectedRoute = ({
    permission,
    permissions,
    requireAll = false,
    children,
    redirectTo = "/admin/dashboard",
}) => {
    const {
        isAuthenticated,
        user,
        isLoading,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
    } = useAuthStore();

    if (isLoading) {
        return (
            <div className="w-full flex items-center justify-center py-20">
                <LoopIcon className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        return <Navigate to="/auth/login" replace />;
    }

    let hasAccess = false;
    if (permission) {
        hasAccess = hasPermission(permission);
    } else if (permissions && Array.isArray(permissions)) {
        hasAccess = requireAll
            ? hasAllPermissions(permissions)
            : hasAnyPermission(permissions);
    }

    if (!hasAccess) {
        return <Navigate to={redirectTo} replace />;
    }

    return children;
};

export default PermissionProtectedRoute;