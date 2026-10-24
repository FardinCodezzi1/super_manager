import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { setOnUnauthorizedHandler } from '../services/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('mm_token'));
  const [currentUser, setCurrentUser] = useState(null);
  const [activeMembership, setActiveMembership] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('mm_token');
    setToken(null);
    setCurrentUser(null);
    setActiveMembership(null);
  }, []);

  const refreshMe = useCallback(async () => {
    const curToken = localStorage.getItem('mm_token');
    if (!curToken) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await authService.getMe();
      setCurrentUser(res.user);
      setActiveMembership(res.activeMembership || null);
    } catch {
      // In case token was invalid or expired
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    setOnUnauthorizedHandler(() => {
      logout();
    });
    refreshMe();
  }, [logout, refreshMe]);

  const login = async ({ email, password }) => {
    const res = await authService.login({ email, password });
    localStorage.setItem('mm_token', res.token);
    setToken(res.token);
    setCurrentUser(res.user);
    await refreshMe();
    return res;
  };

  const register = async ({ name, email, password, phone }) => {
    const res = await authService.register({ name, email, password, phone });
    localStorage.setItem('mm_token', res.token);
    setToken(res.token);
    setCurrentUser(res.user);
    await refreshMe();
    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        currentUser,
        activeMembership,
        isLoading,
        login,
        register,
        logout,
        refreshMe,
        setActiveMembership,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
