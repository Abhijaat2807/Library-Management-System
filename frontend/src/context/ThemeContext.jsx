// Create src/context/ThemeContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Get initial theme from localStorage or default to 'light'
  const getInitialTheme = () => {
    try {
      const savedTheme = localStorage.getItem('library-theme');
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
        return savedTheme;
      }
      // Check system preference if no saved theme
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      return 'light';
    } catch (error) {
      console.error('Error reading theme from localStorage:', error);
      return 'light';
    }
  };

  const [theme, setTheme] = useState(getInitialTheme);

  // Add this function inside the ThemeProvider component
  const saveThemeToUserProfile = async (newTheme) => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch('http://localhost:5000/api/auth/update-theme', {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ theme: newTheme })
        });
      }
    } catch (error) {
      console.error('Error saving theme to user profile:', error);
    }
  };

  // Apply theme to document and save to localStorage
  useEffect(() => {
    try {
      // Apply theme to document
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      // Save theme preference to localStorage
      localStorage.setItem('library-theme', theme);
      
      console.log(`Theme changed to: ${theme}`);
    } catch (error) {
      console.error('Error saving theme to localStorage:', error);
    }
  }, [theme]);

  // Listen for system theme changes (optional)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e) => {
      // Only auto-switch if user hasn't manually set a preference
      const savedTheme = localStorage.getItem('library-theme');
      if (!savedTheme) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  // Modify the toggleTheme function
  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    // Optional: Save to user profile
    await saveThemeToUserProfile(newTheme);
  };

  // Also update setLightTheme and setDarkTheme
  const setLightTheme = async () => {
    setTheme('light');
    await saveThemeToUserProfile('light');
  };

  const setDarkTheme = async () => {
    setTheme('dark');
    await saveThemeToUserProfile('dark');
  };

  const value = {
    theme,
    toggleTheme,
    setLightTheme,
    setDarkTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};