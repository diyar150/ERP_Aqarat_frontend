/**
 * Shared PDF report header — company columns only:
 * logo_1 (as logo_data_url), name, legal_name, tagline, phone_1, phone_2
 * + report meta: exportDate, title, filters
 *
 * Layout (fixed): logo LEFT · company info RIGHT
 */
import React from "react";
import { View, Text, Image } from "@react-pdf/renderer";
import { isPdfEmbeddableLogo } from "../../utils/authenticatedMedia";
import { ensurePdfFonts, pdfFontFamily } from "@/utils/pdfSetup";
import { sanitizePdfText } from "@/utils/sanitizePdfText";

ensurePdfFonts();

const DEFAULT_HEADER_STYLES = {
  exportDate: { fontSize: 9, marginBottom: 6, color: "#444" },
  title: { fontSize: 14, marginBottom: 8, textAlign: "center", fontWeight: "bold" },
  filters: { fontSize: 9, marginBottom: 2, color: "#444" },
  companyName: { fontSize: 16, fontWeight: "bold", marginBottom: 3 },
  companySub: { fontSize: 10, color: "#555", marginBottom: 2 },
};

/** Standard modern report logo size (pt) — readable on A4 print. */
const LOGO_SIZE = 96;

const PdfReportHeader = ({
  company,
  title,
  filters,
  exportDate,
  exportDateLabel = "Export Date:",
  isRTL = false,
  styles,
}) => {
  const headerStyles = { ...DEFAULT_HEADER_STYLES, ...(styles || {}) };
  const safeFilters = Array.isArray(filters)
    ? filters.map(sanitizePdfText).filter(Boolean)
    : [];

  const logoSrc = isPdfEmbeddableLogo(company?.logo_data_url)
    ? company.logo_data_url
    : isPdfEmbeddableLogo(company?.logo_1)
      ? company.logo_1
      : null;

  const name = sanitizePdfText(company?.name);
  const legalName = sanitizePdfText(company?.legal_name);
  const tagline = sanitizePdfText(company?.tagline);
  const phone1 = sanitizePdfText(company?.phone_1);
  const phone2 = sanitizePdfText(company?.phone_2);

  // Text shaping only — physical layout stays logo left / info right
  const direction = isRTL ? "rtl" : "ltr";
  const metaAlign = isRTL ? "right" : "left";
  const fontFamily = pdfFontFamily(isRTL);
  const textBase = { fontFamily, direction };

  return (
    <>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 12,
          paddingBottom: 10,
          borderBottomWidth: 0.75,
          borderBottomColor: "#e2e8f0",
        }}
      >
        {logoSrc ? (
          <Image
            src={logoSrc}
            style={{
              width: LOGO_SIZE,
              height: LOGO_SIZE,
              objectFit: "contain",
              marginRight: 16,
            }}
          />
        ) : null}

        <View style={{ flex: 1, alignItems: "flex-end", justifyContent: "center" }}>
          {name ? (
            <Text style={[headerStyles.companyName, textBase, { textAlign: "right" }]}>
              {name}
            </Text>
          ) : null}
          {legalName && legalName !== name ? (
            <Text style={[headerStyles.companySub, textBase, { textAlign: "right" }]}>
              {legalName}
            </Text>
          ) : null}
          {tagline ? (
            <Text style={[headerStyles.companySub, textBase, { textAlign: "right" }]}>
              {tagline}
            </Text>
          ) : null}
          {phone1 ? (
            <Text style={[headerStyles.companySub, textBase, { textAlign: "right" }]}>
              {phone1}
            </Text>
          ) : null}
          {phone2 ? (
            <Text style={[headerStyles.companySub, textBase, { textAlign: "right" }]}>
              {phone2}
            </Text>
          ) : null}
        </View>
      </View>

      {exportDate ? (
        <Text style={[headerStyles.exportDate, textBase, { textAlign: metaAlign }]}>
          {isRTL
            ? `${sanitizePdfText(exportDate)} :${sanitizePdfText(exportDateLabel)}`
            : `${sanitizePdfText(exportDateLabel)} ${sanitizePdfText(exportDate)}`}
        </Text>
      ) : null}

      {title ? (
        <Text style={[headerStyles.title, textBase]}>{sanitizePdfText(title)}</Text>
      ) : null}

      {safeFilters.length > 0 ? (
        <View style={{ marginBottom: 8, alignItems: isRTL ? "flex-end" : "flex-start" }}>
          {safeFilters.map((filter, index) => (
            <Text
              key={`pdf-filter-${index}`}
              style={[headerStyles.filters, textBase, { textAlign: metaAlign }]}
            >
              {filter}
            </Text>
          ))}
        </View>
      ) : null}
    </>
  );
};

export default PdfReportHeader;
