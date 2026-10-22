import { createBrowserRouter, Navigate } from "react-router-dom";
import PermissionProtectedRoute from "@/components/auth/PermissionProtectedRoute";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PlatformProtectedRoute from "@/components/auth/PlatformProtectedRoute";
import PlatformLayout from "@/layouts/platform/PlatformLayout";
import PlatformLogin from "@/views/platform/Login";
import PlatformDashboard from "@/views/platform/Dashboard";
import PlatformAgenciesIndex from "@/views/platform/agencies/Index";
import PlatformAgencyCreate from "@/views/platform/agencies/Create";
import PlatformAgencyShow from "@/views/platform/agencies/Show";
import PlatformPlansIndex from "@/views/platform/plans/Index";
import PlatformAdminsIndex from "@/views/platform/admins/Index";
import PlatformAuditIndex from "@/views/platform/audit/Index";

const withPermission = (Component, permission) => {
    return () => (
        <PermissionProtectedRoute permission={permission}>
            <Component />
        </PermissionProtectedRoute>
    );
};

const withAnyPermission = (Component, permissions) => {
    return () => (
        <PermissionProtectedRoute permissions={permissions}>
            <Component />
        </PermissionProtectedRoute>
    );
};

import Login from "../views/auth/Login";
import Dashboard from "../views/admin/Dashboard";
import AgencyShow from "../views/admin/agency/Show";
import AgencyEdit from "../views/admin/agency/Edit";
import Subscription from "../views/admin/subscription/Subscription";
import PropertyIndex from "../views/admin/properties/Index";
import PropertyCreate from "../views/admin/properties/Create";
import PropertyShow from "../views/admin/properties/Show";
import PropertyReport from "../views/admin/properties/Report";
import LocationIndex from "../views/admin/locations/Index";
import LocationCreate from "../views/admin/locations/Create";
import LocationEdit from "../views/admin/locations/Edit";
import LocationShow from "../views/admin/locations/Show";
import LocationReport from "../views/admin/locations/Report";
import BranchIndex from "../views/admin/branches/Index";
import BranchCreate from "../views/admin/branches/Create";
import BranchEdit from "../views/admin/branches/Edit";
import BranchShow from "../views/admin/branches/Show";
import PartyIndex from "../views/admin/parties/Index";
import PartyCreate from "../views/admin/parties/Create";
import PartyEdit from "../views/admin/parties/Edit";
import PartyShow from "../views/admin/parties/Show";
import PartyReport from "../views/admin/parties/Report";
import ContractIndex from "../views/admin/contracts/Index";
import ContractCreate from "../views/admin/contracts/Create";
import ContractEdit from "../views/admin/contracts/Edit";
import ContractShow from "../views/admin/contracts/Show";
import ContractReport from "../views/admin/contracts/Report";
import ContractTemplates from "../views/admin/contracts/Templates";
import TemplateBuilderPage from "../views/admin/contracts/templateBuilder/TemplateBuilderPage";
import TransactionIndex from "../views/admin/transactions/Index";
import TransactionCreate from "../views/admin/transactions/Create";
import TransactionReport from "../views/admin/transactions/Report";
import TransactionShow from "../views/admin/transactions/Show";
import TransactionPrint from "../views/admin/transactions/Print";
import Finance from "../views/admin/finance/Finance";
import FinanceReport from "../views/admin/finance/Report";
import ReportsHub from "../views/admin/reports/Hub";
import ReportPage from "../views/admin/reports/ReportPage";
import Audit from "../views/admin/operations/Audit";
import PlatformReports from "../views/platform/reports/Index";

