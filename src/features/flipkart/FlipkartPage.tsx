import { ConfirmDialog } from "@/components/Modal";
import { Badge, Button, Card, EmptyState, Select } from "@/components/ui";
import { AnalyticsPanel } from "@/features/analytics/AnalyticsPanel";
import { FileUploadPanel } from "@/features/files/FileUploadPanel";
import { DataTableViewer, FileViewerModal } from "@/features/files/FileViewer";
import {
  ReportComparisonView,
  SalesAnalyticsCharts,
} from "@/features/flipkart/ReportComparisonView";
import type {
  GSTRProcessingResult,
  GSTRReturnResult,
} from "@/features/flipkart/gstr-parser";
import {
  processGSTRReturnReport,
  STATE_NAMES,
} from "@/features/flipkart/gstr-parser";
import { calculateSummary, exportToExcel } from "@/features/flipkart/parser";
import { fixSheetRange } from "@/features/flipkart/sales-parser";
import {
  buildSalesGSTR1FileName,
  generateGSTR1FromSales,
} from "@/features/flipkart/sales-gstr-generator";
import type { SalesReportResult } from "@/features/flipkart/sales-parser";
import { processSalesReport } from "@/features/flipkart/sales-parser";
import * as firestoreService from "@/services/firestore";
import {
  useAuthStore,
  useClientStore,
  useFileStore,
  useSettingsStore,
} from "@/store";
import type {
  HistoryEntry,
  ProcessedData,
  ProcessingSummary,
  StandardizedRecord,
} from "@/types";
import {
  cn,
  downloadAsFile,
  formatCurrency,
  formatDate,
  formatNumber,
} from "@/utils";
import dayjs from "dayjs";
import {
  BarChart3,
  ChevronLeft,
  Clock,
  Download,
  Eye,
  FileJson,
  FileSpreadsheet,
  GitCompare,
  Menu,
  Save,
  Settings2,
  Table2,
  Trash2,
  Upload,
  WalletMinimal,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  DocIssueTableView,
  ExcelSheetViewer,
  GSTRDataTableView,
  HSNTableView,
  SalesDataTableView,
  SupecoTableView,
} from "./StateDataTableView";
import * as XLSX from "xlsx";

function downloadJsonAsExcel(jsonData: any, fileName: string) {
  const wb = XLSX.utils.book_new();
  
  if (Array.isArray(jsonData)) {
    const ws = XLSX.utils.json_to_sheet(jsonData);
    XLSX.utils.book_append_sheet(wb, ws, "Data");
  } else if (typeof jsonData === "object" && jsonData !== null) {
    let hasSheets = false;
    for (const [key, value] of Object.entries(jsonData)) {
      if (Array.isArray(value)) {
        const ws = XLSX.utils.json_to_sheet(value);
        XLSX.utils.book_append_sheet(wb, ws, key.substring(0, 31));
        hasSheets = true;
      } else if (typeof value === "object" && value !== null) {
        const nestedArray = Object.values(value).find(Array.isArray);
        if (nestedArray) {
          const ws = XLSX.utils.json_to_sheet(nestedArray as any[]);
          XLSX.utils.book_append_sheet(wb, ws, key.substring(0, 31));
          hasSheets = true;
        } else {
          const ws = XLSX.utils.json_to_sheet([value]);
          XLSX.utils.book_append_sheet(wb, ws, key.substring(0, 31));
          hasSheets = true;
        }
      }
    }
    if (!hasSheets) {
       const ws = XLSX.utils.json_to_sheet([jsonData]);
       XLSX.utils.book_append_sheet(wb, ws, "Data");
    }
  }
  
  XLSX.writeFile(wb, fileName);
}

/**
 * Optimize Excel data to fit within Firestore's 1MB document limit.
 * 1. Strip all empty/blank values from every row
 * 2. Check total JSON size
 * 3. If still too large, progressively drop columns from the right until it fits
 */
const MAX_RAW_EXCEL_BYTES = 800_000; // ~800KB safety margin under 1MB

function trimExcelForStorage(sheetsData: Record<string, any[]>): Record<string, any[]> {
  // Step 1: Strip empty values
  const cleaned: Record<string, any[]> = {};
  for (const [sheetName, rows] of Object.entries(sheetsData)) {
    if (!rows.length) continue;
    cleaned[sheetName] = rows.map(row => {
      const slim: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        if (v !== "" && v !== null && v !== undefined) {
          slim[k] = v;
        }
      }
      return slim;
    });
  }

  // Step 2: Check size — if OK, return as-is
  let size = JSON.stringify(cleaned).length;
  if (size <= MAX_RAW_EXCEL_BYTES) return cleaned;

  // Step 3: Progressively drop columns from the right, sheet by sheet
  const result: Record<string, any[]> = {};
  for (const [sheetName, rows] of Object.entries(cleaned)) {
    if (!rows.length) { result[sheetName] = rows; continue; }
    const allCols = Object.keys(rows[0]);
    let keepCount = allCols.length;
    let sheetRows = rows;

    while (keepCount > 2) {
      const currentSize = JSON.stringify(result).length + JSON.stringify(sheetRows).length;
      if (currentSize <= MAX_RAW_EXCEL_BYTES) break;
      keepCount--;
      const keepCols = allCols.slice(0, keepCount);
      sheetRows = rows.map(row => {
        const slim: Record<string, unknown> = {};
        for (const col of keepCols) {
          if (row[col] !== "" && row[col] !== null && row[col] !== undefined) {
            slim[col] = row[col];
          }
        }
        return slim;
      });
    }
    result[sheetName] = sheetRows;
  }
  return result;
}

