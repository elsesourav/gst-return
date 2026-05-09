import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, FileJson, X, AlertCircle } from 'lucide-react';
import { cn, formatFileSize } from '@/utils';
import { Button } from '@/components/ui';
import type { FileType } from '@/types';

interface UploadedFileInfo {
  file: File;
  type: FileType;
  id: string;
}

interface FileUploadPanelProps {
  onFilesReady: (files: UploadedFileInfo[]) => void;
  isProcessing: boolean;
}

export function FileUploadPanel({ onFilesReady, isProcessing }: FileUploadPanelProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileInfo[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFileInfo[] = acceptedFiles.map((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let type: FileType = 'sales_report';

      if (ext === 'json') {
        type = 'json_data';
      } else if (
        file.name.toLowerCase().includes('gst') ||
        file.name.toLowerCase().includes('tax')
      ) {
        type = 'gst_report';
      }

      return {
        file,
        type,
        id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
      };
    });

    setUploadedFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'application/json': ['.json'],
    },
    disabled: isProcessing,
  });

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFileType = (id: string, type: FileType) => {
    setUploadedFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, type } : f))
    );
  };

  const handleGenerate = () => {
    if (uploadedFiles.length === 0) return;
    onFilesReady(uploadedFiles);
  };

  const getFileIcon = (type: FileType) => {
    switch (type) {
      case 'json_data':
        return <FileJson className="w-5 h-5 text-yellow-500" />;
      default:
        return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
    }
  };

  const getTypeLabel = (type: FileType) => {
    switch (type) {
      case 'sales_report': return 'Sales Report';
      case 'gst_report': return 'GST/Tax Report';
      case 'json_data': return 'JSON Data';
      default: return 'Unknown';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-surface-900 flex items-center gap-2">
        <Upload className="w-5 h-5 text-brand-600" />
        Upload Files
      </h3>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
          isDragActive
            ? 'border-brand-500 bg-brand-50 scale-[1.01]'
            : 'border-surface-300 hover:border-brand-400 hover:bg-surface-50',
          isProcessing && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        <Upload
          className={cn(
            'w-10 h-10 mx-auto mb-3 transition-colors',
            isDragActive ? 'text-brand-500' : 'text-surface-400'
          )}
        />
        <p className="text-sm font-medium text-surface-700 mb-1">
          {isDragActive ? 'Drop files here...' : 'Drag & drop files here'}
        </p>
        <p className="text-xs text-surface-500">
          Excel (.xlsx, .xls), CSV (.csv), or JSON (.json)
        </p>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-surface-50 border border-surface-200 animate-fade-in"
            >
              {getFileIcon(f.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-900 truncate">
                  {f.file.name}
                </p>
                <p className="text-xs text-surface-500">{formatFileSize(f.file.size)}</p>
              </div>

              <select
                value={f.type}
                onChange={(e) => updateFileType(f.id, e.target.value as FileType)}
                className="text-xs rounded-lg border border-surface-200 bg-surface-0 px-2 py-1 text-surface-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="sales_report">Sales Report</option>
                <option value="gst_report">GST Report</option>
                <option value="json_data">JSON Data</option>
              </select>

              <button
                onClick={() => removeFile(f.id)}
                className="p-1 rounded text-surface-400 hover:text-danger-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Generate Button */}
      {uploadedFiles.length > 0 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-surface-500">
            {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} ready
          </p>
          <Button onClick={handleGenerate} isLoading={isProcessing}>
            ⚡ Generate Report
          </Button>
        </div>
      )}
    </div>
  );
}
