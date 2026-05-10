import type { GSTRReturnResult } from "./gstr-parser";
import { STATES } from "./gstr-parser";
import type { SalesReportGSTREntry } from "./sales-parser";

// ============================================
// Build reverse lookup: "West Bengal" → "19"
// ============================================

const STATE_ID_BY_NAME: Record<string, string> = {};
for (const val of Object.values(STATES)) {
  STATE_ID_BY_NAME[val.name] = val.id;
}

// ============================================
// Convert Sales Report gstrData → GSTRReturnResult
// Same format as processGSTRReturnReport output
// ============================================

export function generateGSTR1FromSales(
  entries: SalesReportGSTREntry[],
  myStateCode: string,
  session: string, // "YYYY-MM"
  gstin: string,
): GSTRReturnResult {
  const [yy, mm] = session.split("-");
  const fp = `${mm}${yy}`; // e.g. "042026"

  const b2cs = entries
    .filter((e) => e.taxableValue !== 0)
    .map((entry) => {
      const stateCode = STATE_ID_BY_NAME[entry.state] || "";
      const isIntra = stateCode === myStateCode;
      // Calculate GST amount from rate × taxableValue (more accurate than summing per-row)
      const totalGst = +((entry.taxableValue * entry.gstRate) / 100).toFixed(2);

      if (isIntra) {
        const half = +(totalGst / 2).toFixed(2);
        return {
          sply_ty: "INTRA" as const,
          rt: entry.gstRate,
          typ: "OE",
          pos: stateCode,
          txval: entry.taxableValue,
          camt: half,
          samt: half,
          csamt: 0,
        };
      } else {
        return {
          sply_ty: "INTER" as const,
          rt: entry.gstRate,
          typ: "OE",
          pos: stateCode,
          txval: entry.taxableValue,
          iamt: totalGst,
          csamt: 0,
        };
      }
    });

  return {
    gstin,
    fp,
    version: "GST3.2.2",
    hash: "hash",
    b2cs,
  };
}

// ============================================
// Build the file name (same pattern as gstr-parser)
// ============================================

export function buildSalesGSTR1FileName(
  gstin: string,
  session: string,
): string {
  return `${gstin}_${session}_Sales_ES.json`;
}
