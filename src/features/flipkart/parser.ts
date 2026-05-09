import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import type { StandardizedRecord, ProcessingSummary, StateWiseSummary, MonthWiseSummary, Platform } from '@/types';
import { STATE_NAME_TO_CODE, INDIAN_STATES } from '@/types';

// ============================================
// Base Parser Interface
// ============================================

export interface ParseResult {
  records: StandardizedRecord[];
  summary: ProcessingSummary;
  errors: string[];
}

// ============================================
// Excel Parsing Utilities
// ============================================

/**
 * Read Excel file and return sheet data as array of objects
 */
export function readExcelFile(file: File): Promise<Record<string, unknown>[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        const sheets = workbook.SheetNames.map((name) => {
          const sheet = workbook.Sheets[name];
          return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
        });

        resolve(sheets);
      } catch (error) {
        reject(new Error('Failed to parse Excel file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Resolve state code from state name or code
 */
function resolveStateCode(stateInput: string): { state: string; stateCode: string } {
  const input = stateInput.trim();

  // Check if it's already a state code
  if (INDIAN_STATES[input]) {
    return { state: INDIAN_STATES[input], stateCode: input };
  }

  // Try to match by name
  const code = STATE_NAME_TO_CODE[input.toLowerCase()];
  if (code) {
    return { state: INDIAN_STATES[code], stateCode: code };
  }

  // Partial match
  const entries = Object.entries(INDIAN_STATES);
  for (const [code, name] of entries) {
    if (name.toLowerCase().includes(input.toLowerCase()) ||
        input.toLowerCase().includes(name.toLowerCase())) {
      return { state: name, stateCode: code };
    }
  }

  return { state: input || 'Unknown', stateCode: '00' };
}

/**
 * Parse a date value from Excel
 */
function parseDate(value: unknown): string {
  if (!value) return dayjs().format('YYYY-MM-DD');

  if (value instanceof Date) {
    return dayjs(value).format('YYYY-MM-DD');
  }

  const str = String(value).trim();

  // Try various date formats
  const formats = [
    'YYYY-MM-DD',
    'DD-MM-YYYY',
    'DD/MM/YYYY',
    'MM/DD/YYYY',
    'YYYY/MM/DD',
    'DD-MMM-YYYY',
    'DD MMM YYYY',
  ];

  for (const fmt of formats) {
    const parsed = dayjs(str, fmt);
    if (parsed.isValid()) {
      return parsed.format('YYYY-MM-DD');
    }
  }

  // Try native Date parsing
  const nativeDate = new Date(str);
  if (!isNaN(nativeDate.getTime())) {
    return dayjs(nativeDate).format('YYYY-MM-DD');
  }

  return dayjs().format('YYYY-MM-DD');
}

/**
 * Safely parse a number
 */
function parseNumber(value: unknown): number {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  const str = String(value).replace(/[₹,\s]/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// ============================================
// Flipkart Parser
// ============================================

/**
 * Column mapping for Flipkart sales report
 * Maps possible column headers to standardized field names
 */
const FLIPKART_SALES_MAPPINGS: Record<string, string[]> = {
  orderId: ['order id', 'order_id', 'orderid', 'order no', 'order number', 'order_item_id'],
  date: ['order date', 'order_date', 'date', 'invoice date', 'order_approval_date'],
  sku: ['sku', 'seller sku', 'seller_sku', 'fsn', 'product id'],
  productName: ['product name', 'product title', 'product', 'item description', 'product_name'],
  quantity: ['quantity', 'qty', 'order quantity', 'units'],
  state: ['ship to state', 'shipping state', 'state', 'buyer state', 'delivery state', 'ship_to_state'],
  taxableAmount: ['taxable amount', 'taxable value', 'taxable_amount', 'net amount', 'total taxable amount'],
  cgstRate: ['cgst rate', 'cgst_rate', 'cgst %'],
  cgstAmount: ['cgst amount', 'cgst', 'cgst_amount', 'central tax amount'],
  sgstRate: ['sgst rate', 'sgst_rate', 'sgst %'],
  sgstAmount: ['sgst amount', 'sgst', 'sgst_amount', 'state tax amount'],
  igstRate: ['igst rate', 'igst_rate', 'igst %'],
  igstAmount: ['igst amount', 'igst', 'igst_amount', 'integrated tax amount'],
  totalAmount: ['total amount', 'total', 'invoice amount', 'final amount', 'settlement value', 'order amount'],
  hsnCode: ['hsn code', 'hsn', 'hsn_code', 'hsn/sac'],
  invoiceNumber: ['invoice number', 'invoice no', 'invoice_number', 'invoice id'],
};

/**
 * Find the best matching column for a field
 */
function findColumn(headers: string[], possibleNames: string[]): string | null {
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());

  for (const name of possibleNames) {
    const idx = normalizedHeaders.indexOf(name.toLowerCase());
    if (idx !== -1) return headers[idx];
  }

  // Partial matching
  for (const name of possibleNames) {
    for (let i = 0; i < normalizedHeaders.length; i++) {
      if (normalizedHeaders[i].includes(name.toLowerCase()) ||
          name.toLowerCase().includes(normalizedHeaders[i])) {
        return headers[i];
      }
    }
  }

  return null;
}

/**
 * Parse Flipkart sales report
 */
export function parseFlipkartSalesReport(data: Record<string, unknown>[]): ParseResult {
  const records: StandardizedRecord[] = [];
  const errors: string[] = [];

  if (data.length === 0) {
    return { records: [], summary: createEmptySummary(), errors: ['No data found in file'] };
  }

  // Detect columns from first row
  const headers = Object.keys(data[0]);
  const columnMap: Record<string, string | null> = {};

  for (const [field, possibleNames] of Object.entries(FLIPKART_SALES_MAPPINGS)) {
    columnMap[field] = findColumn(headers, possibleNames);
  }

  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    try {
      const orderId = String(row[columnMap.orderId || ''] || `ROW_${i + 1}`).trim();
      const date = parseDate(row[columnMap.date || '']);
      const stateInput = String(row[columnMap.state || ''] || '').trim();
      const { state, stateCode } = resolveStateCode(stateInput);

      const taxableAmount = parseNumber(row[columnMap.taxableAmount || '']);
      const cgstRate = parseNumber(row[columnMap.cgstRate || '']);
      const cgstAmount = parseNumber(row[columnMap.cgstAmount || '']);
      const sgstRate = parseNumber(row[columnMap.sgstRate || '']);
      const sgstAmount = parseNumber(row[columnMap.sgstAmount || '']);
      const igstRate = parseNumber(row[columnMap.igstRate || '']);
      const igstAmount = parseNumber(row[columnMap.igstAmount || '']);

      const gstAmount = cgstAmount + sgstAmount + igstAmount;
      const totalRaw = parseNumber(row[columnMap.totalAmount || '']);
      const totalAmount = totalRaw || taxableAmount + gstAmount;

      const record: StandardizedRecord = {
        orderId,
        date,
        sku: String(row[columnMap.sku || ''] || '').trim(),
        productName: String(row[columnMap.productName || ''] || '').trim(),
        quantity: Math.max(1, parseNumber(row[columnMap.quantity || ''])),
        state,
        stateCode,
        hsnCode: String(row[columnMap.hsnCode || ''] || '').trim(),
        taxableAmount: Math.round(taxableAmount * 100) / 100,
        cgstRate,
        cgstAmount: Math.round(cgstAmount * 100) / 100,
        sgstRate,
        sgstAmount: Math.round(sgstAmount * 100) / 100,
        igstRate,
        igstAmount: Math.round(igstAmount * 100) / 100,
        gstAmount: Math.round(gstAmount * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        platform: 'flipkart' as Platform,
        invoiceNumber: String(row[columnMap.invoiceNumber || ''] || '').trim(),
        returnType: igstAmount > 0 ? 'B2CS' : 'B2CS',
      };

      // Skip empty rows
      if (record.taxableAmount === 0 && record.totalAmount === 0) {
        continue;
      }

      records.push(record);
    } catch (err) {
      errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  const summary = calculateSummary(records);
  return { records, summary, errors };
}

/**
 * Parse Flipkart GST/Tax report
 */
export function parseFlipkartGSTReport(data: Record<string, unknown>[]): ParseResult {
  // GST report uses similar structure but may have different column names
  return parseFlipkartSalesReport(data);
}

// ============================================
// Summary Calculation
// ============================================

function createEmptySummary(): ProcessingSummary {
  return {
    totalRecords: 0,
    totalTaxableAmount: 0,
    totalCGST: 0,
    totalSGST: 0,
    totalIGST: 0,
    totalGST: 0,
    totalAmount: 0,
    stateWise: [],
    monthWise: [],
  };
}

export function calculateSummary(records: StandardizedRecord[]): ProcessingSummary {
  if (records.length === 0) return createEmptySummary();

  const totalTaxableAmount = records.reduce((sum, r) => sum + r.taxableAmount, 0);
  const totalCGST = records.reduce((sum, r) => sum + r.cgstAmount, 0);
  const totalSGST = records.reduce((sum, r) => sum + r.sgstAmount, 0);
  const totalIGST = records.reduce((sum, r) => sum + r.igstAmount, 0);
  const totalGST = totalCGST + totalSGST + totalIGST;
  const totalAmount = records.reduce((sum, r) => sum + r.totalAmount, 0);

  // State-wise summary
  const stateMap = new Map<string, StateWiseSummary>();
  for (const r of records) {
    const key = r.stateCode || r.state;
    const existing = stateMap.get(key) || {
      state: r.state,
      stateCode: r.stateCode,
      taxableAmount: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalGST: 0,
      totalAmount: 0,
      recordCount: 0,
    };

    existing.taxableAmount += r.taxableAmount;
    existing.cgst += r.cgstAmount;
    existing.sgst += r.sgstAmount;
    existing.igst += r.igstAmount;
    existing.totalGST += r.gstAmount;
    existing.totalAmount += r.totalAmount;
    existing.recordCount += 1;
    stateMap.set(key, existing);
  }

  // Month-wise summary
  const monthMap = new Map<string, MonthWiseSummary>();
  for (const r of records) {
    const d = dayjs(r.date);
    const key = d.format('YYYY-MM');
    const existing = monthMap.get(key) || {
      month: d.format('MMMM'),
      year: d.year(),
      taxableAmount: 0,
      totalGST: 0,
      totalAmount: 0,
      recordCount: 0,
    };

    existing.taxableAmount += r.taxableAmount;
    existing.totalGST += r.gstAmount;
    existing.totalAmount += r.totalAmount;
    existing.recordCount += 1;
    monthMap.set(key, existing);
  }

  return {
    totalRecords: records.length,
    totalTaxableAmount: Math.round(totalTaxableAmount * 100) / 100,
    totalCGST: Math.round(totalCGST * 100) / 100,
    totalSGST: Math.round(totalSGST * 100) / 100,
    totalIGST: Math.round(totalIGST * 100) / 100,
    totalGST: Math.round(totalGST * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    stateWise: Array.from(stateMap.values()).sort((a, b) => b.totalAmount - a.totalAmount),
    monthWise: Array.from(monthMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return dayjs(`${a.month} ${a.year}`, 'MMMM YYYY').month() -
             dayjs(`${b.month} ${b.year}`, 'MMMM YYYY').month();
    }),
  };
}

// ============================================
// JSON Parser
// ============================================

export function parseJsonData(jsonString: string): ParseResult {
  const errors: string[] = [];

  try {
    const parsed = JSON.parse(jsonString);
    const rawRecords = Array.isArray(parsed) ? parsed : parsed.records || parsed.data || [parsed];

    const records: StandardizedRecord[] = rawRecords.map((r: Record<string, unknown>, i: number) => {
      try {
        const stateInput = String(r.state || r.shipping_state || '').trim();
        const { state, stateCode } = resolveStateCode(stateInput);

        return {
          orderId: String(r.orderId || r.order_id || `JSON_${i + 1}`),
          date: parseDate(r.date || r.order_date),
          sku: String(r.sku || ''),
          productName: String(r.productName || r.product_name || ''),
          quantity: parseNumber(r.quantity || 1),
          state,
          stateCode,
          hsnCode: String(r.hsnCode || r.hsn_code || ''),
          taxableAmount: parseNumber(r.taxableAmount || r.taxable_amount || 0),
          cgstRate: parseNumber(r.cgstRate || r.cgst_rate || 0),
          cgstAmount: parseNumber(r.cgstAmount || r.cgst_amount || r.cgst || 0),
          sgstRate: parseNumber(r.sgstRate || r.sgst_rate || 0),
          sgstAmount: parseNumber(r.sgstAmount || r.sgst_amount || r.sgst || 0),
          igstRate: parseNumber(r.igstRate || r.igst_rate || 0),
          igstAmount: parseNumber(r.igstAmount || r.igst_amount || r.igst || 0),
          gstAmount: parseNumber(r.gstAmount || r.gst_amount || 0),
          totalAmount: parseNumber(r.totalAmount || r.total_amount || r.total || 0),
          platform: (r.platform as Platform) || 'flipkart',
          invoiceNumber: String(r.invoiceNumber || r.invoice_number || ''),
          returnType: r.returnType as StandardizedRecord['returnType'] || 'B2CS',
        };
      } catch (err) {
        errors.push(`Record ${i + 1}: ${err instanceof Error ? err.message : 'Parse error'}`);
        return null;
      }
    }).filter(Boolean) as StandardizedRecord[];

    const summary = calculateSummary(records);
    return { records, summary, errors };
  } catch {
    return { records: [], summary: createEmptySummary(), errors: ['Invalid JSON data'] };
  }
}

// ============================================
// Export to Excel
// ============================================

export function exportToExcel(records: StandardizedRecord[], filename: string): void {
  const wsData = records.map((r) => ({
    'Order ID': r.orderId,
    'Date': r.date,
    'SKU': r.sku,
    'Product Name': r.productName,
    'Quantity': r.quantity,
    'State': r.state,
    'State Code': r.stateCode,
    'HSN Code': r.hsnCode,
    'Taxable Amount': r.taxableAmount,
    'CGST Rate': r.cgstRate,
    'CGST Amount': r.cgstAmount,
    'SGST Rate': r.sgstRate,
    'SGST Amount': r.sgstAmount,
    'IGST Rate': r.igstRate,
    'IGST Amount': r.igstAmount,
    'Total GST': r.gstAmount,
    'Total Amount': r.totalAmount,
    'Platform': r.platform,
    'Invoice Number': r.invoiceNumber,
    'Return Type': r.returnType,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 30 }, { wch: 8 },
    { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 10 },
    { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
    { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 18 }, { wch: 10 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'GST Data');
  XLSX.writeFile(wb, filename);
}

// ============================================
// Comparison Engine
// ============================================

export function compareDatasets(
  oldRecords: StandardizedRecord[],
  newRecords: StandardizedRecord[]
): {
  missingInNew: StandardizedRecord[];
  missingInOld: StandardizedRecord[];
  amountMismatches: Array<{
    orderId: string;
    field: string;
    oldValue: number;
    newValue: number;
    difference: number;
  }>;
  summary: {
    totalMismatches: number;
    missingInNewCount: number;
    missingInOldCount: number;
    amountMismatchCount: number;
    totalDifferenceValue: number;
  };
} {
  const oldMap = new Map(oldRecords.map((r) => [r.orderId, r]));
  const newMap = new Map(newRecords.map((r) => [r.orderId, r]));

  const missingInNew = oldRecords.filter((r) => !newMap.has(r.orderId));
  const missingInOld = newRecords.filter((r) => !oldMap.has(r.orderId));

  const amountMismatches: Array<{
    orderId: string;
    field: string;
    oldValue: number;
    newValue: number;
    difference: number;
  }> = [];

  const fieldsToCompare: Array<{ key: keyof StandardizedRecord; label: string }> = [
    { key: 'taxableAmount', label: 'Taxable Amount' },
    { key: 'cgstAmount', label: 'CGST Amount' },
    { key: 'sgstAmount', label: 'SGST Amount' },
    { key: 'igstAmount', label: 'IGST Amount' },
    { key: 'gstAmount', label: 'Total GST' },
    { key: 'totalAmount', label: 'Total Amount' },
  ];

  for (const [orderId, oldRecord] of oldMap) {
    const newRecord = newMap.get(orderId);
    if (!newRecord) continue;

    for (const { key, label } of fieldsToCompare) {
      const oldVal = oldRecord[key] as number;
      const newVal = newRecord[key] as number;
      const diff = Math.round((newVal - oldVal) * 100) / 100;

      if (Math.abs(diff) > 0.01) {
        amountMismatches.push({
          orderId,
          field: label,
          oldValue: oldVal,
          newValue: newVal,
          difference: diff,
        });
      }
    }
  }

  const totalDifferenceValue = amountMismatches.reduce(
    (sum, m) => sum + Math.abs(m.difference),
    0
  );

  return {
    missingInNew,
    missingInOld,
    amountMismatches,
    summary: {
      totalMismatches: missingInNew.length + missingInOld.length + amountMismatches.length,
      missingInNewCount: missingInNew.length,
      missingInOldCount: missingInOld.length,
      amountMismatchCount: amountMismatches.length,
      totalDifferenceValue: Math.round(totalDifferenceValue * 100) / 100,
    },
  };
}
