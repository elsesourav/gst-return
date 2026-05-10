import * as XLSX from "xlsx";
import { STATES } from "./gstr-parser";

// ============================================
// Sales Report Parser
// Reads "Sales Report" + "Cash Back Report" sheets
// Groups by state+rate, merges to per-state output
// ============================================

export interface SalesReportStateData {
  state: string;
  hsnCode: string;
  totalTaxableValue: number;
  totalGSTAmount: number;
}

// One entry per state+rate combo — used for GSTR-1 (needs the rate %)
export interface SalesReportGSTREntry {
  state: string;
  gstRate: number;
  taxableValue: number;
  gstAmount: number;
  hsnCode: string;
}

export interface SalesReportResult {
  // Per state+rate (for GSTR-1: West Bengal 5% and West Bengal 12% are separate rows)
  gstrData: SalesReportGSTREntry[];
  // Per state merged (for comparison/analytics: all rates combined)
  stateData: SalesReportStateData[];
  globalHSN: string;
  totals: {
    totalTaxableValue: number;
    totalGSTAmount: number;
  };
  errors: string[];
}

// Column names for Sales Report sheet
const SALES_REPORT_COLS = {
  state: "Customer's Delivery State",
  hsn: "HSN Code",
  taxable: "Taxable Value (Final Invoice Amount -Taxes)",
  igstRate: "IGST Rate",
  igstAmount: "IGST Amount",
  cgstRate: "CGST Rate",
  cgstAmount: "CGST Amount",
  sgstRate: "SGST Rate (or UTGST as applicable)",
  sgstAmount: "SGST Amount (Or UTGST as applicable)",
};

// Column names for Cash Back Report sheet (no HSN column — uses Sales Report HSN)
const CASHBACK_REPORT_COLS = {
  state: "Customer's Delivery State",
  taxable: "Taxable Value",
  igstRate: "IGST Rate",
  igstAmount: "IGST Amount",
  cgstRate: "CGST Rate",
  cgstAmount: "CGST Amount",
  sgstRate: "SGST Rate (or UTGST as applicable)",
  sgstAmount: "SGST Amount (Or UTGST as applicable)",
};

// ============================================
// Helpers
// ============================================

function safeNum(val: unknown): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const n = parseFloat(String(val || "0").replace(/[₹,\s]/g, ""));
  return isNaN(n) ? 0 : n;
}

// Flipkart excel files often have a broken !ref (e.g. A1:A1) even though there is data.
// Scan all cells and recalculate the true bounding box.
export function fixSheetRange(sheet: XLSX.WorkSheet) {
  let minR = Infinity,
    minC = Infinity,
    maxR = -1,
    maxC = -1;
  let hasCells = false;
  for (const key of Object.keys(sheet)) {
    if (key.startsWith("!")) continue;
    const cell = XLSX.utils.decode_cell(key);
    if (cell.r < minR) minR = cell.r;
    if (cell.c < minC) minC = cell.c;
    if (cell.r > maxR) maxR = cell.r;
    if (cell.c > maxC) maxC = cell.c;
    hasCells = true;
  }
  if (hasCells) {
    sheet["!ref"] = XLSX.utils.encode_range({
      s: { c: minC, r: minR },
      e: { c: maxC, r: maxR },
    });
  }
}

function findColumnFlexible(headers: string[], target: string): string | null {
  const exact = headers.find((h) => h.trim() === target);
  if (exact) return exact;
  const lower = target.toLowerCase();
  const ci = headers.find((h) => h.trim().toLowerCase() === lower);
  if (ci) return ci;
  const partial = headers.find(
    (h) =>
      h.trim().toLowerCase().includes(lower) ||
      lower.includes(h.trim().toLowerCase()),
  );
  return partial || null;
}

// ============================================
// State+Rate accumulator
// Key: "StateName||gstRate" — West Bengal||5 ≠ West Bengal||12
// ============================================

type StateRateKey = string; // `${state}||${gstRate}`

interface StateRateAccumulator {
  state: string;
  gstRate: number;
  taxableValue: number;
  gstAmount: number;
  hsnCode: string; // first non-empty HSN seen for this bucket
}

// Per-state merged (rate dropped)
interface StateMerged {
  taxableValue: number;
  gstAmount: number;
  hsnCode: string;
}

