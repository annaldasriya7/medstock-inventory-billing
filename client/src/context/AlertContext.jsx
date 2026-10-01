import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const AlertContext = createContext(null);

export const AlertProvider = ({ children }) => {
  const { token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentAlerts, setRecentAlerts] = useState([]);

  const refreshAlerts = async () => {
    if (!token) return;
    try {
      const res = await api.getAlerts('limit=5');
      setUnreadCount(res.unreadCount || 0);
      setRecentAlerts(res.alerts || []);
    } catch (err) {
      console.warn('Failed to fetch alerts:', err.message);
    }
  };

  useEffect(() => {
    refreshAlerts();
    const interval = setInterval(refreshAlerts, 30000); // 30s poll
    return () => clearInterval(interval);
  }, [token]);

  return (
    <AlertContext.Provider
      value={{
        unreadCount,
        recentAlerts,
        refreshAlerts
      }}
    >
      {children}
    </AlertContext.Provider>
  );
};

export const useAlerts = () => useContext(AlertContext);
