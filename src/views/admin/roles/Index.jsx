import { useEffect, useState, useCallback, useMemo, useTransition } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Swal from "sweetalert2";
import fetch from "@/utils/fetch";
import useIsRTL from "@/hooks/useIsRTL";
import Can from "@/components/auth/Can.jsx";
import { ActionButton, ActionIconButton } from "@/components/common";
import PageHeader from "@/components/workspace/PageHeader.jsx";
import ListToolbar from "@/components/workspace/ListToolbar.jsx";
import DataTable from "@/components/workspace/DataTable.jsx";
import ClearButton from "@/components/common/ClearButton.jsx";
import DOMPurify from "dompurify";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Paper,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";

const ROLE_MANAGE = ["role:manage", "roles.create"];
const ROLE_EDIT = ["roles.edit", "role:manage"];
const ROLE_DELETE = ["roles.delete", "role:manage"];
const ROLE_PERMS = ["role_permissions.view", "role_permissions.create", "role_permissions.edit", "role:manage"];

const SYSTEM_NAMES = new Set(["agency owner", "manager", "agent", "accountant", "admin"]);

function isSystemRole(roleOrName) {
    if (roleOrName && typeof roleOrName === "object") {
        if (roleOrName.is_system) return true;
        roleOrName = roleOrName.name;
    }
    return SYSTEM_NAMES.has(String(roleOrName || "").toLowerCase());
}

