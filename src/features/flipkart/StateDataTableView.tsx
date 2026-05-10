import { Badge } from "@/components/ui";
import { formatCurrency } from "@/utils";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { STATES } from "./gstr-parser";

export interface SalesTableProps {
  data: Array<{
    state: string;
    hsnCode: string;
    totalTaxableValue: number;
    totalGSTAmount: number;
  }>;
  title: string;
  myStateName?: string;
}

export function SalesDataTableView({ data, title, myStateName }: SalesTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return data
      .filter((item) => item.state.toLowerCase().includes(term))
      .sort((a, b) => a.state.localeCompare(b.state));
  }, [data, searchTerm]);

  const totals = useMemo(() => ({
    taxableValue: filteredData.reduce((acc, item) => acc + item.totalTaxableValue, 0),
  }), [filteredData]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-surface-900">{title}</h3>
        <Badge variant="success">{filteredData.length} States</Badge>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-surface-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-surface-200 rounded-lg leading-5 bg-surface-0 placeholder-surface-400 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 sm:text-sm transition-colors"
          placeholder="Search state..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="border border-surface-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-50 sticky top-0 shadow-sm z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-600 border-b">
                  State Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-600 border-b">
                  State Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-600 border-b">
                  HSN Code
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-600 border-b">
                  Taxable Value
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 bg-surface-0">
              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-surface-500"
                  >
                    No matching states found
                  </td>
                </tr>
              ) : (
                filteredData.map((item, i) => {
                  const isMyState = myStateName && item.state.toLowerCase() === myStateName.toLowerCase();
                  const stateLookup = STATES[item.state.toLowerCase()];
                  const stateCode = stateLookup ? stateLookup.id : "N/A";
                  return (
                    <tr key={i} className="hover:bg-surface-50 transition-colors">
                      <td className="px-4 py-2 font-mono font-medium text-surface-900">
                        {stateCode}
                      </td>
                      <td className="px-4 py-2 text-surface-700">
                        {isMyState ? (
                          <span className="text-brand-600 font-bold">{item.state}</span>
                        ) : (
                          item.state
                        )}
                      </td>
                      <td className="px-4 py-2 text-surface-600">
                        {item.hsnCode || "—"}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-surface-700">
                        {formatCurrency(item.totalTaxableValue)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredData.length > 0 && (
              <tfoot className="bg-surface-100 sticky bottom-0 border-t-2 border-surface-300">
                <tr>
                  <td colSpan={3} className="px-4 py-2.5 text-xs font-bold text-surface-800">
                    Total
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-surface-900">
                    {formatCurrency(totals.taxableValue)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

export interface GSTRTableProps {
  data: Array<{
    stateCode: string;
    stateName: string;
    txval: number;
    isMyState: boolean;
  }>;
  title: string;
}

export function GSTRDataTableView({ data, title }: GSTRTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return data
      .filter(
        (item) =>
          item.stateName.toLowerCase().includes(term) ||
          item.stateCode.toLowerCase().includes(term),
      )
      .sort((a, b) => a.stateName.localeCompare(b.stateName));
  }, [data, searchTerm]);

  const totals = useMemo(() => ({
    taxableValue: filteredData.reduce((acc, item) => acc + item.txval, 0),
  }), [filteredData]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-surface-900">{title}</h3>
        <Badge variant="success">{filteredData.length} States</Badge>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-surface-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-surface-200 rounded-lg leading-5 bg-surface-0 placeholder-surface-400 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 sm:text-sm transition-colors"
          placeholder="Search state name or code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="border border-surface-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-50 sticky top-0 shadow-sm z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-600 border-b">
                  State Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-600 border-b">
                  State Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-600 border-b">
                  HSN Code
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-600 border-b">
                  Taxable Value
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 bg-surface-0">
              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-surface-500"
                  >
                    No matching states found
                  </td>
                </tr>
              ) : (
                filteredData.map((item, i) => (
                  <tr key={i} className="hover:bg-surface-50 transition-colors">
                    <td className="px-4 py-2 font-mono font-medium text-surface-900">
                      {item.stateCode}
                    </td>
                    <td className="px-4 py-2 text-surface-700">
                      {item.isMyState ? (
                        <span className="text-brand-600 font-bold">{item.stateName}</span>
                      ) : (
                        item.stateName
                      )}
                    </td>
                    <td className="px-4 py-2 text-surface-600">
                      —
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-surface-700">
                      {formatCurrency(item.txval)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredData.length > 0 && (
              <tfoot className="bg-surface-100 sticky bottom-0 border-t-2 border-surface-300">
                <tr>
                  <td colSpan={3} className="px-4 py-2.5 text-xs font-bold text-surface-800">
                    Total
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-surface-900">
                    {formatCurrency(totals.taxableValue)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

export function DocIssueTableView({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-surface-900">
          Document Issued (doc_issue)
        </h3>
        <Badge variant="success">{data.length} Types</Badge>
      </div>

      <div className="border border-surface-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-50 sticky top-0 shadow-sm z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-600 border-b">
                  Doc Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-600 border-b">
                  From
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-600 border-b">
                  To
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-600 border-b">
                  Total
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-600 border-b">
                  Cancelled
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-600 border-b">
                  Net Issued
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 bg-surface-0">
              {data.map((item, i) =>
                item.docs.map((doc: any, j: number) => (
                  <tr
                    key={`${i}-${j}`}
                    className="hover:bg-surface-50 transition-colors"
                  >
                    <td className="px-4 py-2 text-surface-900">
                      {item.doc_typ}
                    </td>
                    <td className="px-4 py-2 font-mono text-surface-700">
                      {doc.from}
                    </td>
                    <td className="px-4 py-2 font-mono text-surface-700">
                      {doc.to}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-surface-700">
                      {doc.totnum}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-surface-700">
                      {doc.cancel}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-surface-700">
                      {doc.net_issue}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function HSNTableView({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-surface-900">
          HSN Summary (hsn)
        </h3>
        <Badge variant="success">{data.length} Items</Badge>
      </div>

      <div className="border border-surface-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-50 sticky top-0 shadow-sm z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-600 border-b">
                  HSN Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-600 border-b">
                  Desc
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-600 border-b">
                  UQC
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-600 border-b">
                  Qty
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-600 border-b">
                  Taxable
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-600 border-b">
                  IGST
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-600 border-b">
                  CGST
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-600 border-b">
                  SGST
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 bg-surface-0">
              {data.map((item, i) => (
                <tr key={i} className="hover:bg-surface-50 transition-colors">
                  <td className="px-4 py-2 font-mono text-surface-900">
                    {item.hsn_sc}
                  </td>
                  <td
                    className="px-4 py-2 text-surface-700 max-w-[150px] truncate"
                    title={item.desc}
                  >
                    {item.desc}
                  </td>
                  <td className="px-4 py-2 text-surface-700">{item.uqc}</td>
                  <td className="px-4 py-2 text-right font-mono text-surface-700">
                    {item.qty}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-surface-700">
                    {formatCurrency(item.txval)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-surface-700">
                    {formatCurrency(item.iamt)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-surface-700">
                    {formatCurrency(item.camt)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-surface-700">
                    {formatCurrency(item.samt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function SupecoTableView({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-surface-900">
          E-Commerce Operators (supeco)
        </h3>
        <Badge variant="success">{data.length} Entries</Badge>
      </div>

      <div className="border border-surface-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-50 sticky top-0 shadow-sm z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-600 border-b">
                  ETIN (GSTIN)
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-600 border-b">
                  Supp. Value
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-600 border-b">
                  IGST
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-600 border-b">
                  CGST
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-surface-600 border-b">
                  SGST
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 bg-surface-0">
              {data.map((item, i) => (
                <tr key={i} className="hover:bg-surface-50 transition-colors">
                  <td className="px-4 py-2 font-mono font-medium text-surface-900">
                    {item.etin}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-surface-700">
                    {formatCurrency(item.suppval)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-surface-700">
                    {formatCurrency(item.igst)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-surface-700">
                    {formatCurrency(item.cgst)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-surface-700">
                    {formatCurrency(item.sgst)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Excel Sheet Viewer — shows rawExcelData as a tabbed sheet view
// ============================================

export interface ExcelSheetViewerProps {
  /** Sheet name → array of row objects */
  sheetsData: Record<string, any[]>;
  title?: string;
}

export function ExcelSheetViewer({ sheetsData, title }: ExcelSheetViewerProps) {
  const sheetNames = Object.keys(sheetsData);
  const [activeSheet, setActiveSheet] = useState(sheetNames[0] || "");
  const [searchTerm, setSearchTerm] = useState("");

  const activeRows = sheetsData[activeSheet] || [];
  const columns = activeRows.length > 0 ? Object.keys(activeRows[0]) : [];

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return activeRows;
    const term = searchTerm.toLowerCase();
    return activeRows.filter((row) =>
      columns.some((col) => String(row[col] ?? "").toLowerCase().includes(term)),
    );
  }, [activeRows, columns, searchTerm]);

  if (sheetNames.length === 0) {
    return (
      <div className="text-center text-surface-500 py-8">No sheets found</div>
    );
  }

  return (
    <div className="space-y-3">
      {title && (
        <h3 className="text-sm font-semibold text-surface-900">{title}</h3>
      )}

      {/* Sheet tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-surface-200">
        {sheetNames.map((name) => (
          <button
            key={name}
            onClick={() => {
              setActiveSheet(name);
              setSearchTerm("");
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-t-lg border border-b-0 transition-colors whitespace-nowrap ${
              activeSheet === name
                ? "bg-surface-0 text-brand-600 border-surface-200"
                : "bg-surface-50 text-surface-500 border-transparent hover:text-surface-700 hover:bg-surface-100"
            }`}
          >
            {name}
            <span className="ml-1.5 text-[10px] text-surface-400">
              ({sheetsData[name].length})
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-surface-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-surface-200 rounded-lg leading-5 bg-surface-0 placeholder-surface-400 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 sm:text-sm transition-colors"
          placeholder={`Search in "${activeSheet}"...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-xs text-surface-500">
        <span>
          Sheet: <span className="font-semibold text-surface-700">{activeSheet}</span>
        </span>
        <span>{filteredRows.length} / {activeRows.length} rows</span>
      </div>

      {/* Table */}
      <div className="border border-surface-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto h-[70vh] overflow-y-auto relative">
          <table className="w-full text-sm relative">
            <thead className="bg-surface-50 sticky top-0 shadow-sm z-10">
              <tr>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-surface-500 border-b w-10">
                  #
                </th>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2.5 text-left text-[10px] font-semibold text-surface-600 border-b whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 bg-surface-0">
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="px-4 py-8 text-center text-surface-500"
                  >
                    No data found
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, i) => (
                  <tr key={i} className="hover:bg-surface-50 transition-colors">
                    <td className="px-3 py-1.5 text-[10px] font-mono text-surface-400">
                      {i + 1}
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col}
                        className="px-3 py-1.5 text-xs text-surface-700 whitespace-nowrap max-w-[250px] truncate"
                        title={String(row[col] ?? "")}
                      >
                        {row[col] !== undefined && row[col] !== null && row[col] !== ""
                          ? String(row[col])
                          : "—"}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
