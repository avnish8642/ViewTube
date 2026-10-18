import React, { createContext, useContext, useEffect, useState } from 'react';
import { userService } from '../services/api';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    // Default to dark theme for YouTube cinematic vibe
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    const preference = nextTheme;
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        localStorage.setItem('user', JSON.stringify({ ...user, themePreference: preference, effectiveTheme: nextTheme }));
      } catch (error) {
        console.error('Could not update the cached theme preference:', error);
      }
    }
    window.dispatchEvent(new CustomEvent('vidsphere-theme', { detail: { theme: nextTheme, preference } }));
    if (localStorage.getItem('token')) {
      userService.updateThemePreference(preference).catch((error) => {
        console.error('Could not save the theme preference to the account:', error.response?.data?.message || error.message);
      });
    }
  };

  useEffect(() => {
    const handleRemoteTheme = (event) => {
      if (event.detail?.theme === 'light' || event.detail?.theme === 'dark') {
        setTheme(event.detail.theme);
      }
    };
    window.addEventListener('vidsphere-theme', handleRemoteTheme);
    return () => window.removeEventListener('vidsphere-theme', handleRemoteTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
