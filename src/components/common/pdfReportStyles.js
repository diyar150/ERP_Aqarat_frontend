import { StyleSheet } from '@react-pdf/renderer';
import { ensurePdfFonts, pdfFontFamily } from '@/utils/pdfSetup';

ensurePdfFonts();

export function reportStyles(isRTL = false) {
    const fontFamily = pdfFontFamily(isRTL);
    const dir = isRTL ? 'row-reverse' : 'row';
    return StyleSheet.create({
        page: {
            fontFamily,
            fontSize: 9,
            paddingTop: 28,
            paddingBottom: 48,
            paddingHorizontal: 28,
            backgroundColor: '#ffffff',
            color: '#0f172a',
        },
        summaryRow: {
            flexDirection: dir,
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 12,
        },
        summaryCard: {
            borderWidth: 0.5,
            borderColor: '#e2e8f0',
            borderRadius: 4,
            paddingVertical: 6,
            paddingHorizontal: 8,
            minWidth: 90,
        },
        summaryLabel: { fontSize: 7, color: '#64748b', marginBottom: 2 },
        summaryValue: { fontSize: 11, fontWeight: 'bold' },
        tableHead: {
            flexDirection: dir,
            backgroundColor: '#0f766e',
            paddingVertical: 5,
            paddingHorizontal: 2,
        },
        th: { fontSize: 7, color: '#ffffff', textAlign: 'center', paddingHorizontal: 2 },
        rowEven: { flexDirection: dir, backgroundColor: '#ffffff', paddingVertical: 4, paddingHorizontal: 2 },
        rowOdd: { flexDirection: dir, backgroundColor: '#f8fafc', paddingVertical: 4, paddingHorizontal: 2 },
        td: { fontSize: 7.5, color: '#1e293b', textAlign: 'center', paddingHorizontal: 2 },
        empty: { marginTop: 40, alignItems: 'center' },
        emptyText: { fontSize: 11, color: '#94a3b8' },
    });
}
