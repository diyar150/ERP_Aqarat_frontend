/**
 * Modern A4 finance cash-desk voucher — single-document print from Finance list.
 */
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import PdfReportHeader from '@/components/common/PdfReportHeader';
import PdfReportFooter from '@/components/common/PdfReportFooter';
import { sanitizePdfText } from '@/utils/sanitizePdfText';
import { ensurePdfFonts } from '@/utils/pdfSetup';

ensurePdfFonts();

const ACCENT = '#0f766e';
const INK = '#0f172a';
const MUTED = '#64748b';
const LINE = '#e2e8f0';
const SOFT = '#f8fafc';

const makeStyles = (isRTL) => {
    const ff = 'Rudaw';
    const dir = isRTL ? 'row-reverse' : 'row';
    const align = isRTL ? 'right' : 'left';

    return StyleSheet.create({
        page: {
            fontFamily: ff,
            fontSize: 9,
            paddingTop: 24,
            paddingBottom: 48,
            paddingHorizontal: 32,
            backgroundColor: '#ffffff',
            color: INK,
        },
        accentBar: {
            height: 4,
            backgroundColor: ACCENT,
            marginBottom: 14,
        },
        voucherBand: {
            flexDirection: dir,
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: SOFT,
            borderWidth: 1,
            borderColor: LINE,
            borderStyle: 'solid',
            paddingVertical: 10,
            paddingHorizontal: 12,
            marginBottom: 14,
        },
        voucherTitleWrap: {
            flex: 1,
            alignItems: isRTL ? 'flex-end' : 'flex-start',
        },
        voucherEyebrow: {
            fontFamily: ff,
            fontSize: 7,
            color: ACCENT,
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 2,
            textAlign: align,
        },
        voucherTitle: {
            fontFamily: ff,
            fontSize: 14,
            fontWeight: 'bold',
            color: INK,
            textAlign: align,
        },
        codeBadge: {
            backgroundColor: ACCENT,
            paddingVertical: 6,
            paddingHorizontal: 10,
            minWidth: 110,
            alignItems: 'center',
        },
        codeBadgeLabel: {
            fontFamily: ff,
            fontSize: 6.5,
            color: '#99f6e4',
            marginBottom: 2,
            textAlign: 'center',
        },
        codeBadgeValue: {
            fontFamily: ff,
            fontSize: 11,
            color: '#ffffff',
            fontWeight: 'bold',
            textAlign: 'center',
        },
        section: { marginBottom: 12 },
        sectionHead: {
            flexDirection: dir,
            alignItems: 'center',
            marginBottom: 6,
            paddingBottom: 4,
            borderBottomWidth: 1,
            borderBottomColor: LINE,
            borderBottomStyle: 'solid',
        },
        sectionTitle: {
            fontFamily: ff,
            fontSize: 8,
            color: ACCENT,
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            textAlign: align,
        },
        grid: {
            flexDirection: dir,
            flexWrap: 'wrap',
        },
        cell: {
            width: '50%',
            paddingVertical: 6,
            paddingHorizontal: 4,
            borderBottomWidth: 0.5,
            borderBottomColor: LINE,
            borderBottomStyle: 'solid',
        },
        label: {
            fontFamily: ff,
            fontSize: 7,
            color: MUTED,
            marginBottom: 2,
            textAlign: align,
        },
        value: {
            fontFamily: ff,
            fontSize: 9.5,
            color: INK,
            textAlign: align,
        },
        valueLtr: {
            fontFamily: ff,
            fontSize: 9.5,
            color: INK,
            textAlign: 'left',
        },
        totalsCard: {
            marginTop: 8,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: LINE,
            borderStyle: 'solid',
            overflow: 'hidden',
        },
        totalsHead: {
            backgroundColor: ACCENT,
            paddingVertical: 7,
            paddingHorizontal: 12,
        },
        totalsHeadText: {
            fontFamily: ff,
            fontSize: 8,
            color: '#ffffff',
            fontWeight: 'bold',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
        },
        totalRow: {
            flexDirection: dir,
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 8,
            paddingHorizontal: 12,
            backgroundColor: '#f0fdfa',
        },
        totalLabel: {
            fontFamily: ff,
            fontSize: 8.5,
            color: MUTED,
            textAlign: align,
        },
        totalValueHero: {
            fontFamily: ff,
            fontSize: 13,
            color: ACCENT,
            fontWeight: 'bold',
            textAlign: isRTL ? 'left' : 'right',
        },
        noteBox: {
            marginBottom: 16,
            padding: 10,
            backgroundColor: SOFT,
            borderWidth: 1,
            borderColor: LINE,
            borderStyle: 'solid',
            borderLeftWidth: isRTL ? 1 : 3,
            borderRightWidth: isRTL ? 3 : 1,
            borderLeftColor: isRTL ? LINE : ACCENT,
            borderRightColor: isRTL ? ACCENT : LINE,
        },
        noteLabel: {
            fontFamily: ff,
            fontSize: 7,
            color: MUTED,
            marginBottom: 3,
            textAlign: align,
        },
        noteText: {
            fontFamily: ff,
            fontSize: 9,
            color: INK,
            textAlign: align,
            lineHeight: 1.4,
        },
        signRow: {
            marginTop: 28,
            flexDirection: dir,
            justifyContent: 'space-between',
            gap: 16,
        },
        signBox: {
            width: '30%',
            alignItems: 'center',
        },
        signLine: {
            width: '100%',
            borderTopWidth: 1,
            borderTopColor: '#94a3b8',
            borderTopStyle: 'solid',
            marginBottom: 6,
            marginTop: 28,
        },
        signLabel: {
            fontFamily: ff,
            fontSize: 7.5,
            color: MUTED,
            textAlign: 'center',
        },
    });
};

