import * as XLSX from 'xlsx';

// ============================================
// State Mapping (from old b2cs.js)
// ============================================

const STATES: Record<string, { id: string; name: string }> = {
  'jammu & kashmir': { id: '01', name: 'Jammu & Kashmir' },
  'jammu and kashmir': { id: '01', name: 'Jammu & Kashmir' },
  'himachal pradesh': { id: '02', name: 'Himachal Pradesh' },
  'punjab': { id: '03', name: 'Punjab' },
  'chandigarh': { id: '04', name: 'Chandigarh' },
  'uttarakhand': { id: '05', name: 'Uttarakhand' },
  'haryana': { id: '06', name: 'Haryana' },
  'delhi': { id: '07', name: 'Delhi' },
  'rajasthan': { id: '08', name: 'Rajasthan' },
  'uttar pradesh': { id: '09', name: 'Uttar Pradesh' },
  'bihar': { id: '10', name: 'Bihar' },
  'sikkim': { id: '11', name: 'Sikkim' },
  'arunachal pradesh': { id: '12', name: 'Arunachal Pradesh' },
  'nagaland': { id: '13', name: 'Nagaland' },
  'manipur': { id: '14', name: 'Manipur' },
  'mizoram': { id: '15', name: 'Mizoram' },
  'tripura': { id: '16', name: 'Tripura' },
  'meghalaya': { id: '17', name: 'Meghalaya' },
  'assam': { id: '18', name: 'Assam' },
  'west bengal': { id: '19', name: 'West Bengal' },
  'jharkhand': { id: '20', name: 'Jharkhand' },
  'odisha': { id: '21', name: 'Odisha' },
  'chhattisgarh': { id: '22', name: 'Chhattisgarh' },
  'madhya pradesh': { id: '23', name: 'Madhya Pradesh' },
  'gujarat': { id: '24', name: 'Gujarat' },
  'daman & diu': { id: '25', name: 'Daman & Diu' },
  'daman and diu': { id: '25', name: 'Daman & Diu' },
  'dadra & nagar haveli & daman & diu': { id: '26', name: 'Dadra & Nagar Haveli & Daman & Diu' },
  'dadra and nagar haveli and daman and diu': { id: '26', name: 'Dadra & Nagar Haveli & Daman & Diu' },
  'dadra and nagar haveli': { id: '26', name: 'Dadra & Nagar Haveli & Daman & Diu' },
  'dadra & nagar haveli': { id: '26', name: 'Dadra & Nagar Haveli & Daman & Diu' },
  'maharashtra': { id: '27', name: 'Maharashtra' },
  'karnataka': { id: '29', name: 'Karnataka' },
  'goa': { id: '30', name: 'Goa' },
  'lakshdweep': { id: '31', name: 'Lakshdweep' },
  'kerala': { id: '32', name: 'Kerala' },
  'tamil nadu': { id: '33', name: 'Tamil Nadu' },
  'puducherry': { id: '34', name: 'Puducherry' },
  'pondicherry': { id: '34', name: 'Puducherry' },
  'andaman & nicobar islands': { id: '35', name: 'Andaman & Nicobar Islands' },
  'andaman and nicobar islands': { id: '35', name: 'Andaman & Nicobar Islands' },
  'telangana': { id: '36', name: 'Telangana' },
  'andhra pradesh': { id: '37', name: 'Andhra Pradesh' },
  'ladakh': { id: '38', name: 'Ladakh' },
};

const STATE_NAMES: Record<string, string> = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
  '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
  '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
  '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
  '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
  '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam',
  '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
  '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '25': 'Daman & Diu', '26': 'Dadra & Nagar Haveli & Daman & Diu',
  '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa',
  '31': 'Lakshdweep', '32': 'Kerala', '33': 'Tamil Nadu',
  '34': 'Puducherry', '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh',
};

// ============================================
// Types for GSTR output
// ============================================

interface B2CSRow {
  sply_ty: 'INTER' | 'INTRA';
  rt: number;
  typ: string;
  pos: string;
  txval: number;
  iamt?: number;
  camt?: number;
  samt?: number;
  csamt: number;
}

