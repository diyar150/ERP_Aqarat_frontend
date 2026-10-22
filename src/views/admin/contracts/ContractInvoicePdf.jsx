import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import PdfReportHeader from '@/components/common/PdfReportHeader.jsx';
import PdfReportFooter from '@/components/common/PdfReportFooter.jsx';
import { ensurePdfFonts, pdfFontFamily } from '@/utils/pdfSetup';
import { sanitizePdfText } from '@/utils/sanitizePdfText';

ensurePdfFonts();

const DEFAULT_INK = '#0f172a';

function invoiceStyles(isRTL = false) {
    const fontFamily = pdfFontFamily(isRTL);
    const align = isRTL ? 'right' : 'left';
    return StyleSheet.create({
        page: {
            fontFamily,
            fontSize: 11,
            paddingTop: 28,
            paddingBottom: 52,
            paddingHorizontal: 28,
            backgroundColor: '#ffffff',
            color: DEFAULT_INK,
            position: 'relative',
        },
        body: {
            marginTop: 4,
        },
        section: {
            marginBottom: 8,
            paddingVertical: 4,
            paddingHorizontal: 6,
            borderRadius: 2,
        },
        line: {
            fontFamily,
            fontSize: 11,
            lineHeight: 1.55,
            textAlign: align,
            marginBottom: 2,
            direction: isRTL ? 'rtl' : 'ltr',
        },
        heading: {
            fontFamily,
            fontSize: 13,
            fontWeight: 700,
            lineHeight: 1.45,
            textAlign: align,
            marginBottom: 2,
            direction: isRTL ? 'rtl' : 'ltr',
        },
        headingH2: {
            fontSize: 11.5,
        },
        blank: {
            height: 10,
        },
        divider: {
            borderBottomWidth: 1,
            borderBottomColor: '#cbd5e1',
            marginVertical: 6,
        },
        spacer: {
            height: 14,
        },
        table: {
            marginBottom: 8,
            borderWidth: 1,
            borderColor: '#cbd5e1',
        },
        tableRow: {
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderBottomColor: '#e2e8f0',
        },
        tableCell: {
            flex: 1,
            padding: 6,
            fontSize: 9,
            fontFamily,
        },
        watermark: {
            position: 'absolute',
            top: '42%',
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 54,
            color: '#e2e8f0',
            opacity: 0.55,
            transform: 'rotate(-32deg)',
            fontFamily,
            fontWeight: 700,
        },
        pageNumber: {
            position: 'absolute',
            bottom: 18,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 9,
            color: '#64748b',
            fontFamily,
        },
    });
}

function looksRtl(title, body) {
    return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(`${title}\n${body}`);
}

function textAlign(align, isRTL) {
    if (align === 'center') return 'center';
    if (align === 'end') return isRTL ? 'left' : 'right';
    return isRTL ? 'right' : 'left';
}

function SectionBlock({ section, styles, isRTL }) {
    if (section.type === 'spacer') return <View style={styles.spacer} />;
    if (section.type === 'divider') return <View style={styles.divider} />;
    if (section.type === 'pagebreak') return <View break />;

    if (section.type === 'table') {
        const rows = Array.isArray(section.rows) ? section.rows : [];
        return (
            <View style={styles.table} wrap={false}>
                {rows.map((row, rowIndex) => (
                    <View key={`row-${rowIndex}`} style={styles.tableRow}>
                        {(Array.isArray(row) ? row : [row]).map((cell, cellIndex) => (
                            <Text
                                key={`cell-${rowIndex}-${cellIndex}`}
                                style={[
                                    styles.tableCell,
                                    { textAlign: textAlign(section.align || 'start', isRTL) },
                                    rowIndex === 0 ? { fontWeight: 700 } : null,
                                ]}
                            >
                                {sanitizePdfText(cell)}
                            </Text>
                        ))}
                    </View>
                ))}
            </View>
        );
    }

    const text = String(section.text || '');
    const lines = text.split('\n');
    const ink = section.textColor || DEFAULT_INK;
    const fill = section.backgroundColor || null;
    const align = textAlign(section.align || 'start', isRTL);
    const lineStyle = section.role === 'heading'
        ? [styles.heading, section.headingSize === 'h2' ? styles.headingH2 : null]
        : styles.line;

    return (
        <View
            style={[styles.section, fill ? { backgroundColor: fill } : null]}
            wrap={false}
        >
            {lines.map((line, index) => (
                line.trim() === ''
                    ? <View key={`blank-${index}`} style={styles.blank} />
                    : (
                        <Text
                            key={`line-${index}`}
                            style={[
                                lineStyle,
                                {
                                    color: ink,
                                    textAlign: align,
                                    fontWeight: section.bold || section.role === 'heading' ? 700 : 400,
                                },
                            ]}
                        >
                            {sanitizePdfText(line)}
                        </Text>
                    )
            ))}
        </View>
    );
}

/**
 * Contract invoice PDF — branded shell with optional structured colored sections.
 */
export default function ContractInvoicePdf({
    title,
    body = '',
    sections = null,
    watermark = null,
    forceRtl = null,
    company = {},
    exportDate = '',
    exportDateLabel = '',
    addressLabel = 'Address:',
    isRTL = false,
}) {
    const text = String(body || '');
    const sectionList = Array.isArray(sections) && sections.length > 0 ? sections : null;
    const rtlProbe = sectionList
        ? sectionList.map((item) => item.text || (item.rows || []).flat().join(' ')).join('\n')
        : text;
    const rtl = forceRtl == null ? (isRTL || looksRtl(title, rtlProbe)) : Boolean(forceRtl);
    const S = invoiceStyles(rtl);
    const lines = text.split('\n');

    return (
        <Document title={sanitizePdfText(title) || 'Contract'}>
            <Page size="A4" style={S.page} wrap>
                {watermark ? <Text style={S.watermark} fixed>{sanitizePdfText(watermark)}</Text> : null}
                <PdfReportHeader
                    company={company}
                    title={title}
                    exportDate={exportDate}
                    exportDateLabel={exportDateLabel}
                    isRTL={rtl}
                />
                <View style={S.body}>
                    {sectionList
                        ? sectionList.map((section, index) => (
                            <SectionBlock
                                key={`section-${index}`}
                                section={section}
                                styles={S}
                                isRTL={rtl}
                            />
                        ))
                        : lines.map((line, index) => (
                            line.trim() === ''
                                ? <View key={`blank-${index}`} style={S.blank} />
                                : (
                                    <Text key={`line-${index}`} style={S.line}>
                                        {sanitizePdfText(line)}
                                    </Text>
                                )
                        ))}
                </View>
                <PdfReportFooter company={company} addressLabel={addressLabel} isRTL={rtl} />
                <Text
                    style={S.pageNumber}
                    render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
                    fixed
                />
            </Page>
        </Document>
    );
}
