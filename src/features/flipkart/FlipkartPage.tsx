import { useState, useEffect, useCallback } from 'react';
import { useAuthStore, useClientStore, useFileStore, useSettingsStore } from '@/store';
import { Button, Card, Select, EmptyState, Badge, Spinner } from '@/components/ui';
import { ConfirmDialog } from '@/components/Modal';
import { FileUploadPanel } from '@/features/files/FileUploadPanel';
import { DataTableViewer, FileViewerModal } from '@/features/files/FileViewer';
import { ComparisonEngine } from '@/features/comparison/ComparisonEngine';
import { AnalyticsPanel } from '@/features/analytics/AnalyticsPanel';
import {
  readExcelFile,
  parseFlipkartSalesReport,
  parseFlipkartGSTReport,
  parseJsonData,
  exportToExcel,
  calculateSummary,
} from '@/features/flipkart/parser';
import { uploadData, getStoragePath } from '@/services/storage';
import * as firestoreService from '@/services/firestore';
import {
  cn,
  formatDate,
  formatRelativeTime,
  formatCurrency,
  formatNumber,
  downloadAsFile,
} from '@/utils';
import {
  ChevronLeft,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileJson,
  Menu,
  Save,
  Trash2,
  X,
  Zap,
  BarChart3,
  GitCompare,
  Upload,
  Table2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import type { StandardizedRecord, ProcessedData, ProcessingSummary, HistoryEntry } from '@/types';

// Tab types
type Tab = 'upload' | 'data' | 'analytics' | 'comparison';

export function FlipkartPage() {
  const { user } = useAuthStore();
  const { clients, selectedClient, selectClient, fetchClients } = useClientStore();
  const { processedData, history, fetchProcessedData, fetchHistory, addProcessedData, removeHistory } = useFileStore();
  const { autoSave } = useSettingsStore();
  const navigate = useNavigate();

  // State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentRecords, setCurrentRecords] = useState<StandardizedRecord[]>([]);
  const [currentSummary, setCurrentSummary] = useState<ProcessingSummary | null>(null);
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [viewerData, setViewerData] = useState<StandardizedRecord[] | null>(null);
  const [viewerTitle, setViewerTitle] = useState('');
  const [viewerMode, setViewerMode] = useState<'table' | 'json'>('table');
  const [deleteHistoryItem, setDeleteHistoryItem] = useState<HistoryEntry | null>(null);

  // Fetch data when client changes
  useEffect(() => {
    if (user && !clients.length) {
      fetchClients(user.uid);
    }
  }, [user, clients.length, fetchClients]);

  useEffect(() => {
    if (user && selectedClient) {
      fetchProcessedData(user.uid, selectedClient.id, 'flipkart');
      fetchHistory(user.uid, selectedClient.id, 'flipkart');
    }
  }, [user, selectedClient, fetchProcessedData, fetchHistory]);

  // All processed records for analytics
  const allRecords = processedData.flatMap((p) => p.records || []);

  // Combined summary
  const combinedSummary = allRecords.length > 0 ? calculateSummary(allRecords) : null;

  // Handle file processing
  const handleFilesReady = useCallback(
    async (files: Array<{ file: File; type: string; id: string }>) => {
      if (!user || !selectedClient) {
        toast.error('Please select a client first');
        return;
      }

      setIsProcessing(true);
      const toastId = toast.loading('Processing files...');

      try {
        let allParsedRecords: StandardizedRecord[] = [];
        const errors: string[] = [];

        for (const fileInfo of files) {
          if (fileInfo.type === 'json_data') {
            const text = await fileInfo.file.text();
            const result = parseJsonData(text);
            allParsedRecords = [...allParsedRecords, ...result.records];
            errors.push(...result.errors);
          } else {
            const sheets = await readExcelFile(fileInfo.file);
            for (const sheetData of sheets) {
              const result =
                fileInfo.type === 'gst_report'
                  ? parseFlipkartGSTReport(sheetData)
                  : parseFlipkartSalesReport(sheetData);
              allParsedRecords = [...allParsedRecords, ...result.records];
              errors.push(...result.errors);
            }
          }
        }

        if (allParsedRecords.length === 0) {
          toast.error('No valid records found in uploaded files', { id: toastId });
          setIsProcessing(false);
          return;
        }

        const summary = calculateSummary(allParsedRecords);
        setCurrentRecords(allParsedRecords);
        setCurrentSummary(summary);

        // Auto-save if enabled
        if (autoSave) {
          await saveProcessedResults(allParsedRecords, summary);
        }

        toast.success(
          `Processed ${formatNumber(allParsedRecords.length)} records successfully! ${
            errors.length > 0 ? `(${errors.length} warnings)` : ''
          }`,
          { id: toastId }
        );

        setActiveTab('data');
      } catch (error) {
        toast.error(
          `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { id: toastId }
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [user, selectedClient, autoSave]
  );

  // Save processed results
  const saveProcessedResults = async (
    records: StandardizedRecord[],
    summary: ProcessingSummary
  ) => {
    if (!user || !selectedClient) return;

    try {
      // Save JSON to storage
      const jsonData = JSON.stringify({ records, summary }, null, 2);
      const storagePath = getStoragePath(
        user.uid,
        selectedClient.id,
        'flipkart',
        'processed',
        `gst_data_${dayjs().format('YYYY-MM-DD_HHmmss')}.json`
      );

      const { downloadURL } = await uploadData(storagePath, jsonData);

      // Save metadata to Firestore
      const processedEntry: Omit<ProcessedData, 'id'> = {
        clientId: selectedClient.id,
        platform: 'flipkart',
        batchId: `batch_${Date.now()}`,
        records,
        summary,
        createdAt: new Date().toISOString(),
        storagePath,
      };

      const processedId = await firestoreService.saveProcessedData(
        user.uid,
        selectedClient.id,
        processedEntry
      );

      addProcessedData({ ...processedEntry, id: processedId });

      // Add history entry
      await firestoreService.addHistoryEntry(user.uid, selectedClient.id, {
        clientId: selectedClient.id,
        platform: 'flipkart',
        type: 'generation',
        title: `Generated ${formatNumber(records.length)} records`,
        description: `Total: ${formatCurrency(summary.totalAmount)} | GST: ${formatCurrency(summary.totalGST)}`,
        fileIds: [processedId],
      });

      // Refresh history
      fetchHistory(user.uid, selectedClient.id, 'flipkart');
      toast.success('Data saved to cloud ☁️');
    } catch (error) {
      toast.error('Failed to save data');
      console.error('Save error:', error);
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
    const filename = `GST_Report_${selectedClient?.name || 'export'}_${dayjs().format('YYYY-MM-DD')}.xlsx`;
    exportToExcel(currentRecords, filename);
    toast.success('Excel exported! 📥');
  };

  // Handle export JSON
  const handleExportJson = () => {
    if (currentRecords.length === 0) return;
    const jsonStr = JSON.stringify(
      { records: currentRecords, summary: currentSummary },
      null,
      2
    );
    downloadAsFile(jsonStr, `GST_Data_${dayjs().format('YYYY-MM-DD')}.json`);
    toast.success('JSON exported! 📥');
  };

  // View processed data
  const handleViewProcessed = (data: ProcessedData) => {
    setViewerData(data.records);
    setViewerTitle(`${formatNumber(data.records.length)} records — ${formatDate(data.createdAt)}`);
    setViewerMode('table');
    setShowFileViewer(true);
  };

  // Delete history entry
  const handleDeleteHistory = async () => {
    if (!user || !selectedClient || !deleteHistoryItem) return;
    try {
      await removeHistory(user.uid, selectedClient.id, deleteHistoryItem.id);
      toast.success('Entry deleted');
    } catch {
      toast.error('Failed to delete');
    }
    setDeleteHistoryItem(null);
  };

  // Group history by date
  const groupedHistory = history.reduce((acc, entry) => {
    const dateKey = formatDate(entry.createdAt, 'DD MMM YYYY');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(entry);
    return acc;
  }, {} as Record<string, HistoryEntry[]>);

  // Tabs config
  const tabs = [
    { id: 'upload' as Tab, label: 'Upload', icon: <Upload className="w-4 h-4" /> },
    { id: 'data' as Tab, label: 'Data', icon: <Table2 className="w-4 h-4" />, badge: currentRecords.length },
    { id: 'analytics' as Tab, label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'comparison' as Tab, label: 'Compare', icon: <GitCompare className="w-4 h-4" /> },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg text-surface-500 hover:bg-surface-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🛒</span>
              <h1 className="text-xl font-bold text-surface-900">Flipkart</h1>
            </div>
            <p className="text-xs text-surface-500 ml-9">GST Processing Module</p>
          </div>
        </div>

        {/* Client Selector */}
        <div className="flex items-center gap-3">
          <Select
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
            value={selectedClient?.id || ''}
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
              'w-72 shrink-0 transition-all duration-300',
              sidebarOpen ? 'block' : 'hidden',
              'hidden lg:block'
            )}
          >
            <Card className="p-4 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-surface-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-600" />
                  History
                </h3>
                <span className="text-xs text-surface-400">{history.length} entries</span>
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
                      <div className="space-y-1.5">
                        {entries.map((entry) => (
                          <div
                            key={entry.id}
                            className="group flex items-start gap-2 p-2 rounded-lg hover:bg-surface-50 transition-colors"
                          >
                            <div className="shrink-0 mt-0.5">
                              {entry.type === 'generation' ? (
                                <FileSpreadsheet className="w-4 h-4 text-accent-500" />
                              ) : entry.type === 'upload' ? (
                                <Upload className="w-4 h-4 text-brand-500" />
                              ) : (
                                <FileJson className="w-4 h-4 text-yellow-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-surface-700 truncate">
                                {entry.title}
                              </p>
                              <p className="text-[10px] text-surface-400 truncate">
                                {entry.description}
                              </p>
                            </div>
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              {entry.type === 'generation' && (
                                <button
                                  onClick={() => {
                                    const pd = processedData.find((p) =>
                                      entry.fileIds.includes(p.id)
                                    );
                                    if (pd) handleViewProcessed(pd);
                                  }}
                                  className="p-1 rounded text-surface-400 hover:text-brand-600 transition-colors"
                                  title="View"
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
                        ))}
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
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                    activeTab === tab.id
                      ? 'bg-surface-0 text-brand-600 shadow-sm'
                      : 'text-surface-500 hover:text-surface-700'
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
              {activeTab === 'upload' && (
                <Card className="p-6">
                  <FileUploadPanel
                    onFilesReady={handleFilesReady}
                    isProcessing={isProcessing}
                  />
                </Card>
              )}

              {/* Data Tab */}
              {activeTab === 'data' && (
                <div className="space-y-4">
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

                  {currentRecords.length > 0 ? (
                    <Card className="p-4">
                      <DataTableViewer
                        data={currentRecords}
                        title="Processed GST Records"
                      />
                    </Card>
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
                                {formatCurrency(pd.summary.totalAmount)} total •{' '}
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
                        <Button onClick={() => setActiveTab('upload')}>
                          Upload Files
                        </Button>
                      }
                    />
                  )}
                </div>
              )}

              {/* Analytics Tab */}
              {activeTab === 'analytics' && (
                <AnalyticsPanel
                  records={currentRecords.length > 0 ? currentRecords : allRecords}
                  summary={currentSummary || combinedSummary}
                />
              )}

              {/* Comparison Tab */}
              {activeTab === 'comparison' && (
                <ComparisonEngine processedDataList={processedData} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-80 bg-surface-0 shadow-2xl p-4 animate-slide-in-left overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-surface-900">History</h3>
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
                  <p className="text-xs font-semibold text-surface-400 uppercase mb-2">{date}</p>
                  <div className="space-y-1.5">
                    {entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start gap-2 p-2 rounded-lg hover:bg-surface-50"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-accent-500 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-surface-700 truncate">{entry.title}</p>
                          <p className="text-[10px] text-surface-400 truncate">{entry.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}

      {/* File Viewer Modal */}
      <FileViewerModal
        isOpen={showFileViewer}
        onClose={() => setShowFileViewer(false)}
        data={viewerData}
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
