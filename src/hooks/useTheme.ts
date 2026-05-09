import { useEffect } from 'react';
import { useSettingsStore } from '@/store';

/**
 * Hook to initialize and apply theme on mount
 */
export function useTheme() {
  const { theme, applyTheme, setTheme, toggleTheme } = useSettingsStore();

  useEffect(() => {
    applyTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyTheme]);

  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return { theme, isDark, setTheme, toggleTheme };
}