function SummaryCard({ label, value }) {
    return (
        <Paper variant="outlined" sx={{ px: 2, py: 1.5, flex: 1, minWidth: 120 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="h6" fontWeight={700}>{value}</Typography>
        </Paper>
    );
}

export default function RoleIndex() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const isRTL = useIsRTL();

    const [isPending, startTransition] = useTransition();
    const [roles, setRoles] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [limit] = useState(25);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState("");
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("");

    const [formData, setFormData] = useState({ name: "" });
    const [errors, setErrors] = useState({});
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    const [editRole, setEditRole] = useState(null);
    const [editFormData, setEditFormData] = useState({ name: "" });
    const [editErrors, setEditErrors] = useState({});

    const fetchRoles = useCallback(async (currentPage = 1, searchTerm = "") => {
        setIsLoading(true);
        setFetchError("");
        try {
            const params = new URLSearchParams({
                page: String(currentPage),
                limit: String(limit),
                search: searchTerm,
            });
            const res = await fetch.get(`admin/roles?${params}`);
            if (res.data.success) {
                setRoles(res.data.data || []);
                setTotalPages(res.data.totalPages || 1);
                setTotal(res.data.total || 0);
            }
        } catch {
            setFetchError(t("roles.error_fetching"));
            setRoles([]);
            setTotal(0);
            setTotalPages(1);
        } finally {
            setIsLoading(false);
        }
    }, [limit, t]);

    useEffect(() => {
        let active = true;
        const params = new URLSearchParams({
            page: String(page),
            limit: String(limit),
            search,
        });

        fetch.get(`admin/roles?${params}`)
            .then((res) => {
                if (!active) return;
                if (res.data.success) {
                    setRoles(res.data.data || []);
                    setTotalPages(res.data.totalPages || 1);
                    setTotal(res.data.total || 0);
                    setFetchError("");
                }
            })
            .catch(() => {
                if (!active) return;
                setFetchError(t("roles.error_fetching"));
                setRoles([]);
                setTotal(0);
                setTotalPages(1);
            })
            .finally(() => {
                if (active) setIsLoading(false);
            });

        return () => {
            active = false;
        };
    }, [page, search, limit, t]);

    const handleSearch = useCallback((value) => {
        setIsLoading(true);
        setSearch(value);
        setPage(1);
    }, []);

    const handlePageChange = useCallback((nextPage) => {
        setIsLoading(true);
        setPage(nextPage);
    }, []);

    const visibleRoles = useMemo(() => {
        if (!typeFilter) return roles;
        return roles.filter((role) => {
            const system = isSystemRole(role);
            return typeFilter === "system" ? system : !system;
        });
    }, [roles, typeFilter]);

    const summary = useMemo(() => {
        const system = roles.filter((role) => isSystemRole(role)).length;
        const custom = Math.max(0, roles.length - system);
        const staff = roles.reduce((sum, role) => sum + (Number(role.user_count) || 0), 0);
        return { total: roles.length, system, custom, staff };
    }, [roles]);

    const openCreate = () => {
        setFormData({ name: "" });
        setErrors({});
        setIsCreateDialogOpen(true);
    };

    const handleSubmit = async () => {
        setErrors({});
        if (!formData.name.trim()) {
            setErrors({ name: t("roles.name_required") });
            return;
        }
        startTransition(async () => {
            try {
                const response = await fetch.post("admin/roles", { name: formData.name.trim() });
                if (response.data.success) {
                    setFormData({ name: "" });
                    setIsCreateDialogOpen(false);
                    Swal.fire({
                        icon: "success",
                        title: t("common.success"),
                        text: response.data.message || t("roles.create_success"),
                        timer: 1500,
                        showConfirmButton: false,
                    });
                    fetchRoles(1, search);
                    setPage(1);
                }
            } catch (err) {
                const response = err.response;
                if (response?.status === 400 || response?.status === 403 || response?.status === 422) {
                    if (response.data.errors) setErrors(response.data.errors);
                    else if (response.data.message) setErrors({ general: response.data.message });
                } else {
                    Swal.fire({
                        icon: "error",
                        title: t("common.error"),
                        text: t("roles.error_creating"),
                        timer: 1500,
                        showConfirmButton: false,
                    });
                }
            }
        });
    };

    const handleEditSubmit = async () => {
        setEditErrors({});
        if (!editRole || isSystemRole(editRole)) return;
        if (!editFormData.name.trim()) {
            setEditErrors({ name: t("roles.name_required") });
            return;
        }
        startTransition(async () => {
            try {
                const response = await fetch.put(`admin/roles/${editRole.id}`, { name: editFormData.name.trim() });
                if (response.data.success) {
                    setEditRole(null);
                    Swal.fire({
                        icon: "success",
                        title: t("common.success"),
                        text: response.data.message || t("roles.update_success"),
                        timer: 1500,
                        showConfirmButton: false,
                    });
                    fetchRoles(page, search);
                }
            } catch (err) {
                const response = err.response;
                if (response?.status === 400 || response?.status === 403 || response?.status === 422) {
                    if (response.data.errors) setEditErrors(response.data.errors);
                    else if (response.data.message) setEditErrors({ general: response.data.message });
                } else {
                    Swal.fire({
                        icon: "error",
                        title: t("common.error"),
                        text: t("roles.error_updating"),
                        timer: 1500,
                        showConfirmButton: false,
                    });
                }
            }
        });
    };

    const handleDelete = async (role) => {
        if (isSystemRole(role)) {
            Swal.fire({
                icon: "error",
                title: t("common.forbidden"),
                text: t("roles.cannot_delete_system"),
                timer: 2000,
                showConfirmButton: false,
            });
            return;
        }

        const userCount = Number(role.user_count) || 0;
        if (userCount > 0) {
            Swal.fire({
                icon: "error",
                title: t("common.forbidden"),
                html: t("roles.delete_confirm_with_users", {
                    name: DOMPurify.sanitize(role.name || ""),
                    count: userCount,
                }),
                timer: 2500,
                showConfirmButton: false,
            });
            return;
        }

        const result = await Swal.fire({
            title: t("roles.delete_confirm_title"),
            html: t("roles.delete_confirm_named", { name: DOMPurify.sanitize(role.name || "") }),
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#dc3545",
            cancelButtonColor: "#6b7280",
            confirmButtonText: t("roles.delete_confirm_yes"),
            cancelButtonText: t("roles.delete_confirm_cancel"),
        });
        if (!result.isConfirmed) return;

        startTransition(async () => {
            try {
                const response = await fetch.delete(`admin/roles/${role.id}`);
                if (response.data.success) {
                    Swal.fire({
                        icon: "success",
                        title: t("roles.delete_success_title"),
                        text: response.data.message || t("roles.delete_success"),
                        timer: 1500,
                        showConfirmButton: false,
                    });
                    const nextPage = roles.length === 1 && page > 1 ? page - 1 : page;
                    setPage(nextPage);
                    fetchRoles(nextPage, search);
                }
            } catch (err) {
                Swal.fire({
                    icon: "error",
                    title: t("common.error"),
                    text: err.response?.data?.message || t("roles.error_deleting"),
                    timer: 2000,
                    showConfirmButton: false,
                });
            }
        });
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }} dir={isRTL ? "rtl" : "ltr"}>
            <title>{t("roles.title")}</title>

            <PageHeader
                title={t("roles.title")}
                description={t("roles.subtitle")}
                action={(
                    <Can permission={ROLE_MANAGE} any>
                        <ActionButton action="add" label={t("roles.add_new")} onClick={openCreate} />
                    </Can>
                )}
            />

            {fetchError && (
                <Alert
                    severity="error"
                    sx={{ mb: 2 }}
                    action={(
                        <Button color="inherit" size="small" onClick={() => fetchRoles(page, search)}>
                            {t("common.refresh")}
                        </Button>
                    )}
                >
                    {fetchError}
                </Alert>
            )}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
                <SummaryCard label={t("roles.summary_total")} value={summary.total} />
                <SummaryCard label={t("roles.summary_system")} value={summary.system} />
                <SummaryCard label={t("roles.summary_custom")} value={summary.custom} />
                <SummaryCard label={t("roles.summary_staff")} value={summary.staff} />
            </Stack>

            <ListToolbar
                search={search}
                onSearch={handleSearch}
                filters={[
                    {
                        key: "type",
                        label: t("roles.filter_type"),
                        value: typeFilter,
                        onChange: (value) => {
                            setTypeFilter(value);
                            setPage(1);
                        },
                        options: [
                            { value: "system", label: t("roles.filter_system") },
                            { value: "custom", label: t("roles.filter_custom") },
                        ],
                    },
                ]}
            />

            <DataTable
                loading={isLoading}
                rows={visibleRoles}
                page={page}
                limit={limit}
                total={total}
                onPageChange={handlePageChange}
                empty={search || typeFilter ? t("roles.no_data") : t("roles.empty_hint")}
                columns={[
                    {
                        key: "name",
                        header: t("roles.table.name"),
                        render: (role) => (
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography fontWeight={600}>
                                    {DOMPurify.sanitize(role.name || "")}
                                </Typography>
                                {isSystemRole(role) && (
                                    <Chip
                                        size="small"
                                        icon={<LockOutlinedIcon sx={{ fontSize: "14px !important" }} />}
                                        label={t("roles.system_role")}
                                        color="primary"
                                        variant="outlined"
                                    />
                                )}
                            </Stack>
                        ),
                    },
                    {
                        key: "permission_count",
                        header: t("roles.table.permissions"),
                        align: "center",
                        render: (role) => Number(role.permission_count) || 0,
                    },
                    {
                        key: "user_count",
                        header: t("roles.table.users"),
                        align: "center",
                        render: (role) => Number(role.user_count) || 0,
                    },
                    {
                        key: "actions",
                        header: t("workspace_ui.actions"),
                        align: "right",
                        pin: "end",
                        render: (role) => {
                            const system = isSystemRole(role);
                            return (
                                <Stack direction="row" spacing={0.25} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
                                    <Can permission={ROLE_PERMS} any>
                                        <Tooltip title={t("roles.permissions_tooltip")}>
                                            <IconButton
                                                size="small"
                                                color="primary"
                                                disabled={isPending}
                                                onClick={() => navigate(`/admin/roles/${role.id}/permissions`)}
                                            >
                                                <ShieldOutlinedIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Can>
                                    <Can permission={ROLE_EDIT} any>
                                        <Tooltip title={system ? t("roles.cannot_rename_system") : t("roles.edit_tooltip")}>
                                            <span>
                                                <ActionIconButton
                                                    action="edit"
                                                    disabled={isPending || system}
                                                    onClick={() => {
                                                        if (system) return;
                                                        setEditRole(role);
                                                        setEditFormData({ name: role.name });
                                                        setEditErrors({});
                                                    }}
                                                />
                                            </span>
                                        </Tooltip>
                                    </Can>
                                    <Can permission={ROLE_DELETE} any>
                                        <Tooltip title={system ? t("roles.cannot_delete_system") : t("roles.delete_tooltip")}>
                                            <span>
                                                <ActionIconButton
                                                    action="delete"
                                                    disabled={isPending || system}
                                                    onClick={() => handleDelete(role)}
                                                />
                                            </span>
                                        </Tooltip>
                                    </Can>
                                </Stack>
                            );
                        },
                    },
                ]}
            />

            {!isLoading && !fetchError && roles.length === 0 && !search && (
                <Box sx={{ textAlign: "center", mt: 2 }}>
                    <Can permission={ROLE_MANAGE} any>
                        <Button variant="outlined" onClick={openCreate}>
                            {t("roles.add_new")}
                        </Button>
                    </Can>
                </Box>
            )}

            {/* Keep page indicator when client-side type filter hides rows */}
            {typeFilter && totalPages > 1 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                    {t("roles.filter_note")}
                </Typography>
            )}

            <Dialog
                open={isCreateDialogOpen}
                onClose={() => !isPending && setIsCreateDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                slotProps={{ paper: { dir: isRTL ? "rtl" : "ltr" } }}
            >
                <DialogTitle sx={{ fontWeight: 700, pr: 6 }}>
                    {t("roles.create_title")}
                    <IconButton
                        onClick={() => setIsCreateDialogOpen(false)}
                        disabled={isPending}
                        sx={{ position: "absolute", [isRTL ? "left" : "right"]: 12, top: 10 }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {t("roles.create_hint")}
                    </Typography>
                    <TextField
                        fullWidth
                        autoFocus
                        label={t("roles.name")}
                        required
                        value={formData.name}
                        onChange={(e) => {
                            setFormData({ name: e.target.value.trimStart() });
                            if (errors.name || errors.general) setErrors({});
                        }}
                        error={!!errors.name}
                        helperText={errors.name || t("roles.name_hint")}
                        disabled={isPending}
                        size="small"
                        onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                    />
                    {errors.general && <Alert severity="error" sx={{ mt: 2 }}>{errors.general}</Alert>}
                </DialogContent>
                <DialogActions sx={{ justifyContent: "flex-start", gap: 1, px: 3, pb: 3 }}>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={isPending}
                        startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                    >
                        {isPending ? t("common.processing") : t("common.save")}
                    </Button>
                    <ClearButton
                        onClick={() => { setFormData({ name: "" }); setErrors({}); }}
                        disabled={isPending}
                        label={t("common.clear")}
                    />
                </DialogActions>
            </Dialog>

            <Dialog
                open={!!editRole}
                onClose={() => !isPending && setEditRole(null)}
                maxWidth="sm"
                fullWidth
                slotProps={{ paper: { dir: isRTL ? "rtl" : "ltr" } }}
            >
                <DialogTitle sx={{ fontWeight: 700, pr: 6 }}>
                    {t("roles.edit_title")}
                    <IconButton
                        onClick={() => setEditRole(null)}
                        disabled={isPending}
                        sx={{ position: "absolute", [isRTL ? "left" : "right"]: 12, top: 10 }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        autoFocus
                        label={t("roles.name")}
                        required
                        value={editFormData.name}
                        onChange={(e) => {
                            setEditFormData({ name: e.target.value.trimStart() });
                            if (editErrors.name || editErrors.general) setEditErrors({});
                        }}
                        error={!!editErrors.name}
                        helperText={editErrors.name}
                        disabled={isPending || isSystemRole(editRole)}
                        size="small"
                        sx={{ mt: 1 }}
                        onKeyDown={(e) => { if (e.key === "Enter") handleEditSubmit(); }}
                    />
                    {editErrors.general && <Alert severity="error" sx={{ mt: 2 }}>{editErrors.general}</Alert>}
                </DialogContent>
                <DialogActions sx={{ justifyContent: "flex-start", gap: 1, px: 3, pb: 3 }}>
                    <Button
                        variant="contained"
                        onClick={handleEditSubmit}
                        disabled={isPending || isSystemRole(editRole)}
                        startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                    >
                        {isPending ? t("common.processing") : t("common.save")}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
