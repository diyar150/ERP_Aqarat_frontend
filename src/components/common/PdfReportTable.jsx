import { Text, View } from '@react-pdf/renderer';
import { reportStyles } from '@/components/common/pdfReportStyles.js';
import { sanitizePdfText } from '@/utils/sanitizePdfText';

export function PdfSummaryCards({ items, isRTL }) {
    const S = reportStyles(isRTL);
    if (!items?.length) return null;
    return (
        <View style={S.summaryRow}>
            {items.map((item) => (
                <View key={item.label} style={S.summaryCard}>
                    <Text style={S.summaryLabel}>{sanitizePdfText(item.label)}</Text>
                    <Text style={S.summaryValue}>{sanitizePdfText(item.value)}</Text>
                </View>
            ))}
        </View>
    );
}

export function PdfTable({ columns, rows, isRTL, emptyLabel }) {
    const S = reportStyles(isRTL);
    if (!rows?.length) {
        return (
            <View style={S.empty}>
                <Text style={S.emptyText}>{sanitizePdfText(emptyLabel || '—')}</Text>
            </View>
        );
    }
    return (
        <View>
            <View style={S.tableHead}>
                {columns.map((column) => (
                    <View key={column.key} style={{ width: column.width }}>
                        <Text style={S.th}>{sanitizePdfText(column.header)}</Text>
                    </View>
                ))}
            </View>
            {rows.map((row, index) => (
                <View key={row.id ?? index} style={index % 2 === 0 ? S.rowEven : S.rowOdd} wrap={false}>
                    {columns.map((column) => (
                        <View key={column.key} style={{ width: column.width }}>
                            <Text style={S.td}>{sanitizePdfText(column.render ? column.render(row) : row[column.key])}</Text>
                        </View>
                    ))}
                </View>
            ))}
        </View>
    );
}
