import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('medstock_token') || null);
  const [loading, setLoading] = useState(true);
  const [isSetupRequired, setIsSetupRequired] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if database is empty & needs first admin setup
        const setupRes = await api.checkSetupStatus();
        setIsSetupRequired(setupRes.isSetupRequired);

        if (token) {
          const profile = await api.getMe();
          setUser(profile.user);
        }
      } catch (err) {
        console.warn('Auth initialization warning:', err.message);
        localStorage.removeItem('medstock_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    localStorage.setItem('medstock_token', res.token);
    setToken(res.token);
    setUser(res.user);
    setIsSetupRequired(false);
    return res;
  };

  const register = async (formData) => {
    const res = await api.register(formData);
    localStorage.setItem('medstock_token', res.token);
    setToken(res.token);
    setUser(res.user);
    setIsSetupRequired(false);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('medstock_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isSetupRequired,
        login,
        register,
        logout,
        isAdmin: user?.role === 'admin'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
