import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import SaveIcon from "@mui/icons-material/Save";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import SecurityIcon from "@mui/icons-material/Security";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import UndoIcon from "@mui/icons-material/Undo";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    FormControlLabel,
    IconButton,
    InputAdornment,
    Paper,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import Can from "@/components/auth/Can.jsx";
import fetch from "@/utils/fetch";
import { useAuthStore } from "@/store/authStore";
import useIsRTL from "@/hooks/useIsRTL";
import DOMPurify from "dompurify";

/** Module order for the modern assignable catalog only (matches RoleCatalog). */
const MODULE_ORDER = [
    "agency",
    "subscription",
    "staff",
    "role",
    "property",
    "location",
    "branch",
    "party",
    "transaction",
    "financial",
    "expenses",
    "document",
    "audit",
];

const CRITICAL_PERMISSIONS = new Set(["agency:manage", "role:manage", "staff:manage"]);
/** Must match PUT /admin/role-permissions/:id/permissions gates. */
const ROLE_EDIT_PERMS = ["role_permissions.create", "role_permissions.edit", "role:manage"];

function getModuleKey(permissionName = "") {
    const name = String(permissionName || "");
    if (name.includes(":")) {
        const [resource] = name.split(":");
        return resource || "other";
    }
    const parts = name.split(".");
    if (parts.length < 2) return "other";
    return parts.slice(0, -1).join(".");
}

function getActionKey(permissionName = "") {
    const name = String(permissionName || "");
    if (name.includes(":")) {
        const parts = name.split(":");
        return parts[parts.length - 1] || "other";
    }
    const parts = name.split(".");
    return parts[parts.length - 1] || "other";
}

/** i18next treats ":" as nsSeparator — never put raw "module:action" in a t() key. */
function permissionLabelKey(permissionName = "") {
    const name = String(permissionName || "");
    if (!name) return "";
    if (name.includes(":")) {
        const [moduleKey, actionKey] = name.split(":");
        return `permission_labels.${moduleKey}.${actionKey}`;
    }
    return `permission_labels.${name}`;
}

function isSystemRole(role) {
    if (!role) return false;
    if (role.is_system) return true;
    return ["agency owner", "manager", "agent", "accountant", "admin"].includes(
        String(role.name || "").toLowerCase()
    );
}