// ============================================
// processSheet — groups by state + gst rate
// ============================================

function processSheet(
  rows: Record<string, unknown>[],
  colMap: Record<string, string>,
  isHSNAvailable: boolean,
  fallbackHSN = "",
): {
  grouped: Map<StateRateKey, StateRateAccumulator>;
  firstHSN: string;
  errors: string[];
} {
  const grouped = new Map<StateRateKey, StateRateAccumulator>();
  let firstHSN = "";
  const errors: string[] = [];

  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const resolved: Record<string, string | null> = {};
  for (const [key, target] of Object.entries(colMap)) {
    resolved[key] = findColumnFlexible(headers, target);
  }

  let skippedRows = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const stateOriginal = String(row[resolved.state || ""] || "").trim();
      if (!stateOriginal) {
        skippedRows++;
        continue;
      }

      // Normalize state name via STATES map
      const stateEntry = STATES[stateOriginal.toLowerCase()];
      const state = stateEntry ? stateEntry.name : stateOriginal;

      const taxable = safeNum(row[resolved.taxable || ""]);
      const igstRate = safeNum(row[resolved.igstRate || ""]);
      const igstAmount = safeNum(row[resolved.igstAmount || ""]);
      const cgstRate = safeNum(row[resolved.cgstRate || ""]);
      const cgstAmount = safeNum(row[resolved.cgstAmount || ""]);
      const sgstRate = safeNum(row[resolved.sgstRate || ""]);
      const sgstAmount = safeNum(row[resolved.sgstAmount || ""]);

      const gstRate = +(igstRate + cgstRate + sgstRate).toFixed(4);
      const gstAmount = +(igstAmount + cgstAmount + sgstAmount).toFixed(4);

      // HSN: pick first non-empty from this row's column; cashback uses fallbackHSN
      let rowHSN = fallbackHSN;
      if (isHSNAvailable && resolved.hsn) {
        const h = String(row[resolved.hsn] || "").trim();
        if (h) {
          rowHSN = h;
          if (!firstHSN) firstHSN = h;
        }
      }

      // Key = state + rate so West Bengal 5% and West Bengal 12% stay separate
      const key: StateRateKey = `${state}||${gstRate}`;
      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, {
          state,
          gstRate,
          taxableValue: taxable,
          gstAmount,
          hsnCode: rowHSN,
        });
      } else {
        existing.taxableValue += taxable;
        existing.gstAmount += gstAmount;
        if (!existing.hsnCode && rowHSN) existing.hsnCode = rowHSN;
      }
    } catch (err) {
      errors.push(
        `Row ${i + 2}: ${err instanceof Error ? err.message : "Parse error"}`,
      );
      skippedRows++;
    }
  }

  return { grouped, firstHSN, errors };
}

// Merge multiple state+rate buckets → one entry per state (sum taxable & gst, keep HSN)
function mergeGroupedByState(
  grouped: Map<StateRateKey, StateRateAccumulator>,
): Map<string, StateMerged> {
  const merged = new Map<string, StateMerged>();
  for (const bucket of grouped.values()) {
    const existing = merged.get(bucket.state);
    if (!existing) {
      merged.set(bucket.state, {
        taxableValue: bucket.taxableValue,
        gstAmount: bucket.gstAmount,
        hsnCode: bucket.hsnCode,
      });
    } else {
      existing.taxableValue += bucket.taxableValue;
      existing.gstAmount += bucket.gstAmount;
      if (!existing.hsnCode && bucket.hsnCode)
        existing.hsnCode = bucket.hsnCode;
    }
  }
  return merged;
}

// ============================================
// Main Sales Report Processing
// ============================================

