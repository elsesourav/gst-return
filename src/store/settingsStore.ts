import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserSettings } from '@/types';

interface SettingsState extends UserSettings {
  setTheme: (theme: UserSettings['theme']) => void;
  setAutoSave: (autoSave: boolean) => void;
  toggleTheme: () => void;
  applyTheme: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      autoSave: true,

      setTheme: (theme) => {
        set({ theme });
        get().applyTheme();
      },

      setAutoSave: (autoSave) => {
        set({ autoSave });
      },

      toggleTheme: () => {
        const current = get().theme;
        const next = current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light';
        set({ theme: next });
        get().applyTheme();
      },

      applyTheme: () => {
        const { theme } = get();
        const root = document.documentElement;

        if (theme === 'dark') {
          root.classList.add('dark');
        } else if (theme === 'light') {
          root.classList.remove('dark');
        } else {
          // System preference
          if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            root.classList.add('dark');
          } else {
            root.classList.remove('dark');
          }
        }
      },
    }),
    {
      name: 'gst-return-settings',
    }
  )
);