interface DocDetail {
  num: number;
  to: string;
  from: string;
  totnum: number;
  cancel: number;
  net_issue: number;
}

interface HSNRow {
  num: number;
  hsn_sc: string;
  desc: string;
  uqc: string;
  qty: number;
  rt: number;
  txval: number;
  iamt: number;
  camt: number;
  samt: number;
  csamt: number;
}

interface SupecoRow {
  etin: string;
  suppval: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
}

export interface GSTRReturnResult {
  gstin: string;
  fp: string;
  version: string;
  hash: string;
  b2cs: B2CSRow[];
  doc_issue?: { doc_det: Array<{ doc_num: number; doc_typ: string; docs: DocDetail[] }> };
  hsn?: { hsn_b2c: HSNRow[] };
  supeco?: { clttx: SupecoRow[] };
}

export interface GSTRProcessingResult {
  result: GSTRReturnResult;
  fileName: string;
  b2csTableData: Array<{ stateCode: string; stateName: string; txval: number; isMyState: boolean }>;
  totals: { taxableValue: number; integratedTax: number; centralTax: number; stateUTTax: number };
  errors: string[];
}

// ============================================
// Utility functions (ported from utils.js)
// ============================================

type SheetTable = Record<number, Record<string, unknown>>;

function getCellId(id: string): [string | null, number | null] {
  const match = id.match(/^([A-Za-z]+)(\d+)$/);
  if (!match?.[2]) return [null, null];
  return [match[1], Number(match[2])];
}

function getSheetDataToTable(sheet: XLSX.WorkSheet): SheetTable {
  const data: SheetTable = {};
  for (const cellId in sheet) {
    const [id, n] = getCellId(cellId);
    if (id === null || n === null) continue;
    if (!data[n]) data[n] = {};
    data[n][id] = (sheet[cellId] as { v: unknown }).v;
  }
  return data;
}

function ifFindThenGetKey(obj: Record<string, unknown>, value: string): string | null {
  for (const key in obj) {
    if (String(obj[key]).includes(value)) return key;
  }
  return null;
}

function findBestMatching(input: string): { id: string; name: string } | null {
  const normalized = input.toLowerCase().trim();
  if (STATES[normalized]) return STATES[normalized];

  const inputWords = normalized.split(/\s+/);
  let bestMatch: string | null = null;
  let maxMatchCount = 0;

  for (const key of Object.keys(STATES)) {
    const keyWords = key.split(/\s+/);
    let matchCount = 0;
    for (const word of inputWords) {
      if (keyWords.includes(word)) matchCount++;
    }
    if (matchCount > maxMatchCount) {
      maxMatchCount = matchCount;
      bestMatch = key;
    }
  }

  return bestMatch ? STATES[bestMatch] : null;
}

function findStateNameById(id: string): string | null {
  return STATE_NAMES[id] || null;
}

// ============================================
// Core GSTR parsing (ported from b2cs.js)
// ============================================

function getTableSheets(sheets: Record<string, XLSX.WorkSheet>): Record<string, SheetTable> {
  const tableSheets: Record<string, SheetTable> = {};
  for (const name in sheets) {
    tableSheets[name] = getSheetDataToTable(sheets[name]);
  }
  return tableSheets;
}

function ifFindThenGetGstID(tSheets: Record<string, SheetTable>): string {
  const names: string[] = [];
  let gstId = '';

  for (const name in tSheets) {
    if (name.includes('Section 7(A)(2)') || name.includes('Section 7(B)(2)')) {
      names.push(name);
    }
  }

  names.forEach((name) => {
    const tSheet = tSheets[name];
    const tableTitle = tSheet[1];
    if (!tableTitle) return;
    const GSTIN = ifFindThenGetKey(tableTitle, 'GSTIN');
    if (GSTIN && tSheet[2]?.[GSTIN] && !gstId) {
      gstId = String(tSheet[2][GSTIN]);
    }
  });

  return gstId;
}

type B2CSDataMap = Record<string, Record<number, { tax: number; name: string; csamt: number }>>;

