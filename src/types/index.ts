// ============================================
// Core Application Types
// ============================================

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: string;
  updatedAt: string;
  settings: UserSettings;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  autoSave: boolean;
}

export interface Client {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Platform Types
// ============================================

export type Platform = 'flipkart' | 'amazon' | 'meesho';

export interface PlatformConfig {
  id: Platform;
  name: string;
  icon: string;
  color: string;
  gradient: string;
  enabled: boolean;
}

// ============================================
// File & Upload Types
// ============================================

export type FileType = 'sales_report' | 'gst_report' | 'json_data' | 'generated';

export interface UploadedFile {
  id: string;
  clientId: string;
  platform: Platform;
  fileName: string;
  fileType: FileType;
  fileSize: number;
  storagePath: string;
  downloadURL: string;
  uploadedAt: string;
  metadata?: Record<string, unknown>;
}

export interface UploadBatch {
  id: string;
  clientId: string;
  platform: Platform;
  files: UploadedFile[];
  createdAt: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

// ============================================
// Processed Data Types
// ============================================

export interface StandardizedRecord {
  orderId: string;
  date: string;
  sku?: string;
  productName?: string;
  quantity: number;
  state: string;
  stateCode: string;
  hsnCode?: string;
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  gstAmount: number;
  totalAmount: number;
  platform: Platform;
  invoiceNumber?: string;
  returnType?: 'B2B' | 'B2CS' | 'B2CL' | 'HSN';
}

export interface ProcessedData {
  id: string;
  clientId: string;
  platform: Platform;
  batchId: string;
  records: StandardizedRecord[];
  summary: ProcessingSummary;
  createdAt: string;
  storagePath?: string;
}

export interface ProcessingSummary {
  totalRecords: number;
  totalTaxableAmount: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalGST: number;
  totalAmount: number;
  stateWise: StateWiseSummary[];
  monthWise: MonthWiseSummary[];
}

export interface StateWiseSummary {
  state: string;
  stateCode: string;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGST: number;
  totalAmount: number;
  recordCount: number;
}

export interface MonthWiseSummary {
  month: string;
  year: number;
  taxableAmount: number;
  totalGST: number;
  totalAmount: number;
  recordCount: number;
}

// ============================================
// Comparison Types
// ============================================

export interface ComparisonResult {
  id: string;
  clientId: string;
  platform: Platform;
  oldFileId: string;
  newFileId: string;
  missingInNew: StandardizedRecord[];
  missingInOld: StandardizedRecord[];
  amountMismatches: AmountMismatch[];
  summary: ComparisonSummary;
  createdAt: string;
}

export interface AmountMismatch {
  orderId: string;
  field: string;
  oldValue: number;
  newValue: number;
  difference: number;
}

export interface ComparisonSummary {
  totalMismatches: number;
  missingInNewCount: number;
  missingInOldCount: number;
  amountMismatchCount: number;
  totalDifferenceValue: number;
}

// ============================================
// Analytics Types
// ============================================

export type AnalyticsFilter = 'monthly' | 'quarterly' | 'yearly';

export interface ChartDataPoint {
  label: string;
  value: number;
  [key: string]: string | number;
}

// ============================================
// History Types
// ============================================

export interface HistoryEntry {
  id: string;
  clientId: string;
  platform: Platform;
  type: 'upload' | 'generation' | 'comparison' | 'export';
  title: string;
  description: string;
  fileIds: string[];
  createdAt: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// UI Types
// ============================================

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface ConfirmDialogProps extends ModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
}

// ============================================
// Indian States
// ============================================

export const INDIAN_STATES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman & Diu',
  '26': 'Dadra & Nagar Haveli',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh (Old)',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
};

export const STATE_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(INDIAN_STATES).map(([code, name]) => [name.toLowerCase(), code])
);
