import Swal from 'sweetalert2';
import fetch from '@/utils/fetch';
import { loadPdfCompany } from '@/utils/pdfCompany';
import { renderPdfToBlob } from '@/utils/pdfSetup';
import FinanceVoucherPDF from './FinanceVoucherPDF';

export function buildFinanceVoucherLabels(t) {
    return {
        voucher_title: t('finance.voucher_title'),
        generated_at: t('finance.generated_at'),
        address_label: t('agency.address', { defaultValue: 'Address:' }),
        details: t('finance.voucher_details'),
        invoice_id: t('finance.invoice_id'),
        date: t('finance.date'),
        type: t('finance.type'),
        direction: t('finance.direction'),
        status: t('workspace_ui.status'),
        office: t('finance.office'),
        reference: t('finance.reference'),
        currency: t('finance.currency'),
        amount: t('finance.amount'),
        base_amount: t('finance.base_amount'),
        exchange_rate: t('finance.exchange_rate'),
        deal: t('finance.deal'),
        reason: t('finance.reason'),
        prepared_by: t('finance.prepared_by'),
        approved_by: t('finance.approved_by'),
        received_by: t('finance.received_by'),
        in: t('finance.in'),
        out: t('finance.out'),
        transfer: t('finance.transfer'),
        staff_commission: t('finance.staff_commission'),
        type_payment: t('finance.types.payment'),
        type_commission: t('finance.types.commission'),
        type_expense: t('finance.types.expense'),
        type_reversal: t('finance.types.reversal'),
        type_receivable: t('finance.types.receivable'),
        status_posted: t('finance.statuses.posted'),
        status_void: t('finance.statuses.void'),
        status_reversed: t('finance.statuses.reversed'),
    };
}

/**
 * Opens a single finance entry voucher PDF in a new tab.
 * @returns {Promise<boolean>}
 */
export async function printFinanceVoucher({ entryId, t, isRTL }) {
    const newTab = window.open('', '_blank');
    if (!newTab) {
        Swal.fire({
            icon: 'warning',
            title: t('finance.popup_blocked_title'),
            text: t('finance.popup_blocked_text'),
            confirmButtonText: t('common.ok'),
        });
        return false;
    }

    newTab.document.write(`
        <html>
            <body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#f1f5f9;color:#1e3a5f;margin:0">
                <div style="text-align:center">
                    <div style="font-size:18px;font-weight:600">${t('finance.preparing_voucher')}</div>
                </div>
            </body>
        </html>
    `);
    newTab.document.close();

    try {
        const [entryRes, company] = await Promise.all([
            fetch.get(`finance/${entryId}`),
            loadPdfCompany().catch(() => null),
        ]);
        const entry = entryRes.data?.data;
        if (!entry) throw new Error('missing');

        const blob = await renderPdfToBlob(() => (
            <FinanceVoucherPDF
                entry={entry}
                company={company}
                isRTL={isRTL}
                labels={buildFinanceVoucherLabels(t)}
            />
        ));
        const url = URL.createObjectURL(blob);
        newTab.location.replace(url);
        setTimeout(() => URL.revokeObjectURL(url), 120000);
        return true;
    } catch (e) {
        console.error(e);
        try {
            newTab.close();
        } catch {
            /* ignore */
        }
        Swal.fire({
            icon: 'error',
            title: t('common.error'),
            text: e?.message
                ? `${t('finance.voucher_error')}: ${e.message}`
                : t('finance.voucher_error'),
            timer: 2500,
            showConfirmButton: false,
        });
        return false;
    }
}