function b2csGetByMyState(table: SheetTable, sellerState: string): B2CSDataMap | null {
  const tableTitle = table[1];
  if (!tableTitle) return null;

  const atvName = ifFindThenGetKey(tableTitle, 'Aggregate Taxable Value');
  const cmName = ifFindThenGetKey(tableTitle, 'CESS Amount');
  const cgstName = ifFindThenGetKey(tableTitle, 'CGST');
  const sgstName = ifFindThenGetKey(tableTitle, 'SGST/UT');

  if (!atvName || !cgstName) return null;

  delete table[1];
  const data: B2CSDataMap = {};

  for (const n in table) {
    const row = table[n];
    const tax = +parseFloat(String(row[atvName] || 0)).toFixed(2);
    const csamt = cmName ? +parseFloat(String(row[cmName] || 0)).toFixed(2) : 0;
    const igst = parseFloat(String(row[cgstName] || 0));
    const sgst = sgstName ? parseFloat(String(row[sgstName] || 0)) : 0;

    const stateIDName = findBestMatching(sellerState);
    if (!stateIDName) continue;
    const { id, name } = stateIDName;

    const gstTotal = +parseFloat(String(igst + sgst)).toFixed(2);

    if (!data[id]) {
      data[id] = {};
      data[id][gstTotal] = { tax, name, csamt };
      continue;
    }

    if (!data[id][gstTotal]) {
      data[id][gstTotal] = { tax, name, csamt };
    } else {
      data[id][gstTotal].tax += tax;
      data[id][gstTotal].csamt += csamt;
    }
  }

  return data;
}

function b2csGetByOthersState(table: SheetTable): B2CSDataMap | null {
  const tableTitle = table[1];
  if (!tableTitle) return null;

  const atvName = ifFindThenGetKey(tableTitle, 'Aggregate Taxable Value');
  const dsName = ifFindThenGetKey(tableTitle, 'Delivered State');
  const cmName = ifFindThenGetKey(tableTitle, 'CESS Amount');
  const igstName = ifFindThenGetKey(tableTitle, 'IGST');

  if (!atvName || !dsName || !igstName) return null;

  delete table[1];
  const data: B2CSDataMap = {};

  for (const n in table) {
    const row = table[n];
    const tax = +parseFloat(String(row[atvName] || 0)).toFixed(2);
    const igst = +parseFloat(String(row[igstName] || 0)).toFixed(2);
    const csamt = cmName ? +parseFloat(String(row[cmName] || 0)).toFixed(2) : 0;

    const stateIDName = findBestMatching(String(row[dsName]));
    if (!stateIDName) continue;
    const { id, name } = stateIDName;

    if (!data[id]) {
      data[id] = {};
      data[id][igst] = { tax, name, csamt };
      continue;
    }

    if (!data[id][igst]) {
      data[id][igst] = { tax, name, csamt };
    } else {
      data[id][igst].tax += tax;
      data[id][igst].csamt += csamt;
    }
  }

  return data;
}

function mergeDataWithDetails(
  data: B2CSDataMap,
  myStateCode: string
): { b2cs: B2CSRow[]; totals: { taxableValue: number; integratedTax: number; centralTax: number; stateUTTax: number } } {
  const rows: B2CSRow[] = [];
  let totalTaxableValue = 0;
  let integratedTax = 0;
  let centralTax = 0;
  let stateUTTax = 0;

  for (const sCode in data) {
    const row = data[sCode];
    for (const per in row) {
      const { tax, csamt } = row[+per];
      const iamt = +((tax * +per) / 100).toFixed(2);
      totalTaxableValue += tax;

      if (sCode !== myStateCode) {
        rows.push({ sply_ty: 'INTER', rt: +per, typ: 'OE', pos: sCode, txval: tax, iamt, csamt });
        integratedTax += iamt;
      } else {
        const halfGst = +(iamt / 2).toFixed(2);
        rows.push({ sply_ty: 'INTRA', rt: +per, typ: 'OE', pos: sCode, txval: tax, camt: halfGst, samt: halfGst, csamt });
        centralTax += halfGst;
        stateUTTax += halfGst;
      }
    }
  }

  return {
    b2cs: rows,
    totals: {
      taxableValue: +totalTaxableValue.toFixed(2),
      integratedTax: +integratedTax.toFixed(2),
      centralTax: +centralTax.toFixed(2),
      stateUTTax: +stateUTTax.toFixed(2),
    },
  };
}