export default function RolePermissions() {
    const { t, i18n } = useTranslation();
    const isRTL = useIsRTL();
    const { roleId } = useParams();
    const navigate = useNavigate();
    const refreshUser = useAuthStore((state) => state.refreshUser);
    const user = useAuthStore((state) => state.user);

    const canEdit = Array.isArray(user?.permissions) && ROLE_EDIT_PERMS.some((p) => user.permissions.includes(p));
    const isViewMode = !canEdit;

    const [role, setRole] = useState(null);
    const [allPermissions, setAllPermissions] = useState([]);
    const [rolePermissions, setRolePermissions] = useState([]);
    const [selectedPermissions, setSelectedPermissions] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState({});
    const [prevRoleId, setPrevRoleId] = useState(roleId);

    // Reset local state when the route param changes (avoids setState-in-effect).
    if (roleId !== prevRoleId) {
        setPrevRoleId(roleId);
        setLoading(true);
        setError(null);
        setRole(null);
        setAllPermissions([]);
        setRolePermissions([]);
        setSelectedPermissions([]);
        setExpanded({});
    }

    useEffect(() => {
        if (!roleId) return undefined;

        let active = true;

        Promise.all([
            fetch.get(`admin/roles/${roleId}`),
            fetch.get("admin/permissions/all"),
            fetch.get(`admin/role-permissions/${roleId}/permissions`),
        ])
            .then(([roleRes, permsRes, rolePermsRes]) => {
                if (!active) return;
                if (!roleRes.data.success) throw new Error("Role not found");

                setRole(roleRes.data.data);

                const permissions = permsRes.data.success ? (permsRes.data.data || []) : [];
                setAllPermissions(permissions);

                if (rolePermsRes.data.success) {
                    const assigned = rolePermsRes.data.data.rolePermissions || [];
                    setRolePermissions(assigned);
                    setSelectedPermissions(assigned.map((p) => p.id));
                }

                const modules = [...new Set(permissions.map((p) => getModuleKey(p.name)))];
                const initialExpanded = {};
                modules.forEach((m) => { initialExpanded[m] = true; });
                setExpanded(initialExpanded);
            })
            .catch((err) => {
                if (!active) return;
                setError(err.message || t("role_permissions.error_loading"));
                Swal.fire({
                    icon: "error",
                    title: t("common.error"),
                    text: t("role_permissions.error_loading"),
                    timer: 2000,
                    showConfirmButton: false,
                }).then(() => navigate("/admin/roles/index"));
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [roleId, navigate, t]);

    const localizePermission = useCallback((permission) => {
        const key = permissionLabelKey(permission.name);
        if (key && i18n.exists(key)) return t(key);
        const action = getActionKey(permission.name);
        const moduleKey = getModuleKey(permission.name);
        const hasModule = i18n.exists(`permission_modules.${moduleKey}`);
        const hasAction = i18n.exists(`permission_actions.${action}`);
        if (hasModule || hasAction) {
            const moduleLabel = hasModule ? t(`permission_modules.${moduleKey}`) : moduleKey.replace(/_/g, " ");
            const actionLabel = hasAction ? t(`permission_actions.${action}`) : action;
            return `${actionLabel} · ${moduleLabel}`;
        }
        if (permission.description) return DOMPurify.sanitize(permission.description);
        return `${action} · ${moduleKey.replace(/_/g, " ")}`;
    }, [i18n, t]);

    const localizeModule = (moduleKey) => {
        if (i18n.exists(`permission_modules.${moduleKey}`)) return t(`permission_modules.${moduleKey}`);
        return moduleKey.replace(/_/g, " ");
    };

    const filteredPermissions = useMemo(() => {
        if (!search.trim()) return allPermissions;
        const q = search.toLowerCase();
        return allPermissions.filter((p) => {
            const label = localizePermission(p).toLowerCase();
            return (
                label.includes(q)
                || (p.name || "").toLowerCase().includes(q)
                || (p.description || "").toLowerCase().includes(q)
            );
        });
    }, [allPermissions, search, localizePermission]);

    const groupedPermissions = useMemo(() => {
        const groups = {};
        filteredPermissions.forEach((p) => {
            const moduleKey = getModuleKey(p.name);
            if (!groups[moduleKey]) groups[moduleKey] = [];
            groups[moduleKey].push(p);
        });
        Object.values(groups).forEach((list) => {
            list.sort((a, b) => String(a.name).localeCompare(String(b.name)));
        });
        return Object.entries(groups).sort(([a], [b]) => {
            const ai = MODULE_ORDER.indexOf(a);
            const bi = MODULE_ORDER.indexOf(b);
            const ao = ai === -1 ? 999 : ai;
            const bo = bi === -1 ? 999 : bi;
            if (ao !== bo) return ao - bo;
            return a.localeCompare(b);
        });
    }, [filteredPermissions]);

    const originalIds = useMemo(
        () => rolePermissions.map((p) => p.id).slice().sort((a, b) => a - b).join(","),
        [rolePermissions]
    );
    const selectedIds = useMemo(
        () => selectedPermissions.slice().sort((a, b) => a - b).join(","),
        [selectedPermissions]
    );
    const hasChanges = selectedIds !== originalIds;

    useEffect(() => {
        if (!hasChanges || isViewMode) return undefined;
        const onBeforeUnload = (event) => {
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, [hasChanges, isViewMode]);

    const confirmLeave = async () => {
        if (!hasChanges || isViewMode) return true;
        const result = await Swal.fire({
            title: t("role_permissions.leave_title"),
            text: t("role_permissions.leave_text"),
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: t("role_permissions.leave_confirm"),
            cancelButtonText: t("common.cancel"),
            confirmButtonColor: "#dc3545",
        });
        return result.isConfirmed;
    };

    const goBack = async () => {
        if (await confirmLeave()) navigate("/admin/roles/index");
    };

    const handleTogglePermission = (permissionId) => {
        if (isViewMode) return;
        setSelectedPermissions((prev) =>
            prev.includes(permissionId)
                ? prev.filter((id) => id !== permissionId)
                : [...prev, permissionId]
        );
    };

    const handleToggleModule = (modulePerms) => {
        if (isViewMode) return;
        const ids = modulePerms.map((p) => p.id);
        const allSelected = ids.every((id) => selectedPermissions.includes(id));
        setSelectedPermissions((prev) =>
            allSelected
                ? prev.filter((id) => !ids.includes(id))
                : [...new Set([...prev, ...ids])]
        );
    };

    const handleSelectAll = () => {
        if (isViewMode) return;
        const filteredIds = filteredPermissions.map((p) => p.id);
        const allSelected = filteredIds.every((id) => selectedPermissions.includes(id));
        setSelectedPermissions((prev) =>
            allSelected
                ? prev.filter((id) => !filteredIds.includes(id))
                : [...new Set([...prev, ...filteredIds])]
        );
    };

    const handleDiscard = () => {
        setSelectedPermissions(rolePermissions.map((p) => p.id));
    };

    const expandAll = () => {
        const next = {};
        groupedPermissions.forEach(([key]) => { next[key] = true; });
        setExpanded(next);
    };

    const collapseAll = () => {
        const next = {};
        groupedPermissions.forEach(([key]) => { next[key] = false; });
        setExpanded(next);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch.put(`admin/role-permissions/${roleId}/permissions`, {
                permissionIds: selectedPermissions,
            });
            if (response.data.success) {
                const updatedPerms = allPermissions.filter((p) => selectedPermissions.includes(p.id));
                setRolePermissions(updatedPerms);
                setSelectedPermissions(updatedPerms.map((p) => p.id));
                await refreshUser();
                Swal.fire({
                    icon: "success",
                    title: t("common.success"),
                    text: response.data.message || t("role_permissions.update_success"),
                    timer: 1500,
                    showConfirmButton: false,
                });
            }
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: t("common.error"),
                text: err.response?.data?.message || t("role_permissions.error_saving"),
                timer: 2200,
                showConfirmButton: false,
            });
        } finally {
            setSaving(false);
        }
    };

    const allFilteredSelected = filteredPermissions.length > 0
        && filteredPermissions.every((p) => selectedPermissions.includes(p.id));

    const criticalSelected = useMemo(() => {
        const byId = new Map(allPermissions.map((p) => [p.id, p.name]));
        return selectedPermissions
            .map((id) => byId.get(id))
            .filter((name) => CRITICAL_PERMISSIONS.has(name));
    }, [allPermissions, selectedPermissions]);

    if (loading) {
        return (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
                <Stack alignItems="center" spacing={2}>
                    <CircularProgress />
                    <Typography color="text.secondary">{t("role_permissions.loading")}</Typography>
                </Stack>
            </Box>
        );
    }

    if (error || !role) {
        return (
            <Box sx={{ p: 4 }}>
                <Alert severity="error" sx={{ mb: 2 }}>{error || t("role_permissions.role_not_found")}</Alert>
                <Button variant="outlined" onClick={() => navigate("/admin/roles/index")}>
                    {t("role_permissions.back_to_roles")}
                </Button>
            </Box>
        );
    }

    const system = isSystemRole(role);

    return (
        <Box sx={{ width: "100%", minHeight: "100vh", bgcolor: "background.default", pb: 12 }} dir={isRTL ? "rtl" : "ltr"}>
            <title>{t("role_permissions.edit_title")}</title>
            <Box sx={{ mx: "auto", px: { xs: 2, md: 3 }, pt: 3, pb: 4, maxWidth: 1100 }}>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2} mb={2.5}>
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                        <IconButton onClick={goBack} sx={{ mt: 0.25 }} aria-label={t("role_permissions.back_button")}>
                            <ArrowBackIcon sx={{ transform: isRTL ? "scaleX(-1)" : "none" }} />
                        </IconButton>
                        <Box>
                            <Typography fontWeight={800} sx={{ fontSize: { xs: "1.25rem", lg: "1.6rem" }, letterSpacing: "-0.02em" }}>
                                {isViewMode ? t("role_permissions.view_title") : t("role_permissions.edit_title")}
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center" mt={0.75} flexWrap="wrap" useFlexGap>
                                <Chip
                                    icon={<SecurityIcon sx={{ fontSize: "16px !important" }} />}
                                    label={role?.name ? DOMPurify.sanitize(role.name) : ""}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                />
                                {system && (
                                    <Chip
                                        size="small"
                                        icon={<LockOutlinedIcon sx={{ fontSize: "14px !important" }} />}
                                        label={t("roles.system_role")}
                                        color="primary"
                                        variant="outlined"
                                    />
                                )}
                                <Chip
                                    label={t("role_permissions.selected_count", { count: selectedPermissions.length })}
                                    size="small"
                                    variant="outlined"
                                />
                                {hasChanges && !isViewMode && (
                                    <Chip label={t("role_permissions.has_changes")} size="small" color="warning" />
                                )}
                                {isViewMode && (
                                    <Chip label={t("role_permissions.view_mode")} size="small" color="info" />
                                )}
                            </Stack>
                            <Typography variant="body2" color="text.secondary" mt={1}>
                                {t("role_permissions.subtitle")}
                            </Typography>
                        </Box>
                    </Stack>
                </Stack>

                {system && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        {t("role_permissions.system_role_hint")}
                    </Alert>
                )}

                {!isViewMode && criticalSelected.length > 0 && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        {t("role_permissions.critical_hint")}
                    </Alert>
                )}

                <Paper
                    elevation={0}
                    variant="outlined"
                    sx={{ p: 2, mb: 2.5, borderRadius: 2 }}
                >
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder={t("role_permissions.search_placeholder")}
                            value={search}
                            onChange={(e) => setSearch(DOMPurify.sanitize(e.target.value))}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                                        </InputAdornment>
                                    ),
                                },
                            }}
                        />
                        <Stack direction="row" spacing={1} flexShrink={0} flexWrap="wrap" useFlexGap>
                            <Button size="small" variant="outlined" onClick={expandAll}>{t("role_permissions.expand_all")}</Button>
                            <Button size="small" variant="outlined" onClick={collapseAll}>{t("role_permissions.collapse_all")}</Button>
                            {!isViewMode && (
                                <Can permission={ROLE_EDIT_PERMS} any>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={handleSelectAll}
                                        disabled={filteredPermissions.length === 0}
                                        startIcon={allFilteredSelected ? <CheckBoxOutlineBlankIcon /> : <CheckBoxIcon />}
                                    >
                                        {allFilteredSelected
                                            ? t("role_permissions.deselect_all")
                                            : t("role_permissions.select_all")}
                                    </Button>
                                </Can>
                            )}
                        </Stack>
                    </Stack>
                </Paper>

                {groupedPermissions.length === 0 ? (
                    <Paper elevation={0} variant="outlined" sx={{ p: 6, textAlign: "center", borderRadius: 2 }}>
                        <Typography color="text.secondary">
                            {search
                                ? t("role_permissions.no_permissions_found")
                                : t("role_permissions.no_permissions_available")}
                        </Typography>
                    </Paper>
                ) : (
                    <Stack spacing={1.25}>
                        {groupedPermissions.map(([moduleKey, perms]) => {
                            const selectedInModule = perms.filter((p) => selectedPermissions.includes(p.id)).length;
                            const allModuleSelected = selectedInModule === perms.length && perms.length > 0;
                            const someModuleSelected = selectedInModule > 0 && !allModuleSelected;

                            return (
                                <Accordion
                                    key={moduleKey}
                                    disableGutters
                                    elevation={0}
                                    expanded={!!expanded[moduleKey]}
                                    onChange={(_, isExpanded) => setExpanded((prev) => ({ ...prev, [moduleKey]: isExpanded }))}
                                    sx={{
                                        borderRadius: "12px !important",
                                        border: "1px solid",
                                        borderColor: "divider",
                                        "&:before": { display: "none" },
                                        overflow: "hidden",
                                    }}
                                >
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                        <Stack
                                            direction="row"
                                            alignItems="center"
                                            justifyContent="space-between"
                                            sx={{ width: "100%", pr: 1 }}
                                        >
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                {!isViewMode && (
                                                    <Checkbox
                                                        size="small"
                                                        checked={allModuleSelected}
                                                        indeterminate={someModuleSelected}
                                                        onChange={() => handleToggleModule(perms)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                )}
                                                <Box>
                                                    <Typography fontWeight={700}>{localizeModule(moduleKey)}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {t("role_permissions.module_selected", {
                                                            selected: selectedInModule,
                                                            total: perms.length,
                                                        })}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                            <Chip
                                                size="small"
                                                label={`${selectedInModule}/${perms.length}`}
                                                color={allModuleSelected ? "success" : someModuleSelected ? "warning" : "default"}
                                                variant="outlined"
                                            />
                                        </Stack>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ pt: 0, pb: 2 }}>
                                        <Box
                                            sx={{
                                                display: "grid",
                                                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                                                gap: 1,
                                            }}
                                        >
                                            {perms.map((permission) => {
                                                const isSelected = selectedPermissions.includes(permission.id);
                                                const wasOriginallySelected = rolePermissions.some((rp) => rp.id === permission.id);
                                                const isCritical = CRITICAL_PERMISSIONS.has(permission.name);
                                                return (
                                                    <Paper
                                                        key={permission.id}
                                                        variant="outlined"
                                                        onClick={() => handleTogglePermission(permission.id)}
                                                        sx={{
                                                            p: 1.25,
                                                            borderRadius: 2,
                                                            cursor: isViewMode ? "default" : "pointer",
                                                            bgcolor: isSelected
                                                                ? (wasOriginallySelected ? "rgba(16,185,129,0.08)" : "action.selected")
                                                                : "transparent",
                                                            borderColor: isSelected
                                                                ? (wasOriginallySelected ? "success.light" : "primary.light")
                                                                : "divider",
                                                            transition: "border-color .15s, background-color .15s",
                                                            "&:hover": !isViewMode ? { borderColor: "primary.main" } : {},
                                                        }}
                                                    >
                                                        <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
                                                            <FormControlLabel
                                                                sx={{ m: 0, alignItems: "flex-start", flex: 1 }}
                                                                control={
                                                                    <Checkbox
                                                                        size="small"
                                                                        checked={isSelected}
                                                                        disabled={isViewMode}
                                                                        onChange={() => handleTogglePermission(permission.id)}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    />
                                                                }
                                                                label={
                                                                    <Box sx={{ pt: 0.35 }}>
                                                                        <Stack direction="row" spacing={0.75} alignItems="center">
                                                                            <Typography variant="body2" fontWeight={600}>
                                                                                {localizePermission(permission)}
                                                                            </Typography>
                                                                            {isCritical && (
                                                                                <Chip size="small" label={t("role_permissions.critical")} color="warning" variant="outlined" />
                                                                            )}
                                                                        </Stack>
                                                                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "ui-monospace, monospace" }}>
                                                                            {DOMPurify.sanitize(permission.name || "")}
                                                                        </Typography>
                                                                    </Box>
                                                                }
                                                            />
                                                            {isSelected && (
                                                                <Chip
                                                                    size="small"
                                                                    label={wasOriginallySelected
                                                                        ? t("role_permissions.badge_active")
                                                                        : t("role_permissions.badge_added")}
                                                                    color={wasOriginallySelected ? "success" : "primary"}
                                                                    sx={{ mt: 0.5 }}
                                                                />
                                                            )}
                                                            {!isSelected && wasOriginallySelected && !isViewMode && (
                                                                <Chip
                                                                    size="small"
                                                                    label={t("role_permissions.badge_removed")}
                                                                    color="error"
                                                                    variant="outlined"
                                                                    sx={{ mt: 0.5 }}
                                                                />
                                                            )}
                                                        </Stack>
                                                    </Paper>
                                                );
                                            })}
                                        </Box>
                                    </AccordionDetails>
                                </Accordion>
                            );
                        })}
                    </Stack>
                )}
            </Box>

            {!isViewMode && (
                <Paper
                    elevation={8}
                    sx={{
                        position: "fixed",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 20,
                        borderTop: "1px solid",
                        borderColor: "divider",
                        bgcolor: "background.paper",
                        px: 2,
                        py: 1.5,
                    }}
                >
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.5}
                        alignItems={{ sm: "center" }}
                        justifyContent="space-between"
                        sx={{ maxWidth: 1100, mx: "auto" }}
                    >
                        <Typography variant="body2" color="text.secondary">
                            {hasChanges
                                ? t("role_permissions.unsaved_hint")
                                : t("role_permissions.no_changes_hint")}
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Button variant="outlined" onClick={goBack} disabled={saving}>
                                {t("role_permissions.back_button")}
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={handleDiscard}
                                disabled={saving || !hasChanges}
                                startIcon={<UndoIcon />}
                            >
                                {t("role_permissions.discard")}
                            </Button>
                            <Can permission={ROLE_EDIT_PERMS} any>
                                <Tooltip title={!hasChanges ? t("role_permissions.no_changes_hint") : ""}>
                                    <span>
                                        <Button
                                            variant="contained"
                                            onClick={handleSave}
                                            disabled={saving || !hasChanges}
                                            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                                        >
                                            {saving ? t("role_permissions.saving") : t("role_permissions.save_button")}
                                        </Button>
                                    </span>
                                </Tooltip>
                            </Can>
                        </Stack>
                    </Stack>
                </Paper>
            )}
        </Box>
    );
}
