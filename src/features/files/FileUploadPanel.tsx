import { Button } from "@/components/ui";
import { cn, formatFileSize } from "@/utils";
import { FileSpreadsheet, Upload, X, Zap } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface FileUploadPanelProps {
  onGenerateBoth: (salesFile: File | null, gstrFile: File | null) => void;
  isProcessing: boolean;
}

export function FileUploadPanel({
  onGenerateBoth,
  isProcessing,
}: FileUploadPanelProps) {
  const [salesFile, setSalesFile] = useState<File | null>(null);
  const [gstrFile, setGstrFile] = useState<File | null>(null);

  // Sales Report dropzone
  const salesDropzone = useDropzone({
    onDrop: useCallback((files: File[]) => {
      if (files[0]) setSalesFile(files[0]);
    }, []),
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
      "application/json": [".json"],
    },
    multiple: false,
    disabled: isProcessing,
  });

  // GSTR Return Report dropzone
  const gstrDropzone = useDropzone({
    onDrop: useCallback((files: File[]) => {
      if (files[0]) setGstrFile(files[0]);
    }, []),
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
      "application/json": [".json"],
    },
    multiple: false,
    disabled: isProcessing,
  });

  const handleGenerate = () => {
    onGenerateBoth(salesFile, gstrFile);
  };

  const hasFiles = salesFile || gstrFile;

  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold text-surface-900 flex items-center gap-2">
        <Upload className="w-5 h-5 text-brand-600" />
        Upload Reports
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Report Upload */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent-500" />
            <h4 className="text-sm font-semibold text-surface-800">
              Sales Report
            </h4>
          </div>
          <p className="text-xs text-surface-500 pl-4">
            Excel file with <strong>"Sales Report"</strong> and{" "}
            <strong>"Cash Back Report"</strong> sheets
          </p>

          {!salesFile ? (
            <div
              {...salesDropzone.getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
                salesDropzone.isDragActive
                  ? "border-accent-500 bg-accent-50 scale-[1.01]"
                  : "border-surface-300 hover:border-accent-400 hover:bg-surface-50",
                isProcessing && "opacity-50 cursor-not-allowed",
              )}
            >
              <input {...salesDropzone.getInputProps()} />
              <FileSpreadsheet
                className={cn(
                  "w-8 h-8 mx-auto mb-2",
                  salesDropzone.isDragActive
                    ? "text-accent-500"
                    : "text-surface-400",
                )}
              />
              <p className="text-sm font-medium text-surface-700 mb-1">
                {salesDropzone.isDragActive
                  ? "Drop here..."
                  : "Drop Sales Report"}
              </p>
              <p className="text-xs text-surface-500">
                Excel (.xlsx, .xls) or JSON (.json)
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-accent-50 border border-accent-200 animate-fade-in">
              <FileSpreadsheet className="w-5 h-5 text-accent-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800 truncate">
                  {salesFile.name}
                </p>
                <p className="text-xs text-green-900">
                  {formatFileSize(salesFile.size)}
                </p>
              </div>
              <button
                onClick={() => setSalesFile(null)}
                className="p-1 rounded text-surface- hover:text-danger-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* GSTR Return Report Upload */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand-500" />
            <h4 className="text-sm font-semibold text-surface-800">
              GSTR Return Report
            </h4>
          </div>
          <p className="text-xs text-surface-500 pl-4">
            Flipkart GSTR Excel with Sections 7(A), 7(B), 12, 13, etc.
          </p>

          {!gstrFile ? (
            <div
              {...gstrDropzone.getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
                gstrDropzone.isDragActive
                  ? "border-brand-500 bg-brand-50 scale-[1.01]"
                  : "border-surface-300 hover:border-brand-400 hover:bg-surface-50",
                isProcessing && "opacity-50 cursor-not-allowed",
              )}
            >
              <input {...gstrDropzone.getInputProps()} />
              <FileSpreadsheet
                className={cn(
                  "w-8 h-8 mx-auto mb-2",
                  gstrDropzone.isDragActive
                    ? "text-brand-500"
                    : "text-surface-400",
                )}
              />
              <p className="text-sm font-medium text-surface-700 mb-1">
                {gstrDropzone.isDragActive
                  ? "Drop here..."
                  : "Drop GSTR Return Report"}
              </p>
              <p className="text-xs text-surface-500">
                Excel (.xlsx, .xls) or JSON (.json)
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-brand-50 border border-brand-200 animate-fade-in">
              <FileSpreadsheet className="w-5 h-5 text-brand-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-blue-800 truncate">
                  {gstrFile.name}
                </p>
                <p className="text-xs text-blue-900">
                  {formatFileSize(gstrFile.size)}
                </p>
              </div>
              <button
                onClick={() => setGstrFile(null)}
                className="p-1 rounded text-surface-400 hover:text-danger-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Single Generate Button */}
      {hasFiles && (
        <div className="flex items-center justify-between pt-2 border-t border-surface-200">
          <p className="text-xs text-surface-500">
            {salesFile && gstrFile
              ? "2 files ready"
              : salesFile
                ? "Sales Report ready"
                : "GSTR Return Report ready"}
          </p>
          <Button
            onClick={handleGenerate}
            isLoading={isProcessing}
            icon={<Zap className="w-4 h-4" />}
          >
            ⚡ Generate Reports
          </Button>
        </div>
      )}
    </div>
  );
}
