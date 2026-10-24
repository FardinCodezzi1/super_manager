import { createContext, useContext, useState, useEffect } from 'react';
import { THEME_PALETTES } from '../constants/themePalettes';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeConfig, setThemeConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('mm_theme_config');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return { mode: 'dark', preset: 'indigo' };
  });

  useEffect(() => {
    const p = THEME_PALETTES[themeConfig.preset] || THEME_PALETTES.indigo;
    const root = document.documentElement;
    root.style.setProperty('--primary', p.primary);
    root.style.setProperty('--primary-hover', p.hover);
    root.style.setProperty('--primary-soft', p.soft);
    root.style.setProperty('--primary-border', p.border);
    root.style.setProperty('--primary-text', p.text);
    root.setAttribute('data-theme-mode', themeConfig.mode);

    const metaTheme = document.getElementById('meta-theme-color');
    if (metaTheme) {
      metaTheme.setAttribute('content', p.primary);
    }

    try {
      localStorage.setItem('mm_theme_config', JSON.stringify(themeConfig));
    } catch {
      // ignore
    }
  }, [themeConfig]);

  const toggleMode = () => {
    setThemeConfig((prev) => ({
      ...prev,
      mode: prev.mode === 'dark' ? 'light' : 'dark',
    }));
  };

  const setPreset = (presetKey) => {
    if (THEME_PALETTES[presetKey]) {
      setThemeConfig((prev) => ({ ...prev, preset: presetKey }));
    }
  };

  return (
    <ThemeContext.Provider value={{ themeConfig, toggleMode, setPreset, palettes: THEME_PALETTES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