function getB2CsData(tSheets: Record<string, SheetTable>, myStateCode: string) {
  let b2csData: B2CSDataMap = {};
  const myStateName = findStateNameById(myStateCode) || 'West Bengal';

  for (const name in tSheets) {
    const tSheet = tSheets[name];
    if (name.includes('Section 7(A)(2)')) {
      const localStateData = b2csGetByMyState(tSheet, myStateName);
      if (localStateData) b2csData = localStateData;
    } else if (name.includes('Section 7(B)(2)')) {
      const othersStateData = b2csGetByOthersState(tSheet);
      if (othersStateData) b2csData = { ...b2csData, ...othersStateData };
    }
  }

  return mergeDataWithDetails(b2csData, myStateCode);
}

function getDocIssue(tSheets: Record<string, SheetTable>) {
  let docIssueTable: SheetTable | null = null;

  for (const name in tSheets) {
    if (name.includes('Section 13 in GSTR-1')) {
      docIssueTable = tSheets[name];
    }
  }

  if (!docIssueTable || !docIssueTable[1]) return null;

  const tableTitle = docIssueTable[1];
  const isfName = ifFindThenGetKey(tableTitle, 'Invoice Series From');
  const istName = ifFindThenGetKey(tableTitle, 'To');
  const tniName = ifFindThenGetKey(tableTitle, 'Total Number of Invoices');
  const ciaName = ifFindThenGetKey(tableTitle, 'Cancelled if any');

  if (!isfName || !istName || !tniName || !ciaName) return null;

  delete docIssueTable[1];
  const data: DocDetail[] = [];
  let i = 1;

  for (const n in docIssueTable) {
    const row = docIssueTable[n];
    const isf = String(row[isfName] || '');
    const ist = String(row[istName] || '');
    const tni = parseInt(String(row[tniName] || 0));
    const cia = parseInt(String(row[ciaName] || 0));

    if (!isf && !ist && !tni && !cia) continue;

    data.push({ num: i++, to: ist, from: isf, totnum: tni, cancel: cia, net_issue: tni - cia });
  }

  if (data.length === 0) return null;

  return {
    doc_issue: {
      doc_det: [{ doc_num: 1, doc_typ: 'Invoices for outward supply', docs: data }],
    },
  };
}

function getHSNData(tSheets: Record<string, SheetTable>) {
  let hsnTable: SheetTable | null = null;

  for (const name in tSheets) {
    if (name.includes('Section 12 in GSTR-1')) {
      hsnTable = tSheets[name];
    }
  }

  if (!hsnTable || !hsnTable[1]) return null;

  const tableTitle = hsnTable[1];
  const hnName = ifFindThenGetKey(tableTitle, 'HSN Number');
  const tqnName = ifFindThenGetKey(tableTitle, 'Total Quantity in Nos');
  const ttvrName = ifFindThenGetKey(tableTitle, 'Total Taxable Value Rs');
  const iarName = ifFindThenGetKey(tableTitle, 'IGST Amount Rs');
  const carName = ifFindThenGetKey(tableTitle, 'CGST Amount Rs');
  const sarName = ifFindThenGetKey(tableTitle, 'SGST Amount Rs');
  const crName = ifFindThenGetKey(tableTitle, 'Cess Rs');

  if (!hnName || !tqnName || !ttvrName || !iarName || !carName || !sarName || !crName) return null;

  delete hsnTable[1];
  const data: HSNRow[] = [];
  let i = 1;

  for (const n in hsnTable) {
    const row = hsnTable[n];
    const hn = String(row[hnName] || '');
    const tqn = parseInt(String(row[tqnName] || 0));
    const ttvr = +parseFloat(String(row[ttvrName] || 0)).toFixed(2);
    const iar = +parseFloat(String(row[iarName] || 0)).toFixed(2);
    const car = +parseFloat(String(row[carName] || 0)).toFixed(2);
    const sar = +parseFloat(String(row[sarName] || 0)).toFixed(2);
    const cr = +parseFloat(String(row[crName] || 0)).toFixed(2);

    if (!hn && !tqn && !ttvr && !iar && !car && !sar && !cr) continue;

    const totalTax = ((iar + car + sar) / ttvr) * 100;
    const tt = +totalTax.toFixed(2);

    data.push({ num: i++, hsn_sc: hn, desc: '', uqc: 'GMS', qty: tqn, rt: tt, txval: ttvr, iamt: iar, camt: car, samt: sar, csamt: cr });
  }

  if (data.length === 0) return null;
  return { hsn: { hsn_b2c: data } };
}