// Tab types
type Tab = "upload" | "data" | "analytics" | "comparison";

export function FlipkartPage() {
  const { user } = useAuthStore();
  const { clients, selectedClient, selectClient, fetchClients } =
    useClientStore();
  const {
    processedData,
    history,
    fetchProcessedData,
    fetchHistory,
    addProcessedData,
    removeHistory,
  } = useFileStore();
  const { autoSave } = useSettingsStore();
  const navigate = useNavigate();

  // State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("upload");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentRecords, setCurrentRecords] = useState<StandardizedRecord[]>(
    [],
  );
  const [currentSummary, setCurrentSummary] =
    useState<ProcessingSummary | null>(null);
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [viewerData, setViewerData] = useState<StandardizedRecord[] | null>(
    null,
  );
  const [viewerTitle, setViewerTitle] = useState("");
  const [viewerMode, setViewerMode] = useState<"table" | "json" | "excel">("table");
  const [viewerJsonData, setViewerJsonData] = useState<unknown>(null);
  const [viewerExcelData, setViewerExcelData] = useState<Record<string, any[]> | null>(null);
  const [deleteHistoryItem, setDeleteHistoryItem] =
    useState<HistoryEntry | null>(null);
  const [salesResult, setSalesResult] = useState<SalesReportResult | null>(
    null,
  );
  const [salesGstr1Result, setSalesGstr1Result] = useState<{
    result: GSTRReturnResult;
    fileName: string;
  } | null>(null);
  const [gstrResult, setGstrResult] = useState<GSTRProcessingResult | null>(
    null,
  );
  const [showGstrSettings, setShowGstrSettings] = useState(true);
  const [myStateCode, setMyStateCode] = useState("19");
  const [flipkartGSTNo, setFlipkartGSTNo] = useState("19AACCF0683K1CP");
  const previousMonth = dayjs().subtract(1, "month").format("YYYY-MM");
  const [session, setSession] = useState(previousMonth);

  // Fetch data when client changes
  useEffect(() => {
    if (user && !clients.length) {
      fetchClients(user.uid);
    }
  }, [user, clients.length, fetchClients]);

  useEffect(() => {
    if (user && selectedClient) {
      fetchProcessedData(user.uid, selectedClient.id, "flipkart");
      fetchHistory(user.uid, selectedClient.id, "flipkart");
    }
  }, [user, selectedClient, fetchProcessedData, fetchHistory]);

  // All processed records for analytics
  const allRecords = processedData.flatMap((p) => p.records || []);

  // Combined summary
  const combinedSummary =
    allRecords.length > 0 ? calculateSummary(allRecords) : null;

  // Handle both reports processing + save to Firestore
  const handleGenerateBoth = useCallback(
    async (salesFile: File | null, gstrFile: File | null) => {
      if (!user || !selectedClient) {
        toast.error("Please select a client first");
        return;
      }
      if (!salesFile && !gstrFile) {
        toast.error("Please upload at least one file");
        return;
      }

      setIsProcessing(true);
      const toastId = toast.loading("Processing reports...");

      try {
        const gstin = selectedClient.gstNumber || "";
        const fileMetas: import("@/types").SessionFileMeta[] = [];
        const fileIds: string[] = [];

        // ── Sales Report ─────────────────────────────
        let salesRes:
          | import("@/features/flipkart/sales-parser").SalesReportResult
          | null = null;
        let gstr1Res: {
          result: import("@/features/flipkart/gstr-parser").GSTRReturnResult;
          fileName: string;
        } | null = null;

        if (salesFile) {
          let salesRawExcelData: Record<string, any[]> | undefined = undefined;
          try {
            const ab = await salesFile.arrayBuffer();
            const wb = XLSX.read(new Uint8Array(ab), { type: "array", cellDates: true });
            salesRawExcelData = {};
            wb.SheetNames.forEach(name => {
              const sheet = wb.Sheets[name];
              fixSheetRange(sheet);
              const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
              if (rows.length > 0) {
                salesRawExcelData![name] = rows;
              }
            });
            console.log("Sales raw excel sheets:", Object.keys(salesRawExcelData).map(k => `${k}: ${salesRawExcelData![k].length} rows`));
          } catch (e) {
            console.error("Failed to parse raw sales excel", e);
          }

          salesRes = await processSalesReport(salesFile);
          setSalesResult(salesRes);

          // Generate GSTR-1 from Sales data
          const gstr1 = generateGSTR1FromSales(
            salesRes.gstrData,
            myStateCode,
            session,
            gstin || selectedClient.name,
          );
          const gstr1FileName = buildSalesGSTR1FileName(
            gstin || selectedClient.name,
            session,
          );
          gstr1Res = { result: gstr1, fileName: gstr1FileName };
          setSalesGstr1Result(gstr1Res);

          // Save INPUT file (Excel → JSON) to Firestore
          const inputJson = {
            stateData: salesRes.stateData,
            gstrData: salesRes.gstrData,
            totals: salesRes.totals,
          };
          const inputJsonStr = JSON.stringify(inputJson);
          const inputId = await firestoreService.saveSessionFile(
            user.uid,
            selectedClient.id,
            {
              clientId: selectedClient.id,
              platform: "flipkart",
              fileName: `${salesFile.name.replace(/\.[^.]+$/, "")}_input.xlsx`,
              fileType: "sales_input",
              fileSize: inputJsonStr.length,
              jsonData: inputJson,
              rawExcelData: salesRawExcelData ? trimExcelForStorage(salesRawExcelData) : undefined,
              session,
            },
          );
          fileIds.push(inputId);
          fileMetas.push({
            id: inputId,
            fileName: `${salesFile.name.replace(/\.[^.]+$/, "")}_input.json`,
            fileType: "sales_input",
            fileSize: inputJsonStr.length,
          });

          // Save OUTPUT GSTR-1 JSON to Firestore
          const outputJsonStr = JSON.stringify(gstr1);
          const outputId = await firestoreService.saveSessionFile(
            user.uid,
            selectedClient.id,
            {
              clientId: selectedClient.id,
              platform: "flipkart",
              fileName: gstr1FileName,
              fileType: "sales_gstr1_output",
              fileSize: outputJsonStr.length,
              jsonData: gstr1,
              session,
            },
          );
          fileIds.push(outputId);
          fileMetas.push({
            id: outputId,
            fileName: gstr1FileName,
            fileType: "sales_gstr1_output",
            fileSize: outputJsonStr.length,
          });
        }

        // ── GSTR Return Report ────────────────────────
        let gstrRes:
          | import("@/features/flipkart/gstr-parser").GSTRProcessingResult
          | null = null;

        if (gstrFile) {
          let gstrRawExcelData: Record<string, any[]> | undefined = undefined;
          try {
            const ab = await gstrFile.arrayBuffer();
            const wb = XLSX.read(new Uint8Array(ab), { type: "array", cellDates: true });
            gstrRawExcelData = {};
            wb.SheetNames.forEach(name => {
              const sheet = wb.Sheets[name];
              fixSheetRange(sheet);
              const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
              if (rows.length > 0) {
                gstrRawExcelData![name] = rows;
              }
            });
            console.log("GSTR raw excel sheets:", Object.keys(gstrRawExcelData).map(k => `${k}: ${gstrRawExcelData![k].length} rows`));
          } catch (e) {
            console.error("Failed to parse raw gstr excel", e);
          }

          gstrRes = await processGSTRReturnReport(
            gstrFile,
            myStateCode,
            session,
            flipkartGSTNo,
          );
          setGstrResult(gstrRes);

          // Save INPUT file (JSON return file) to Firestore
          const retInputJsonStr = JSON.stringify(gstrRes.result);
          const retInputId = await firestoreService.saveSessionFile(
            user.uid,
            selectedClient.id,
            {
              clientId: selectedClient.id,
              platform: "flipkart",
              fileName: `${gstrFile.name.replace(/\.[^.]+$/, "")}_input.xlsx`,
              fileType: "gstr_input",
              fileSize: retInputJsonStr.length,
              jsonData: gstrRes.result,
              rawExcelData: gstrRawExcelData ? trimExcelForStorage(gstrRawExcelData) : undefined,
              session,
            },
          );
          fileIds.push(retInputId);
          fileMetas.push({
            id: retInputId,
            fileName: gstrFile.name,
            fileType: "gstr_input",
            fileSize: retInputJsonStr.length,
          });

          // Save OUTPUT — processed return summary
          const retOutputJson = {
            fileName: gstrRes.fileName,
            totals: gstrRes.totals,
            b2cs: gstrRes.result.b2cs,
          };
          const retOutputJsonStr = JSON.stringify(retOutputJson);
          const retOutputId = await firestoreService.saveSessionFile(
            user.uid,
            selectedClient.id,
            {
              clientId: selectedClient.id,
              platform: "flipkart",
              fileName: gstrRes.fileName,
              fileType: "gstr_return_output",
              fileSize: retOutputJsonStr.length,
              jsonData: retOutputJson,
              session,
            },
          );
          fileIds.push(retOutputId);
          fileMetas.push({
            id: retOutputId,
            fileName: gstrRes.fileName,
            fileType: "gstr_return_output",
            fileSize: retOutputJsonStr.length,
          });
        }

        // ── History Entry ─────────────────────────────
        const parts: string[] = [];
        if (salesRes)
          parts.push(
            `Sales: ₹${salesRes.totals.totalTaxableValue.toFixed(2)} taxable`,
          );
        if (gstrRes)
          parts.push(
            `Return: ₹${gstrRes.totals.taxableValue.toFixed(2)} taxable`,
          );

        await firestoreService.addHistoryEntry(user.uid, selectedClient.id, {
          clientId: selectedClient.id,
          platform: "flipkart",
          type: "generation",
          title: `Session ${session} — ${[salesFile && "Sales", gstrFile && "GSTR Return"].filter(Boolean).join(" + ")}`,
          description: parts.join(" | "),
          fileIds,
          files: fileMetas,
          metadata: { session, gstin },
        });

        fetchHistory(user.uid, selectedClient.id, "flipkart");
        toast.success("Reports processed & saved! ☁️", { id: toastId });
        setActiveTab("data");
      } catch (error) {
        toast.error(
          `Failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          { id: toastId },
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [user, selectedClient, myStateCode, session, flipkartGSTNo, fetchHistory],
  );

  // Download handlers (separate buttons, no auto-download)
  const handleDownloadSalesReport = () => {
    if (!salesResult || !selectedClient) return;
    downloadAsFile(
      JSON.stringify(salesResult.stateData, null, 2),
      `SalesReport_${selectedClient.name}_${dayjs().format("YYYY-MM-DD")}.json`,
    );
    toast.success("Sales Report downloaded!");
  };

  const handleDownloadSalesGSTR1 = () => {
    if (!salesGstr1Result) return;
    downloadAsFile(
      JSON.stringify(salesGstr1Result.result, null, 0),
      salesGstr1Result.fileName,
    );
    toast.success(`GSTR-1 from Sales downloaded: ${salesGstr1Result.fileName}`);
  };

  const handleDownloadGSTRReturn = () => {
    if (!gstrResult) return;
    downloadAsFile(
      JSON.stringify(gstrResult.result, null, 0),
      gstrResult.fileName,
    );
    toast.success("GSTR Return downloaded!");
  };

  // Save processed results to Firestore only (no Storage — avoids CORS)
  const saveProcessedResults = async (
    records: StandardizedRecord[],
    summary: ProcessingSummary,
  ) => {
    if (!user || !selectedClient) return;

    try {
      const processedEntry: Omit<ProcessedData, "id"> = {
        clientId: selectedClient.id,
        platform: "flipkart",
        batchId: `batch_${Date.now()}`,
        records,
        summary,
        createdAt: new Date().toISOString(),
        storagePath: "",
      };

      const processedId = await firestoreService.saveProcessedData(
        user.uid,
        selectedClient.id,
        processedEntry,
      );

      addProcessedData({ ...processedEntry, id: processedId });

      await firestoreService.addHistoryEntry(user.uid, selectedClient.id, {
        clientId: selectedClient.id,
        platform: "flipkart",
        type: "generation",
        title: `Generated ${formatNumber(records.length)} records`,
        description: `Total: ${formatCurrency(summary.totalAmount)} | GST: ${formatCurrency(summary.totalGST)}`,
        fileIds: [processedId],
      });

      fetchHistory(user.uid, selectedClient.id, "flipkart");
      toast.success("Data saved to cloud ☁️");
    } catch (error) {
      toast.error("Failed to save data");
      console.error("Save error:", error);
    }
  };

  // Handle manual save
  const handleManualSave = () => {
    if (currentRecords.length > 0 && currentSummary) {
      saveProcessedResults(currentRecords, currentSummary);
    }
  };

  // Handle export to Excel
  const handleExportExcel = () => {
    if (currentRecords.length === 0) return;
    const filename = `GST_Report_${selectedClient?.name || "export"}_${dayjs().format("YYYY-MM-DD")}.xlsx`;
    exportToExcel(currentRecords, filename);
    toast.success("Excel exported! 📥");
  };

  // Handle export JSON
  const handleExportJson = () => {
    if (currentRecords.length === 0) return;
    const jsonStr = JSON.stringify(
      { records: currentRecords, summary: currentSummary },
      null,
      2,
    );
    downloadAsFile(jsonStr, `GST_Data_${dayjs().format("YYYY-MM-DD")}.json`);
    toast.success("JSON exported! 📥");
  };

  // View processed data
  const handleViewProcessed = (data: ProcessedData) => {
    setViewerData(data.records);
    setViewerTitle(
      `${formatNumber(data.records.length)} records — ${formatDate(data.createdAt)}`,
    );
    setViewerMode("table");
    setShowFileViewer(true);
  };

  // Delete history entry
  const handleDeleteHistory = async () => {
    if (!user || !selectedClient || !deleteHistoryItem) return;
    try {
      await removeHistory(user.uid, selectedClient.id, deleteHistoryItem.id);
      toast.success("Entry deleted");
    } catch {
      toast.error("Failed to delete");
    }
    setDeleteHistoryItem(null);
  };

  // Group history by date
  const groupedHistory = history.reduce(
    (acc, entry) => {
      const dateKey = formatDate(entry.createdAt, "DD MMM YYYY");
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(entry);
      return acc;
    },
    {} as Record<string, HistoryEntry[]>,
  );

  // Tabs config
  const tabs = [
    {
      id: "upload" as Tab,
      label: "Upload",
      icon: <Upload className="w-4 h-4" />,
    },
    {
      id: "data" as Tab,
      label: "Data",
      icon: <Table2 className="w-4 h-4" />,
      badge: currentRecords.length,
    },
    {
      id: "analytics" as Tab,
      label: "Analytics",
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: "comparison" as Tab,
      label: "Compare",
      icon: <GitCompare className="w-4 h-4" />,
    },
  ];

  const handleLoadHistorySession = async (entry: HistoryEntry) => {
    if (!user || !selectedClient) return;

    let loadedSales = false;
    let loadedGstr = false;

    setSalesResult(null);
    setGstrResult(null);
    setCurrentRecords([]);
    
    const salesFile = entry.files?.find(f => f.fileType === "sales_input");
    const gstrFile = entry.files?.find(f => f.fileType === "gstr_input");

    if (salesFile) {
      const sf = await firestoreService.getSessionFile(user.uid, selectedClient.id, salesFile.id);
      if (sf && sf.jsonData) {
        setSalesResult(sf.jsonData as SalesReportResult);
        loadedSales = true;
      }
    }

    if (gstrFile) {
      const sf = await firestoreService.getSessionFile(user.uid, selectedClient.id, gstrFile.id);
      if (sf && sf.jsonData) {
        const result = sf.jsonData as import("@/features/flipkart/gstr-parser").GSTRReturnResult;
        
        const b2csTableData = (result.b2cs || []).map((row: any) => {
          const stateCode = row.pos ? row.pos.substring(0, 2) : "00";
          return {
            stateCode,
            stateName: STATE_NAMES[stateCode] || row.pos,
            txval: row.txval,
            isMyState: stateCode === myStateCode
          };
        });

        const totals = {
           taxableValue: result.b2cs?.reduce((acc: number, val: any) => acc + (val.txval || 0), 0) || 0,
           integratedTax: result.b2cs?.reduce((acc: number, val: any) => acc + (val.iamt || 0), 0) || 0,
           centralTax: result.b2cs?.reduce((acc: number, val: any) => acc + (val.camt || 0), 0) || 0,
           stateUTTax: result.b2cs?.reduce((acc: number, val: any) => acc + (val.samt || 0), 0) || 0,
        };

        setGstrResult({
          result,
          fileName: gstrFile.fileName,
          b2csTableData,
          totals,
          errors: []
        });
        loadedGstr = true;
      }
    }

    const pd = processedData.find((p) => entry.fileIds.includes(p.id));
    if (pd) {
      setCurrentRecords(pd.records);
      setCurrentSummary(pd.summary);
    }

    if (loadedSales || loadedGstr || pd) {
      toast.success("Session loaded successfully");
      setActiveTab("data");
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    } else {
      toast.error("Could not load session data");
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-lg text-surface-500 hover:bg-surface-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-2">
            <WalletMinimal className="size-10 m-auto text-yellow-500" />
            <div className="flex flex-col items-start justify-center">
              <h1 className="text-xl font-bold text-surface-900">Flipkart</h1>
              <p className="text-xs text-surface-500">GST Processing Module</p>
            </div>
          </div>
        </div>

        {/* Client Selector */}
        <div className="flex items-center gap-3">
          <Select
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
            value={selectedClient?.id || ""}
            onChange={(e) => {
              const client = clients.find((c) => c.id === e.target.value);
              selectClient(client || null);
              setCurrentRecords([]);
              setCurrentSummary(null);
            }}
            placeholder="Select a client"
            className="min-w-[200px]"
          />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg text-surface-500 hover:bg-surface-100 transition-colors lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {!selectedClient ? (
        <EmptyState
          icon={<Zap className="w-16 h-16" />}
          title="Select a Client"
          description="Choose a client from the dropdown above to start processing GST data"
        />
      ) : (
        <div className="flex gap-6">
          {/* Sidebar - History */}
          <aside
            className={cn(
              "w-72 shrink-0 transition-all duration-300",
              sidebarOpen ? "block" : "hidden",
              "hidden lg:block",
            )}
          >
            <Card className="p-4 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-surface-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-600" />
                  History
                </h3>
                <span className="text-xs text-surface-400">
                  {history.length} entries
                </span>
              </div>

              <div className="space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
                {Object.keys(groupedHistory).length === 0 ? (
                  <p className="text-xs text-surface-400 text-center py-4">
                    No history yet
                  </p>
                ) : (
                  Object.entries(groupedHistory).map(([date, entries]) => (
                    <div key={date}>
                      <p className="text-xs font-semibold text-surface-400 uppercase mb-2">
                        {date}
                      </p>
                      <div className="space-y-2">
                        {entries.map((entry) => {
                          // console.log("HISTORY ENTRY FILES (DESKTOP):", entry.id, entry.files);
                          return (
                          <div
                            key={entry.id}
                            className="group p-2.5 rounded-lg bg-surface-50 hover:bg-surface-100 border border-surface-100 transition-colors"
                          >
                            <div className="flex items-start gap-2">
                              <div className="shrink-0 mt-0.5">
                                {entry.type === "generation" ? (
                                  <Zap className="w-3.5 h-3.5 text-accent-500" />
                                ) : entry.type === "upload" ? (
                                  <Upload className="w-3.5 h-3.5 text-brand-500" />
                                ) : (
                                  <FileJson className="w-3.5 h-3.5 text-yellow-500" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-surface-700 truncate">
                                  {entry.title}
                                </p>
                                <p className="text-[10px] text-surface-400 truncate mt-0.5">
                                  {entry.description}
                                </p>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                {entry.type === "generation" && (
                                  <button
                                    onClick={() => handleLoadHistorySession(entry)}
                                    className="p-1 rounded text-surface-400 hover:text-brand-600 transition-colors"
                                    title="View Data"
                                  >
                                    <Eye className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  onClick={() => setDeleteHistoryItem(entry)}
                                  className="p-1 rounded text-surface-400 hover:text-danger-600 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            {entry.files && entry.files.length > 0 && (
                              <div className="mt-2 space-y-1 pl-5">
                                {entry.files.map((f) => {
                                  const isInput =
                                    f.fileType === "sales_input" ||
                                    f.fileType === "gstr_input";
                                  const label =
                                    f.fileType === "sales_input"
                                      ? "📥 Input"
                                      : f.fileType === "gstr_input"
                                        ? "📥 GSTR"
                                        : f.fileType === "sales_gstr1_output"
                                          ? "📤 GSTR-1"
                                          : "📤 Return";
                                  return (
                                    <div
                                      key={f.id}
                                      className="w-full flex items-center justify-between gap-1 text-[10px] px-1.5 py-0.5 rounded hover:bg-surface-200 transition-colors"
                                    >
                                      <div className="flex items-center gap-1 flex-1 min-w-0">
                                        <span
                                          className={cn(
                                            "font-medium shrink-0",
                                            isInput
                                              ? "text-brand-600"
                                              : "text-accent-600",
                                          )}
                                        >
                                          {label}
                                        </span>
                                        <span className="text-surface-500 truncate mx-1" title={f.fileName}>
                                          {f.fileName}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            const sf = await firestoreService.getSessionFile(user!.uid, selectedClient!.id, f.id);
                                            if (sf) {
                                              if (isInput && sf.rawExcelData && Object.keys(sf.rawExcelData).length > 0) {
                                                setViewerData(null);
                                                setViewerJsonData(null);
                                                setViewerExcelData(sf.rawExcelData);
                                                setViewerTitle(`📊 ${f.fileName}`);
                                                setViewerMode("excel");
                                                setShowFileViewer(true);
                                              } else {
                                                setViewerData(null);
                                                setViewerExcelData(null);
                                                setViewerJsonData(sf.jsonData);
                                                setViewerTitle(`${f.fileName}`);
                                                setViewerMode("json");
                                                setShowFileViewer(true);
                                              }
                                            }
                                          }}
                                          className="p-1 rounded text-surface-400 hover:text-brand-600 transition-colors"
                                          title="View File"
                                        >
                                          <Eye className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            const sf = await firestoreService.getSessionFile(user!.uid, selectedClient!.id, f.id);
                                            if (sf) {
                                              if (isInput || f.fileName.endsWith('.xlsx')) {
                                                downloadJsonAsExcel(sf.rawExcelData || sf.jsonData, f.fileName.replace(/\.json$/, '.xlsx'));
                                              } else {
                                                downloadAsFile(JSON.stringify(sf.jsonData, null, 2), sf.fileName);
                                              }
                                              toast.success(`Downloaded: ${sf.fileName}`);
                                            }
                                          }}
                                          className="p-1 rounded text-surface-400 hover:text-accent-600 transition-colors"
                                          title="Download File"
                                        >
                                          <Download className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Tab Navigation */}
            <div className="flex items-center gap-1 p-1 bg-surface-100 rounded-xl overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                    activeTab === tab.id
                      ? "bg-surface-0 text-brand-600 shadow-sm"
                      : "text-surface-500 hover:text-surface-700",
                  )}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.badge ? (
                    <Badge variant="info" className="text-[10px] px-1.5">
                      {formatNumber(tab.badge)}
                    </Badge>
                  ) : null}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="animate-fade-in">
              {/* Upload Tab */}
              {activeTab === "upload" && (
                <div className="space-y-4">
                  {/* GSTR Settings */}
                  <Card className="p-4">
                    <button
                      onClick={() => setShowGstrSettings(!showGstrSettings)}
                      className="flex items-center gap-2 text-sm font-medium text-surface-700 hover:text-surface-900 w-full"
                    >
                      <Settings2 className="w-4 h-4" />
                      GSTR Settings
                      <span className="text-xs text-surface-400 ml-auto">
                        {showGstrSettings ? "▲" : "▼"}
                      </span>
                    </button>
                    {showGstrSettings && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-surface-200">
                        <div>
                          <label className="text-xs font-medium text-surface-600 block mb-1">
                            Session (Month)
                          </label>
                          <input
                            type="month"
                            value={session}
                            onChange={(e) => setSession(e.target.value)}
                            className="w-full rounded-lg border border-surface-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-surface-600 block mb-1">
                            Your State
                          </label>
                          <select
                            value={myStateCode}
                            onChange={(e) => setMyStateCode(e.target.value)}
                            className="w-full rounded-lg border border-surface-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 bg-surface-0"
                          >
                            {Object.entries(STATE_NAMES).map(([code, name]) => (
                              <option key={code} value={code}>
                                {name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-surface-600 block mb-1">
                            Flipkart GST No
                          </label>
                          <input
                            type="text"
                            value={flipkartGSTNo}
                            onChange={(e) => setFlipkartGSTNo(e.target.value)}
                            placeholder="19AACCF0683K1CP"
                            className="w-full rounded-lg border border-surface-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                        </div>
                      </div>
                    )}
                  </Card>
                  <Card className="p-6">
                    <FileUploadPanel
                      onGenerateBoth={handleGenerateBoth}
                      isProcessing={isProcessing}
                    />
                  </Card>
                </div>
              )}

              {/* Data Tab */}
              {activeTab === "data" && (
                <div className="space-y-4">
                  {/* Download buttons for processed results */}
                  {(salesResult || gstrResult) && (
                    <Card className="p-4">
                      <h4 className="text-sm font-semibold text-surface-900 mb-3">
                        📥 Download Generated Files
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {salesGstr1Result && (
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<Download className="w-4 h-4" />}
                            onClick={handleDownloadSalesGSTR1}
                          >
                            GSTR-1 from Sales ({salesGstr1Result.fileName})
                          </Button>
                        )}
                        {gstrResult && (
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<Download className="w-4 h-4" />}
                            onClick={handleDownloadGSTRReturn}
                          >
                            GSTR Return ({gstrResult.fileName})
                          </Button>
                        )}
                      </div>
                    </Card>
                  )}

                  {/* Actions Bar */}
                  {currentRecords.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="success">
                          {formatNumber(currentRecords.length)} records
                        </Badge>
                        {currentSummary && (
                          <>
                            <Badge variant="info">
                              {formatCurrency(currentSummary.totalAmount)}
                            </Badge>
                            <Badge variant="default">
                              GST: {formatCurrency(currentSummary.totalGST)}
                            </Badge>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!autoSave && (
                          <Button
                            size="sm"
                            variant="outline"
                            icon={<Save className="w-4 h-4" />}
                            onClick={handleManualSave}
                          >
                            Save
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<Download className="w-4 h-4" />}
                          onClick={handleExportExcel}
                        >
                          Excel
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<FileJson className="w-4 h-4" />}
                          onClick={handleExportJson}
                        >
                          JSON
                        </Button>
                      </div>
                    </div>
                  )}

                  {salesResult || gstrResult || currentRecords.length > 0 ? (
                    <div className="space-y-6">
                      {currentRecords.length > 0 &&
                        !salesResult &&
                        !gstrResult && (
                          <Card className="p-4">
                            <DataTableViewer
                              data={currentRecords}
                              title="Processed GST Records"
                            />
                          </Card>
                        )}

                      {(salesResult || gstrResult) && (
                        <div
                          className={cn(
                            "grid gap-6",
                            salesResult && gstrResult
                              ? "grid-cols-1 xl:grid-cols-2"
                              : "grid-cols-1",
                          )}
                        >
                          {salesResult && (
                            <Card className="p-4">
                              <SalesDataTableView
                                data={salesResult.stateData}
                                title="Sales Report Data"
                                myStateName={STATE_NAMES[myStateCode]}
                              />
                            </Card>
                          )}
                          {gstrResult && (
                            <Card className="p-4">
                              <GSTRDataTableView
                                data={gstrResult.b2csTableData}
                                title="GSTR Return Data (B2CS)"
                              />
                            </Card>
                          )}
                        </div>
                      )}
                      {/* Additional GSTR Tables */}
                      {gstrResult?.result.doc_issue && (
                        <Card className="p-4">
                          <DocIssueTableView
                            data={gstrResult.result.doc_issue.doc_det}
                          />
                        </Card>
                      )}

                      {gstrResult?.result.hsn && (
                        <Card className="p-4">
                          <HSNTableView data={gstrResult.result.hsn.hsn_b2c} />
                        </Card>
                      )}

                      {gstrResult?.result.supeco && (
                        <Card className="p-4">
                          <SupecoTableView
                            data={gstrResult.result.supeco.clttx}
                          />
                        </Card>
                      )}
                    </div>
                  ) : processedData.length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-surface-700">
                        Previously Processed Data
                      </h3>
                      {processedData.map((pd) => (
                        <Card
                          key={pd.id}
                          hoverable
                          className="p-4 flex items-center justify-between"
                          onClick={() => {
                            setCurrentRecords(pd.records);
                            setCurrentSummary(pd.summary);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <FileSpreadsheet className="w-5 h-5 text-accent-500" />
                            <div>
                              <p className="text-sm font-medium text-surface-900">
                                {formatNumber(pd.records.length)} records
                              </p>
                              <p className="text-xs text-surface-500">
                                {formatCurrency(pd.summary.totalAmount)} total •{" "}
                                {formatDate(pd.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={<Eye className="w-4 h-4" />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewProcessed(pd);
                              }}
                            >
                              View
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={<Table2 className="w-12 h-12" />}
                      title="No Data Yet"
                      description="Upload and process files to see data here"
                      action={
                        <Button onClick={() => setActiveTab("upload")}>
                          Upload Files
                        </Button>
                      }
                    />
                  )}
                </div>
              )}

              {/* Analytics Tab */}
              {activeTab === "analytics" && (
                <div className="space-y-6">
                  <SalesAnalyticsCharts
                    salesResult={salesResult}
                    gstrResult={gstrResult}
                  />
                  <AnalyticsPanel
                    records={
                      currentRecords.length > 0 ? currentRecords : allRecords
                    }
                    summary={currentSummary || combinedSummary}
                  />
                </div>
              )}

              {/* Comparison Tab */}
              {activeTab === "comparison" && (
                <ReportComparisonView
                  salesResult={salesResult}
                  gstrResult={gstrResult}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-80 bg-surface-0 shadow-2xl p-4 animate-slide-in-left overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-surface-900">
                History
              </h3>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:bg-surface-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Same history content */}
            <div className="space-y-4">
              {Object.entries(groupedHistory).map(([date, entries]) => (
                <div key={date}>
                  <p className="text-xs font-semibold text-surface-400 uppercase mb-2">
                    {date}
                  </p>
                  <div className="space-y-2">
                    {entries.map((entry) => {
                      return (
                        <div
                          key={entry.id}
                          className="group p-2.5 rounded-lg bg-surface-50 hover:bg-surface-100 border border-surface-100 transition-colors"
                        >
                          <div className="flex items-start gap-2">
                            <div className="shrink-0 mt-0.5">
                              {entry.type === "generation" ? (
                                <Zap className="w-3.5 h-3.5 text-accent-500" />
                              ) : entry.type === "upload" ? (
                                <Upload className="w-3.5 h-3.5 text-brand-500" />
                              ) : (
                                <FileJson className="w-3.5 h-3.5 text-yellow-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-surface-700 truncate">
                                {entry.title}
                              </p>
                              <p className="text-[10px] text-surface-400 truncate mt-0.5">
                                {entry.description}
                              </p>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              {entry.type === "generation" && (
                                <button
                                  onClick={() => handleLoadHistorySession(entry)}
                                  className="p-1 rounded text-surface-400 hover:text-brand-600 transition-colors"
                                  title="View Data"
                                >
                                  <Eye className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                onClick={() => setDeleteHistoryItem(entry)}
                                className="p-1 rounded text-surface-400 hover:text-danger-600 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          {entry.files && entry.files.length > 0 && (
                            <div className="mt-2 space-y-1 pl-5">
                              {entry.files.map((f) => {
                                const isInput =
                                  f.fileType === "sales_input" ||
                                  f.fileType === "gstr_input";
                                const label =
                                  f.fileType === "sales_input"
                                    ? "📥 Input"
                                    : f.fileType === "gstr_input"
                                      ? "📥 GSTR"
                                      : f.fileType === "sales_gstr1_output"
                                        ? "📤 GSTR-1"
                                        : "📤 Return";
                                return (
                                  <div
                                    key={f.id}
                                    className="w-full flex items-center justify-between gap-1 text-[10px] px-1.5 py-0.5 rounded hover:bg-surface-200 transition-colors"
                                  >
                                    <div className="flex items-center gap-1 flex-1 min-w-0">
                                      <span
                                        className={cn(
                                          "font-medium shrink-0",
                                          isInput
                                            ? "text-brand-600"
                                            : "text-accent-600",
                                        )}
                                      >
                                        {label}
                                      </span>
                                      <span className="text-surface-500 truncate mx-1" title={f.fileName}>
                                        {f.fileName}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          const sf = await firestoreService.getSessionFile(user!.uid, selectedClient!.id, f.id);
                                          if (sf) {
                                            if (isInput && sf.rawExcelData && Object.keys(sf.rawExcelData).length > 0) {
                                              setViewerData(null);
                                              setViewerJsonData(null);
                                              setViewerExcelData(sf.rawExcelData);
                                              setViewerTitle(`📊 ${f.fileName}`);
                                              setViewerMode("excel");
                                              setShowFileViewer(true);
                                            } else {
                                              setViewerData(null);
                                              setViewerExcelData(null);
                                              setViewerJsonData(sf.jsonData);
                                              setViewerTitle(`${f.fileName}`);
                                              setViewerMode("json");
                                              setShowFileViewer(true);
                                            }
                                          }
                                        }}
                                        className="p-1 rounded text-surface-400 hover:text-brand-600 transition-colors"
                                        title="View File"
                                      >
                                        <Eye className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          const sf = await firestoreService.getSessionFile(user!.uid, selectedClient!.id, f.id);
                                          if (sf) {
                                            if (isInput || f.fileName.endsWith('.xlsx')) {
                                              downloadJsonAsExcel(sf.rawExcelData || sf.jsonData, f.fileName.replace(/\.json$/, '.xlsx'));
                                            } else {
                                              downloadAsFile(JSON.stringify(sf.jsonData, null, 2), sf.fileName);
                                            }
                                            toast.success(`Downloaded: ${sf.fileName}`);
                                          }
                                        }}
                                        className="p-1 rounded text-surface-400 hover:text-accent-600 transition-colors"
                                        title="Download File"
                                      >
                                        <Download className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}

      {/* FileViewerModal */}
      <FileViewerModal
        isOpen={showFileViewer}
        onClose={() => setShowFileViewer(false)}
        data={viewerData}
        jsonData={viewerJsonData}
        excelData={viewerExcelData}
        title={viewerTitle}
        mode={viewerMode}
      />

      {/* Delete History Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteHistoryItem}
        onClose={() => setDeleteHistoryItem(null)}
        onConfirm={handleDeleteHistory}
        title="Delete History Entry"
        message="Are you sure you want to delete this history entry?"
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
