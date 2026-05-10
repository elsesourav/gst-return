import * as firestoreService from "@/services/firestore";
import type { Client } from "@/types";
import { create } from "zustand";

interface ClientState {
  clients: Client[];
  selectedClient: Client | null;
  loading: boolean;
  error: string | null;
  fetchClients: (userId: string) => Promise<void>;
  createClient: (
    userId: string,
    name: string,
    gstNumber?: string,
  ) => Promise<Client>;
  updateClient: (
    userId: string,
    clientId: string,
    name: string,
    gstNumber?: string,
  ) => Promise<void>;
  deleteClient: (userId: string, clientId: string) => Promise<void>;
  selectClient: (client: Client | null) => void;
}

export const useClientStore = create<ClientState>((set, get) => ({
  clients: [],
  selectedClient: null,
  loading: false,
  error: null,

  fetchClients: async (userId: string) => {
    try {
      set({ loading: true, error: null });
      const clients = await firestoreService.getClients(userId);
      set({ clients, loading: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch clients";
      set({ error: message, loading: false });
    }
  },

  createClient: async (userId: string, name: string, gstNumber?: string) => {
    try {
      set({ loading: true, error: null });
      const client = await firestoreService.createClient(
        userId,
        name,
        gstNumber,
      );
      set((state) => ({
        clients: [client, ...state.clients],
        loading: false,
      }));
      return client;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create client";
      set({ error: message, loading: false });
      throw error;
    }
  },

  updateClient: async (
    userId: string,
    clientId: string,
    name: string,
    gstNumber?: string,
  ) => {
    try {
      set({ loading: true, error: null });
      await firestoreService.updateClient(userId, clientId, name, gstNumber);
      set((state) => ({
        clients: state.clients.map((c) =>
          c.id === clientId
            ? {
                ...c,
                name,
                gstNumber: gstNumber?.trim() || c.gstNumber,
                updatedAt: new Date().toISOString(),
              }
            : c,
        ),
        selectedClient:
          state.selectedClient?.id === clientId
            ? {
                ...state.selectedClient,
                name,
                gstNumber: gstNumber?.trim() || state.selectedClient.gstNumber,
                updatedAt: new Date().toISOString(),
              }
            : state.selectedClient,
        loading: false,
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update client";
      set({ error: message, loading: false });
      throw error;
    }
  },

  deleteClient: async (userId: string, clientId: string) => {
    try {
      set({ loading: true, error: null });
      await firestoreService.deleteClient(userId, clientId);
      set((state) => ({
        clients: state.clients.filter((c) => c.id !== clientId),
        selectedClient:
          state.selectedClient?.id === clientId ? null : state.selectedClient,
        loading: false,
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete client";
      set({ error: message, loading: false });
      throw error;
    }
  },

  selectClient: (client) => {
    set({ selectedClient: client });
  },
}));