function getSupecoData(tSheets: Record<string, SheetTable>, flipkartGSTNo: string) {
  let supecoTable: SheetTable | null = null;

  for (const name in tSheets) {
    if (name.includes('Section 3 in GSTR-8')) {
      supecoTable = tSheets[name];
    }
  }

  if (!supecoTable || !supecoTable[1]) return null;

  const tableTitle = supecoTable[1];
  const ntvName = ifFindThenGetKey(tableTitle, 'Net Taxable Value');
  const iarName = ifFindThenGetKey(tableTitle, 'IGST Amount Rs');
  const carName = ifFindThenGetKey(tableTitle, 'CGST Amount Rs');
  const sarName = ifFindThenGetKey(tableTitle, 'SGST Amount Rs');

  if (!ntvName || !iarName || !carName || !sarName) return null;

  delete supecoTable[1];
  const data: SupecoRow[] = [];

  for (const n in supecoTable) {
    const row = supecoTable[n];
    const ntv = +parseFloat(String(row[ntvName] || 0)).toFixed(2);
    const iar = +parseFloat(String(row[iarName] || 0)).toFixed(2);
    const car = +parseFloat(String(row[carName] || 0)).toFixed(2);
    const sar = +parseFloat(String(row[sarName] || 0)).toFixed(2);

    if (!ntv && !iar && !car && !sar) continue;

    data.push({ etin: flipkartGSTNo, suppval: ntv, igst: iar, cgst: car, sgst: sar, cess: 0 });
  }

  if (data.length === 0) return null;
  return { supeco: { clttx: data } };
}

// ============================================
// Main GSTR Return Report Processing
// ============================================

export function processGSTRReturnReport(
  file: File,
  myStateCode: string,
  session: string,
  flipkartGSTNo: string
): Promise<GSTRProcessingResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheets = workbook.Sheets;
        const tableSheets = getTableSheets(sheets);
        const errors: string[] = [];

        // Get GST ID from sheets
        const GST_ID = ifFindThenGetGstID(tableSheets);

        // Parse session → mmyy format
        const [yy, mm] = session.split('-');
        const mmyy = `${mm}${yy}`;

        // Get B2CS data
        const { b2cs, totals } = getB2CsData(tableSheets, myStateCode);

        // Get Doc Issue
        const docIssueData = getDocIssue(tableSheets);

        // Get HSN Data
        const hsnData = getHSNData(tableSheets);

        // Get Supeco Data
        const supecoData = getSupecoData(tableSheets, flipkartGSTNo);

        // Build final result
        const result: GSTRReturnResult = {
          gstin: GST_ID,
          fp: mmyy,
          version: 'GST3.2.2',
          hash: 'hash',
          b2cs,
          ...(docIssueData || {}),
          ...(hsnData || {}),
          ...(supecoData || {}),
        };

        // Build table data for UI
        const b2csTableData = b2cs.map((row) => ({
          stateCode: row.pos,
          stateName: STATE_NAMES[row.pos] || 'Unknown',
          txval: row.txval,
          isMyState: row.pos === myStateCode,
        }));

        const fileName = `${GST_ID}_${session}_ES.json`;

        resolve({ result, fileName, b2csTableData, totals, errors });
      } catch (error) {
        reject(new Error(`Failed to process GSTR Return Report: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
}

export { STATE_NAMES, STATES };
