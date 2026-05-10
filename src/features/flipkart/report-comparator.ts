import type { GSTRProcessingResult } from "@/features/flipkart/gstr-parser";
import type {
  SalesReportResult,
  SalesReportStateData,
} from "@/features/flipkart/sales-parser";

// ============================================
// Comparison Row — one row per state
// ============================================

export interface ComparisonRow {
  state: string;

  // Sales Report values
  salesTaxableValue: number;
  salesGSTAmount: number;
  salesGSTRate: number;

  // GSTR Return values
  returnTaxableValue: number;
  returnGSTAmount: number;
  returnGSTRate: number;

  // Differences (Sales - Return)
  taxableDifference: number;
  gstAmountDifference: number;
  gstRateDifference: number;

  // Flags
  hasSalesData: boolean;
  hasReturnData: boolean;
  hasMismatch: boolean;
}

export interface ComparisonResult {
  rows: ComparisonRow[];
  totalSalesTaxable: number;
  totalReturnTaxable: number;
  totalSalesGST: number;
  totalReturnGST: number;
  totalTaxableDifference: number;
  totalGSTDifference: number;
  matchedStates: number;
  mismatchedStates: number;
}

// ============================================
// Compare Sales Report with GSTR Return
// ============================================

export function compareReports(
  salesResult: SalesReportResult | null,
  gstrResult: GSTRProcessingResult | null,
): ComparisonResult {
  // Build lookup maps
  const salesMap = new Map<string, SalesReportStateData>();
  const returnMap = new Map<
    string,
    { txval: number; gstAmount: number; gstRate: number }
  >();

  // Index sales data by normalized state name
  if (salesResult) {
    for (const sd of salesResult.stateData) {
      const key = sd.state.toLowerCase().trim();
      salesMap.set(key, sd);
    }
  }

  // Index GSTR return data — group b2cs rows by state name
  if (gstrResult) {
    for (const row of gstrResult.b2csTableData) {
      const key = row.stateName.toLowerCase().trim();
      const existing = returnMap.get(key) || {
        txval: 0,
        gstAmount: 0,
        gstRate: 0,
      };

      // Find the corresponding b2cs row for GST amounts
      const b2csRow = gstrResult.result.b2cs.find(
        (b) => b.pos === row.stateCode && b.txval === row.txval,
      );

      const gstAmt = b2csRow
        ? (b2csRow.iamt || 0) + (b2csRow.camt || 0) + (b2csRow.samt || 0)
        : 0;

      existing.txval += row.txval;
      existing.gstAmount += gstAmt;
      existing.gstRate = b2csRow ? b2csRow.rt : existing.gstRate;
      returnMap.set(key, existing);
    }
  }

  // Collect all unique state names
  const allStates = new Set<string>();
  for (const key of salesMap.keys()) allStates.add(key);
  for (const key of returnMap.keys()) allStates.add(key);

  // Build comparison rows
  const rows: ComparisonRow[] = [];
  let totalSalesTaxable = 0;
  let totalReturnTaxable = 0;
  let totalSalesGST = 0;
  let totalReturnGST = 0;
  let matchedStates = 0;
  let mismatchedStates = 0;

  for (const stateKey of allStates) {
    const sales = salesMap.get(stateKey);
    const ret = returnMap.get(stateKey);

    const salesTaxable = sales?.totalTaxableValue || 0;
    const salesGST = sales?.totalGSTAmount || 0;
    const salesRate = 0; // rate not stored at state level (merged across rates)

    const retTaxable = ret?.txval || 0;
    const retGST = ret?.gstAmount || 0;
    const retRate = ret?.gstRate || 0;

    const taxDiff = +(salesTaxable - retTaxable).toFixed(2);
    const gstDiff = +(salesGST - retGST).toFixed(2);
    const rateDiff = +(salesRate - retRate).toFixed(2);

    const hasMismatch = Math.abs(taxDiff) > 0.9 || Math.abs(gstDiff) > 0.9;

    if (hasMismatch) mismatchedStates++;
    else matchedStates++;

    totalSalesTaxable += salesTaxable;
    totalReturnTaxable += retTaxable;
    totalSalesGST += salesGST;
    totalReturnGST += retGST;

    rows.push({
      state:
        sales?.state ||
        (ret
          ? stateKey
              .split(" ")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" ")
          : stateKey),
      salesTaxableValue: +salesTaxable.toFixed(2),
      salesGSTAmount: +salesGST.toFixed(2),
      salesGSTRate: +salesRate.toFixed(2),
      returnTaxableValue: +retTaxable.toFixed(2),
      returnGSTAmount: +retGST.toFixed(2),
      returnGSTRate: +retRate.toFixed(2),
      taxableDifference: taxDiff,
      gstAmountDifference: gstDiff,
      gstRateDifference: rateDiff,
      hasSalesData: !!sales,
      hasReturnData: !!ret,
      hasMismatch,
    });
  }

  // Sort by state name
  rows.sort((a, b) => a.state.localeCompare(b.state));

  return {
    rows,
    totalSalesTaxable: +totalSalesTaxable.toFixed(2),
    totalReturnTaxable: +totalReturnTaxable.toFixed(2),
    totalSalesGST: +totalSalesGST.toFixed(2),
    totalReturnGST: +totalReturnGST.toFixed(2),
    totalTaxableDifference: +(totalSalesTaxable - totalReturnTaxable).toFixed(
      2,
    ),
    totalGSTDifference: +(totalSalesGST - totalReturnGST).toFixed(2),
    matchedStates,
    mismatchedStates,
  };
}
