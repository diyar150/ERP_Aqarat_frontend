/**
 * Shared PDF report footer — company columns only:
 * address, supplier_name
 *
 * Layout (fixed): supplier_name LEFT · address RIGHT
 */
import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { ensurePdfFonts, pdfFontFamily } from "@/utils/pdfSetup";
import { sanitizePdfText } from "@/utils/sanitizePdfText";

ensurePdfFonts();

/** Matches companies.supplier_name DB default. */
const DEFAULT_SUPPLIER_NAME = "Developed by Hiload System";

const DEFAULT_STYLES = StyleSheet.create({
  footer: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 14,
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    paddingTop: 6,
    fontSize: 8,
    color: "#64748b",
    minHeight: 28,
  },
  line: {
    fontSize: 8,
    color: "#64748b",
    marginBottom: 2,
  },
});

const PdfReportFooter = ({
  company = {},
  addressLabel = "Address:",
  isRTL = false,
  fixed = true,
  styles: customStyles,
}) => {
  const address = sanitizePdfText(company?.address) || "—";
  const supplierName = sanitizePdfText(
    company?.supplier_name || DEFAULT_SUPPLIER_NAME
  );
  const label = sanitizePdfText(addressLabel) || "Address:";

  const footerStyles = { ...DEFAULT_STYLES, ...(customStyles || {}) };
  const direction = isRTL ? "rtl" : "ltr";
  const fontFamily = pdfFontFamily(isRTL);
  const textBase = { fontFamily, direction };

  return (
    <View style={footerStyles.footer} fixed={fixed}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 8,
          width: "100%",
        }}
      >
        <Text style={[footerStyles.line, textBase, { flex: 1, textAlign: "left" }]}>
          {supplierName}
        </Text>
        <Text style={[footerStyles.line, textBase, { flex: 1, textAlign: "right" }]}>
          {isRTL ? `${address} :${label}` : `${label} ${address}`}
        </Text>
      </View>
    </View>
  );
};

export default PdfReportFooter;
