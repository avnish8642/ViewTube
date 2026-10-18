import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

const getDeviceId = () => {
  const existing = localStorage.getItem('vidsphere-device-id');
  if (existing && /^[a-zA-Z0-9-]{24,128}$/.test(existing)) return existing;
  const id = window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : Array.from(window.crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('');
  localStorage.setItem('vidsphere-device-id', id);
  return id;
};

const applyTheme = (user) => {
  if (user?.effectiveTheme) {
    window.dispatchEvent(new CustomEvent('vidsphere-theme', {
      detail: { theme: user.effectiveTheme, preference: user.themePreference || 'auto' },
    }));
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize and verify session
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const res = await authService.getMe();
          if (res.data?.success && res.data?.user?.email === 'aarav@viewtube.io') {
            setUser(res.data.user);
            applyTheme(res.data.user);
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
          }
        } catch (err) {
          console.warn('Session verification failed, logging out:', err.message);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
        }
      }
      if (!localStorage.getItem('token')) {
        try {
          const response = await authService.getDefaultAccountSession();
          if (response.data?.success) {
            storeSession(response.data);
          } else {
            throw new Error(response.data?.message || 'Could not start the default account session.');
          }
        } catch (error) {
          console.error('Could not start the default Aarav account:', error.response?.data?.message || error.message);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  useEffect(() => {
    const handleThemeChange = (event) => {
      if (!event.detail?.preference) return;
      setUser((current) => current ? { ...current, themePreference: event.detail.preference, effectiveTheme: event.detail.theme } : current);
    };
    window.addEventListener('vidsphere-theme', handleThemeChange);
    return () => window.removeEventListener('vidsphere-theme', handleThemeChange);
  }, []);

  const storeSession = (data) => {
    const { token: receivedToken, user: receivedUser } = data;
    localStorage.setItem('token', receivedToken);
    localStorage.setItem('user', JSON.stringify(receivedUser));
    setToken(receivedToken);
    setUser(receivedUser);
    applyTheme(receivedUser);
  };

  const login = async (identifier, password) => {
    const res = await authService.login({ identifier, password, deviceId: getDeviceId() });
    if (res.data?.success) {
      if (!res.data.otpRequired) storeSession(res.data);
      return res.data;
    }
    throw new Error(res.data?.message || 'Login failed');
  };

  const verifyLoginOtp = async (challengeId, code, rememberDevice = true) => {
    const response = await authService.verifyLoginOtp({ challengeId, code, rememberDevice });
    if (response.data?.success) storeSession(response.data);
    return response.data;
  };

  const register = async (userData) => {
    const res = await authService.register(userData);
    if (res.data?.success) {
      storeSession(res.data);
      return res.data;
    }
    throw new Error(res.data?.message || 'Registration failed');
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: Boolean(user && token),
        login,
        verifyLoginOtp,
        register,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
