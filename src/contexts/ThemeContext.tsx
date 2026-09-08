import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

interface ThemeValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({
  children,
  initialTheme = 'dark'



}: {children: React.ReactNode;initialTheme?: Theme;}) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => setTheme(initialTheme), [initialTheme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme: () => setTheme((t) => t === 'dark' ? 'light' : 'dark') }}>
      
      {children}
    </ThemeContext.Provider>);

}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}