const ProtectedAgencyShow = withPermission(AgencyShow, "agency:view");
const ProtectedAgencyEdit = withPermission(AgencyEdit, "agency:update");
const ProtectedSubscription = withPermission(Subscription, "subscription:view");
const ProtectedProperties = withPermission(PropertyIndex, "property:view");
const ProtectedPropertyCreate = withPermission(PropertyCreate, "property:create");
const ProtectedPropertyEdit = withPermission(PropertyCreate, "property:update");
const ProtectedPropertyShow = withPermission(PropertyShow, "property:view");
const ProtectedPropertyReport = withPermission(PropertyReport, "property:view");
const ProtectedLocations = withPermission(LocationIndex, "location:view");
const ProtectedLocationCreate = withPermission(LocationCreate, "location:create");
const ProtectedLocationEdit = withPermission(LocationEdit, "location:update");
const ProtectedLocationShow = withPermission(LocationShow, "location:view");
const ProtectedLocationReport = withPermission(LocationReport, "location:view");
const ProtectedBranches = withPermission(BranchIndex, "branch:view");
const ProtectedBranchCreate = withPermission(BranchCreate, "branch:create");
const ProtectedBranchEdit = withPermission(BranchEdit, "branch:update");
const ProtectedBranchShow = withPermission(BranchShow, "branch:view");
const ProtectedParties = withPermission(PartyIndex, "party:view");
const ProtectedPartyCreate = withPermission(PartyCreate, "party:create");
const ProtectedPartyEdit = withPermission(PartyEdit, "party:create");
const ProtectedPartyShow = withPermission(PartyShow, "party:view");
const ProtectedPartyReport = withPermission(PartyReport, "party:view");
const ProtectedContracts = withAnyPermission(ContractIndex, ["document:generate", "document:download"]);
const ProtectedContractCreate = withPermission(ContractCreate, "document:generate");
const ProtectedContractEdit = withPermission(ContractEdit, "document:generate");
const ProtectedContractShow = withAnyPermission(ContractShow, ["document:generate", "document:download"]);
const ProtectedContractReport = withAnyPermission(ContractReport, ["document:generate", "document:download"]);
const ProtectedContractTemplates = withPermission(ContractTemplates, "document:generate");
const ProtectedTemplateBuilder = withPermission(TemplateBuilderPage, "document:generate");
const ProtectedTransactions = withAnyPermission(TransactionIndex, ["transaction:create", "financial:view"]);
const ProtectedTransactionCreate = withPermission(TransactionCreate, "transaction:create");
const ProtectedTransactionReport = withAnyPermission(TransactionReport, ["transaction:create", "financial:view"]);
const ProtectedTransactionShow = withAnyPermission(TransactionShow, ["transaction:create", "financial:view"]);
const ProtectedTransactionPrint = withAnyPermission(TransactionPrint, ["transaction:create", "financial:view"]);
const ProtectedFinance = withPermission(Finance, "financial:view");
const ProtectedFinanceReport = withPermission(FinanceReport, "financial:view");
const ProtectedReportsHub = withAnyPermission(ReportsHub, [
    "financial:view",
    "property:view",
    "party:view",
    "transaction:create",
]);
const ProtectedReportPage = withAnyPermission(ReportPage, [
    "financial:view",
    "property:view",
    "party:view",
    "transaction:create",
]);
const ProtectedAudit = withPermission(Audit, "audit:view");
import MainLayout from "@/layouts/admin/MainLayout";

import RoleIndex from "@/views/admin/roles/Index";
import RolePermissions from "@/views/admin/roles/RolePermissions";

import Userindex from "@/views/admin/users/Index";
import UserCreate from "@/views/admin/users/Create";
import UserEdit from "@/views/admin/users/Edit";
import UserShow from "@/views/admin/users/Show";

import CurrenciesIndex from "@/views/admin/currencies/Index";
import CurrenciesCreate from "@/views/admin/currencies/Create";
import CurrenciesEdit from "@/views/admin/currencies/Edit";

import CurrencyExchangeRateIndex from "@/views/admin/currency-exchange-rates/Index";
import CurrencyExchangeRateCreate from "@/views/admin/currency-exchange-rates/Create";
import CurrencyExchangeRateEdit from "@/views/admin/currency-exchange-rates/Edit";

import ExpenseCategoryIndex from "@/views/admin/expense-categories/Index";

import ExpenseIndex from "@/views/admin/expenses/Index";
import ExpenseCreate from "@/views/admin/expenses/Create";
import ExpenseEdit from "@/views/admin/expenses/Edit";
import ExpenseShow from "@/views/admin/expenses/Show";
import ExpenseReport from "@/views/admin/expenses/Report";
import PeriodIndex from "@/views/admin/periods/Index";

const ProtectedRoleIndex = withAnyPermission(RoleIndex, ["roles.view", "role:manage"]);
const ProtectedRolePermissions = withAnyPermission(RolePermissions, [
    "role:manage",
    "role_permissions.view",
    "role_permissions.edit",
    "role_permissions.create",
]);

