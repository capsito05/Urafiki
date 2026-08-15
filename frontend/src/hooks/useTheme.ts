import { useCallback, useEffect, useState } from 'react';
import { THEMES, applyTheme } from '../theme';

const STORAGE_KEY = 'app-theme-id';

export function useTheme() {
  const [themeId, setThemeId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) ?? 'noir';
  });

  const currentTheme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  const setTheme = useCallback((id: string) => {
    setThemeId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  return { theme: currentTheme, themes: THEMES, setTheme };
}
