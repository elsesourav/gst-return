import { create } from 'zustand';
import type { UploadedFile, ProcessedData, HistoryEntry, Platform } from '@/types';
import * as firestoreService from '@/services/firestore';

interface FileState {
  files: UploadedFile[];
  processedData: ProcessedData[];
  history: HistoryEntry[];
  loading: boolean;
  error: string | null;

  // File operations
  fetchFiles: (userId: string, clientId: string, platform?: Platform) => Promise<void>;
  addFile: (file: UploadedFile) => void;
  removeFile: (userId: string, clientId: string, fileId: string) => Promise<void>;

  // Processed data operations
  fetchProcessedData: (userId: string, clientId: string, platform?: Platform) => Promise<void>;
  addProcessedData: (data: ProcessedData) => void;
  removeProcessedData: (userId: string, clientId: string, processedId: string) => Promise<void>;

  // History operations
  fetchHistory: (userId: string, clientId: string, platform?: Platform) => Promise<void>;
  addHistory: (entry: HistoryEntry) => void;
  removeHistory: (userId: string, clientId: string, historyId: string) => Promise<void>;

  // Clear state
  clearState: () => void;
}

export const useFileStore = create<FileState>((set) => ({
  files: [],
  processedData: [],
  history: [],
  loading: false,
  error: null,

  fetchFiles: async (userId, clientId, platform) => {
    try {
      set({ loading: true, error: null });
      const files = await firestoreService.getFiles(userId, clientId, platform);
      set({ files, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch files';
      set({ error: message, loading: false });
    }
  },

  addFile: (file) => {
    set((state) => ({ files: [file, ...state.files] }));
  },

  removeFile: async (userId, clientId, fileId) => {
    try {
      await firestoreService.deleteFileMetadata(userId, clientId, fileId);
      set((state) => ({
        files: state.files.filter((f) => f.id !== fileId),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete file';
      set({ error: message });
    }
  },

  fetchProcessedData: async (userId, clientId, platform) => {
    try {
      set({ loading: true, error: null });
      const processedData = await firestoreService.getProcessedData(userId, clientId, platform);
      set({ processedData, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch processed data';
      set({ error: message, loading: false });
    }
  },

  addProcessedData: (data) => {
    set((state) => ({ processedData: [data, ...state.processedData] }));
  },

  removeProcessedData: async (userId, clientId, processedId) => {
    try {
      await firestoreService.deleteProcessedData(userId, clientId, processedId);
      set((state) => ({
        processedData: state.processedData.filter((p) => p.id !== processedId),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete processed data';
      set({ error: message });
    }
  },

  fetchHistory: async (userId, clientId, platform) => {
    try {
      set({ loading: true, error: null });
      const history = await firestoreService.getHistory(userId, clientId, platform);
      set({ history, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch history';
      set({ error: message, loading: false });
    }
  },

  addHistory: (entry) => {
    set((state) => ({ history: [entry, ...state.history] }));
  },

  removeHistory: async (userId, clientId, historyId) => {
    try {
      await firestoreService.deleteHistoryEntry(userId, clientId, historyId);
      set((state) => ({
        history: state.history.filter((h) => h.id !== historyId),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete history';
      set({ error: message });
    }
  },

  clearState: () => {
    set({ files: [], processedData: [], history: [], loading: false, error: null });
  },
}));