const ProtectedUserindex = withAnyPermission(Userindex, ["users.view", "staff:view"]);
const ProtectedUserCreate = withAnyPermission(UserCreate, ["users.create", "staff:manage"]);
const ProtectedUserEdit = withAnyPermission(UserEdit, ["users.edit", "staff:manage"]);
const ProtectedUserShow = withAnyPermission(UserShow, ["users.view", "staff:view"]);

const ProtectedCurrenciesIndex = withPermission(CurrenciesIndex, "currencies.view");
const ProtectedCurrenciesCreate = withPermission(CurrenciesCreate, "currencies.create");
const ProtectedCurrenciesEdit = withPermission(CurrenciesEdit, "currencies.edit");

const ProtectedCurrencyExchangeRateIndex = withPermission(CurrencyExchangeRateIndex, "currency_rates.view");
const ProtectedCurrencyExchangeRateCreate = withPermission(CurrencyExchangeRateCreate, "currency_rates.create");
const ProtectedCurrencyExchangeRateEdit = withPermission(CurrencyExchangeRateEdit, "currency_rates.edit");

const ProtectedExpenseCategoryIndex = withPermission(ExpenseCategoryIndex, "expense_categories.view");

const ProtectedExpenseIndex = withPermission(ExpenseIndex, "expenses.view");
const ProtectedExpenseCreate = withPermission(ExpenseCreate, "expenses.create");
const ProtectedExpenseEdit = withPermission(ExpenseEdit, "expenses.edit");
const ProtectedExpenseShow = withPermission(ExpenseShow, "expenses.view");
const ProtectedExpenseReport = withPermission(ExpenseReport, "expenses.view");
const ProtectedPeriods = withPermission(PeriodIndex, "expenses.view");

const RootRedirect = () => <Navigate to="/auth/login" replace />;