export function processSalesReport(file: File): Promise<SalesReportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const errors: string[] = [];

        // Find required sheets
        const salesSheetName = workbook.SheetNames.find((n) =>
          n.toLowerCase().includes("sales report"),
        );
        const cashbackSheetName = workbook.SheetNames.find(
          (n) =>
            n.toLowerCase().includes("cash back report") ||
            n.toLowerCase().includes("cashback report"),
        );

        if (!salesSheetName) {
          reject(
            new Error(
              'Sheet "Sales Report" not found. Available: ' +
                workbook.SheetNames.join(", "),
            ),
          );
          return;
        }

        // --- Parse Sales Report ---
        const salesSheet = workbook.Sheets[salesSheetName];
        fixSheetRange(salesSheet);
        const salesRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
          salesSheet,
          { defval: "" },
        );
        const salesResult = processSheet(salesRows, SALES_REPORT_COLS, true);
        errors.push(...salesResult.errors);

        const globalHSN = salesResult.firstHSN;

        // --- Parse Cash Back Report (optional) ---
        // Cash Back has no HSN column — use the globalHSN found from Sales Report
        let cashbackResult: ReturnType<typeof processSheet> | null = null;
        if (cashbackSheetName) {
          const cashbackSheet = workbook.Sheets[cashbackSheetName];
          fixSheetRange(cashbackSheet);
          const cashbackRows = XLSX.utils.sheet_to_json<
            Record<string, unknown>
          >(cashbackSheet, { defval: "" });
          cashbackResult = processSheet(
            cashbackRows,
            CASHBACK_REPORT_COLS,
            false,
            globalHSN, // use Sales Report's HSN for all Cash Back rows
          );
          errors.push(...cashbackResult.errors);
        }

        // --- Merge state+rate buckets for per-state output (comparison / analytics) ---
        const salesMerged = mergeGroupedByState(salesResult.grouped);

        // Combine Cash Back into the merged map too
        if (cashbackResult) {
          const cashMerged = mergeGroupedByState(cashbackResult.grouped);
          for (const [state, data] of cashMerged) {
            const existing = salesMerged.get(state);
            if (!existing) {
              salesMerged.set(state, { ...data });
            } else {
              existing.taxableValue += data.taxableValue;
              existing.gstAmount += data.gstAmount;
              if (!existing.hsnCode && data.hsnCode)
                existing.hsnCode = data.hsnCode;
            }
          }
        }

        // --- Build gstrData: state+rate buckets (Sales + CashBack combined, rate preserved) ---
        // Combine Sales and Cash Back grouped maps under same state||rate key
        const combinedGrouped = new Map(salesResult.grouped);
        if (cashbackResult) {
          for (const [key, bucket] of cashbackResult.grouped) {
            const existing = combinedGrouped.get(key);
            if (!existing) {
              combinedGrouped.set(key, { ...bucket });
            } else {
              existing.taxableValue += bucket.taxableValue;
              existing.gstAmount += bucket.gstAmount;
              if (!existing.hsnCode && bucket.hsnCode)
                existing.hsnCode = bucket.hsnCode;
            }
          }
        }

        const gstrData: SalesReportGSTREntry[] = Array.from(
          combinedGrouped.values(),
        )
          .map((b) => ({
            state: b.state,
            gstRate: b.gstRate,
            taxableValue: +b.taxableValue.toFixed(2),
            gstAmount: +b.gstAmount.toFixed(2),
            hsnCode: b.hsnCode || globalHSN,
          }))
          .sort(
            (a, b) => a.state.localeCompare(b.state) || a.gstRate - b.gstRate,
          );

        // --- Build stateData: merged per-state (rate dropped) ---
        let totalTaxableValue = 0;
        let totalGSTAmount = 0;

        const stateData: SalesReportStateData[] = [];
        for (const [state, data] of salesMerged) {
          const taxable = +data.taxableValue.toFixed(2);
          const gstAmt = +data.gstAmount.toFixed(2);
          totalTaxableValue += taxable;
          totalGSTAmount += gstAmt;
          stateData.push({
            state,
            hsnCode: data.hsnCode || globalHSN,
            totalTaxableValue: taxable,
            totalGSTAmount: gstAmt,
          });
        }

        stateData.sort((a, b) => a.state.localeCompare(b.state));

        resolve({
          gstrData,
          stateData,
          globalHSN,
          totals: {
            totalTaxableValue: +totalTaxableValue.toFixed(2),
            totalGSTAmount: +totalGSTAmount.toFixed(2),
          },
          errors,
        });
      } catch (error) {
        reject(
          new Error(
            `Failed to process Sales Report: ${error instanceof Error ? error.message : "Unknown error"}`,
          ),
        );
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}
