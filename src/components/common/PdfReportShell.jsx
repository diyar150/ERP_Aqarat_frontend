import { Document, Page } from '@react-pdf/renderer';
import PdfReportHeader from '@/components/common/PdfReportHeader.jsx';
import PdfReportFooter from '@/components/common/PdfReportFooter.jsx';
import { PdfSummaryCards } from '@/components/common/PdfReportTable.jsx';
import { reportStyles } from '@/components/common/pdfReportStyles.js';

/**
 * Branded multi-page PDF shell used by every workspace report.
 */
export default function PdfReportShell({
    title,
    company,
    filters = [],
    exportDate,
    exportDateLabel,
    addressLabel,
    isRTL = false,
    summary = [],
    children,
}) {
    const S = reportStyles(isRTL);
    return (
        <Document title={title || 'Report'}>
            <Page size="A4" style={S.page} wrap>
                <PdfReportHeader
                    company={company}
                    title={title}
                    filters={filters}
                    exportDate={exportDate}
                    exportDateLabel={exportDateLabel}
                    isRTL={isRTL}
                />
                <PdfSummaryCards items={summary} isRTL={isRTL} />
                {children}
                <PdfReportFooter company={company} addressLabel={addressLabel} isRTL={isRTL} />
            </Page>
        </Document>
    );
}