export default function AppRoutes() {
    return createBrowserRouter([
        {
            path: "/",
            Component: RootRedirect,
        },
        {
            path: "/auth",
            children: [
                { path: "login", Component: Login },
            ],
        },
        {
            path: "/platform/login",
            Component: PlatformLogin,
        },
        {
            path: "/platform",
            Component: PlatformProtectedRoute,
            children: [
                {
                    Component: PlatformLayout,
                    children: [
                        { index: true, element: <Navigate to="dashboard" replace /> },
                        { path: "dashboard", Component: PlatformDashboard },
                        { path: "agencies", Component: PlatformAgenciesIndex },
                        { path: "agencies/create", Component: PlatformAgencyCreate },
                        { path: "agencies/:id", Component: PlatformAgencyShow },
                        { path: "plans", Component: PlatformPlansIndex },
                        { path: "admins", Component: PlatformAdminsIndex },
                        { path: "audit", Component: PlatformAuditIndex },
                        { path: "reports", Component: PlatformReports },
                    ],
                },
            ],
        },
        {
            path: "/admin",
            Component: ProtectedRoute,
            children: [
                {
                    Component: MainLayout,
                    children: [
                        { path: "dashboard", Component: Dashboard },
                        {
                            path: "agency",
                            children: [
                                { index: true, element: <Navigate to="show" replace /> },
                                { path: "show", Component: ProtectedAgencyShow },
                                { path: "edit", Component: ProtectedAgencyEdit },
                            ],
                        },
                        { path: "subscription", Component: ProtectedSubscription },
                        { path: "periods", Component: ProtectedPeriods },
                        {
                            path: "branches",
                            children: [
                                { index: true, element: <Navigate to="index" replace /> },
                                { path: "index", Component: ProtectedBranches },
                                { path: "create", Component: ProtectedBranchCreate },
                                { path: ":id/edit", Component: ProtectedBranchEdit },
                                { path: ":id/show", Component: ProtectedBranchShow },
                            ],
                        },
                        {
                            path: "properties",
                            children: [
                                { index: true, element: <Navigate to="index" replace /> },
                                { path: "index", Component: ProtectedProperties },
                                { path: "report", Component: ProtectedPropertyReport },
                                { path: "create", Component: ProtectedPropertyCreate },
                                { path: ":id/edit", Component: ProtectedPropertyEdit },
                                { path: ":id/show", Component: ProtectedPropertyShow },
                                { path: ":id", element: <Navigate to="show" replace /> },
                            ],
                        },
                        {
                            path: "locations",
                            children: [
                                { index: true, element: <Navigate to="index" replace /> },
                                { path: "index", Component: ProtectedLocations },
                                { path: "report", Component: ProtectedLocationReport },
                                { path: "create", Component: ProtectedLocationCreate },
                                { path: ":id/show", Component: ProtectedLocationShow },
                                { path: ":id/edit", Component: ProtectedLocationEdit },
                            ],
                        },
                        {
                            path: "parties",
                            children: [
                                { index: true, element: <Navigate to="index" replace /> },
                                { path: "index", Component: ProtectedParties },
                                { path: "report", Component: ProtectedPartyReport },
                                { path: "create", Component: ProtectedPartyCreate },
                                { path: ":id/edit", Component: ProtectedPartyEdit },
                                { path: ":id/show", Component: ProtectedPartyShow },
                                { path: ":id", element: <Navigate to="show" replace /> },
                            ],
                        },
                        {
                            path: "contracts",
                            children: [
                                { index: true, element: <Navigate to="index" replace /> },
                                { path: "index", Component: ProtectedContracts },
                                { path: "create", Component: ProtectedContractCreate },
                                { path: "report", Component: ProtectedContractReport },
                                { path: "templates", Component: ProtectedContractTemplates },
                                { path: "templates/new", Component: ProtectedTemplateBuilder },
                                { path: "templates/:templateId/edit", Component: ProtectedTemplateBuilder },
                                { path: ":id/edit", Component: ProtectedContractEdit },
                                { path: ":id/show", Component: ProtectedContractShow },
                                { path: ":id", element: <Navigate to="show" replace /> },
                            ],
                        },
                        {
                            path: "transactions",
                            children: [
                                { index: true, element: <Navigate to="index" replace /> },
                                { path: "index", Component: ProtectedTransactions },
                                { path: "create", Component: ProtectedTransactionCreate },
                                { path: "report", Component: ProtectedTransactionReport },
                                { path: ":id/print", Component: ProtectedTransactionPrint },
                                { path: ":id/show", Component: ProtectedTransactionShow },
                                { path: ":id", element: <Navigate to="show" replace /> },
                            ],
                        },
                        {
                            path: "finance",
                            children: [
                                { index: true, Component: ProtectedFinance },
                                { path: "report", Component: ProtectedFinanceReport },
                            ],
                        },
                        {
                            path: "reports",
                            children: [
                                { index: true, Component: ProtectedReportsHub },
                                { path: ":slug", Component: ProtectedReportPage },
                            ],
                        },
                        { path: "audit", Component: ProtectedAudit },
                        {
                            path: "roles",
                            children: [
                                { path: "index", Component: ProtectedRoleIndex },
                                { path: ":roleId/permissions", Component: ProtectedRolePermissions },
                            ],
                        },
                        {
                            path: "users",
                            children: [
                                { path: "index", Component: ProtectedUserindex },
                                { path: "create", Component: ProtectedUserCreate },
                                { path: ":id/edit", Component: ProtectedUserEdit },
                                { path: ":id/show", Component: ProtectedUserShow },
                            ],
                        },
                        {
                            path: "currencies",
                            children: [
                                { path: "index", Component: ProtectedCurrenciesIndex },
                                { path: "create", Component: ProtectedCurrenciesCreate },
                                { path: ":id/edit", Component: ProtectedCurrenciesEdit },
                            ],
                        },
                        {
                            path: "currency-exchange-rates",
                            children: [
                                { path: "index", Component: ProtectedCurrencyExchangeRateIndex },
                                { path: "create", Component: ProtectedCurrencyExchangeRateCreate },
                                { path: ":id/edit", Component: ProtectedCurrencyExchangeRateEdit },
                            ],
                        },
                        {
                            path: "expense-categories",
                            children: [
                                { path: "index", Component: ProtectedExpenseCategoryIndex },
                            ],
                        },
                        {
                            path: "expenses",
                            children: [
                                { path: "index", Component: ProtectedExpenseIndex },
                                { path: "create", Component: ProtectedExpenseCreate },
                                { path: "report", Component: ProtectedExpenseReport },
                                { path: ":id/edit", Component: ProtectedExpenseEdit },
                                { path: ":id/show", Component: ProtectedExpenseShow },
                            ],
                        },
                    ],
                },
            ],
        },
        {
            path: "*",
            element: <Navigate to="/admin/dashboard" replace />,
        },
    ]);
}
