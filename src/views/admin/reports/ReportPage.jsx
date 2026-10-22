import { Navigate, useParams } from 'react-router-dom';
import { getAgencyReport } from './reportCatalog.js';
import ReportRunner from './ReportRunner.jsx';
import PnlCash from './PnlCash.jsx';
import Commissions from './Commissions.jsx';
import BranchWallets from './BranchWallets.jsx';
import CurrencyPosition from './CurrencyPosition.jsx';
import FinanceAudit from './FinanceAudit.jsx';
import InventoryAging from './InventoryAging.jsx';
import AgentPerformance from './AgentPerformance.jsx';
import CrmFunnel from './CrmFunnel.jsx';

export default function ReportPage() {
    const { slug } = useParams();
    if (slug === 'pnl-cash') return <PnlCash />;
    if (slug === 'commissions') return <Commissions />;
    if (slug === 'branch-wallets') return <BranchWallets />;
    if (slug === 'currency-position') return <CurrencyPosition />;
    if (slug === 'finance-audit') return <FinanceAudit />;
    if (slug === 'inventory-aging') return <InventoryAging />;
    if (slug === 'agent-performance') return <AgentPerformance />;
    if (slug === 'crm-funnel') return <CrmFunnel />;
    const config = getAgencyReport(slug);
    if (!config) return <Navigate to="/admin/reports" replace />;
    return <ReportRunner config={config} />;
}