const money = (amount, code) => {
    const num = Number(amount);
    const formatted = Number.isFinite(num)
        ? num.toLocaleString('en-US', { maximumFractionDigits: 4 })
        : '0';
    const sym = (code || '').toString().trim();
    return sym ? `${formatted} ${sym}` : formatted;
};

function DetailCell({ S, label, value, ltr }) {
    return (
        <View style={S.cell}>
            <Text style={S.label}>{sanitizePdfText(label)}</Text>
            <Text style={ltr ? S.valueLtr : S.value}>{sanitizePdfText(value) || '—'}</Text>
        </View>
    );
}

function entryTypeLabel(entry, labels) {
    const ref = String(entry?.reference_number || '');
    if (ref.startsWith('STAFF-COM-')) return labels.staff_commission;
    if (ref.startsWith('XFER-')) return labels.transfer;
    const key = `type_${entry?.entry_type}`;
    return labels[key] || entry?.entry_type || '—';
}

export default function FinanceVoucherPDF({ entry, company, isRTL, labels }) {
    const S = makeStyles(isRTL);
    const now = format(new Date(), isRTL ? 'yyyy/M/d  HH:mm' : 'M/d/yyyy  HH:mm');
    const invoiceId = entry?.invoice_id || (entry?.id != null ? `FIN-${entry.id}` : '—');
    const dateStr = entry?.occurred_on ? String(entry.occurred_on).slice(0, 10) : '—';
    const statusKey = `status_${entry?.status || 'posted'}`;
    const statusLabel = labels[statusKey] || entry?.status || '—';
    const directionLabel = entry?.direction === 'out' ? labels.out : labels.in;
    const typeLabel = entryTypeLabel(entry, labels);
    const amountLabel = money(entry?.amount, entry?.currency_code);
    const docTitle = `${labels.voucher_title} ${invoiceId}`;

    return (
        <Document title={docTitle}>
            <Page size="A4" style={S.page}>
                <View style={S.accentBar} />

                <PdfReportHeader
                    company={company}
                    isRTL={isRTL}
                    title={null}
                    exportDate={null}
                />

                <View style={S.voucherBand}>
                    <View style={S.voucherTitleWrap}>
                        <Text style={S.voucherEyebrow}>
                            {sanitizePdfText(labels.generated_at)}
                            {' · '}
                            {now}
                        </Text>
                        <Text style={S.voucherTitle}>{sanitizePdfText(labels.voucher_title)}</Text>
                    </View>
                    <View style={S.codeBadge}>
                        <Text style={S.codeBadgeLabel}>{sanitizePdfText(labels.invoice_id)}</Text>
                        <Text style={S.codeBadgeValue}>{sanitizePdfText(invoiceId)}</Text>
                    </View>
                </View>

                <View style={S.section}>
                    <View style={S.sectionHead}>
                        <Text style={S.sectionTitle}>{sanitizePdfText(labels.details)}</Text>
                    </View>
                    <View style={S.grid}>
                        <DetailCell S={S} label={labels.invoice_id} value={invoiceId} ltr />
                        <DetailCell S={S} label={labels.date} value={dateStr} ltr />
                        <DetailCell S={S} label={labels.type} value={typeLabel} />
                        <DetailCell S={S} label={labels.direction} value={directionLabel} />
                        <DetailCell S={S} label={labels.status} value={statusLabel} />
                        <DetailCell S={S} label={labels.office} value={entry?.branch_name} />
                        <DetailCell S={S} label={labels.reference} value={entry?.reference_number} ltr />
                        <DetailCell S={S} label={labels.currency} value={entry?.currency_code} ltr />
                        {entry?.exchange_rate && Number(entry.exchange_rate) !== 1 ? (
                            <>
                                <DetailCell S={S} label={labels.exchange_rate} value={entry.exchange_rate} ltr />
                                <DetailCell S={S} label={labels.base_amount} value={entry.base_amount} ltr />
                            </>
                        ) : null}
                        {entry?.transaction_id ? (
                            <DetailCell S={S} label={labels.deal} value={`#${entry.transaction_id}`} ltr />
                        ) : null}
                    </View>
                </View>

                <View style={S.totalsCard}>
                    <View style={S.totalsHead}>
                        <Text style={S.totalsHeadText}>{sanitizePdfText(labels.amount)}</Text>
                    </View>
                    <View style={S.totalRow}>
                        <Text style={S.totalLabel}>{sanitizePdfText(labels.amount)}</Text>
                        <Text style={S.totalValueHero}>{amountLabel}</Text>
                    </View>
                </View>

                {entry?.void_reason ? (
                    <View style={S.noteBox}>
                        <Text style={S.noteLabel}>{sanitizePdfText(labels.reason)}</Text>
                        <Text style={S.noteText}>{sanitizePdfText(entry.void_reason)}</Text>
                    </View>
                ) : null}

                <View style={S.signRow}>
                    <View style={S.signBox}>
                        <View style={S.signLine} />
                        <Text style={S.signLabel}>{sanitizePdfText(labels.prepared_by)}</Text>
                    </View>
                    <View style={S.signBox}>
                        <View style={S.signLine} />
                        <Text style={S.signLabel}>{sanitizePdfText(labels.approved_by)}</Text>
                    </View>
                    <View style={S.signBox}>
                        <View style={S.signLine} />
                        <Text style={S.signLabel}>{sanitizePdfText(labels.received_by)}</Text>
                    </View>
                </View>

                <PdfReportFooter
                    company={company}
                    isRTL={isRTL}
                    addressLabel={labels.address_label}
                    fixed
                />
            </Page>
        </Document>
    );
}
