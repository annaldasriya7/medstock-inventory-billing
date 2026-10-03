import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

const SAVED_ACCOUNTS_KEY = 'medstock_saved_accounts';
const ACTIVE_TOKEN_KEY = 'medstock_token';

// Helper to safely load saved accounts from device storage
const loadStoredAccounts = () => {
  try {
    const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error parsing saved accounts:', e);
    return [];
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem(ACTIVE_TOKEN_KEY) || null);
  const [savedAccounts, setSavedAccounts] = useState(loadStoredAccounts);
  const [loading, setLoading] = useState(true);
  const [isSetupRequired, setIsSetupRequired] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  // Helper to persist saved accounts list on this device
  const persistSavedAccounts = useCallback((accounts) => {
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts));
    setSavedAccounts(accounts);
  }, []);

  // Save or update an account in the device list
  const saveAccountToDevice = useCallback((userData, authToken) => {
    const userId = userData.id || userData._id;
    const current = loadStoredAccounts();

    // Check if account already exists
    const existingIndex = current.findIndex(
      (a) => a.id === userId || a.email.toLowerCase() === userData.email.toLowerCase()
    );

    const accountEntry = {
      id: userId,
      name: userData.name,
      email: userData.email,
      role: userData.role || 'staff',
      token: authToken,
      lastActive: new Date().toISOString()
    };

    let updatedList;
    if (existingIndex >= 0) {
      updatedList = [...current];
      // Keep existing admin role if previously marked as admin
      const isRoleAdmin = userData.role === 'admin' || updatedList[existingIndex].role === 'admin';
      updatedList[existingIndex] = {
        ...updatedList[existingIndex],
        ...accountEntry,
        role: isRoleAdmin ? 'admin' : accountEntry.role
      };
    } else {
      updatedList = [...current, accountEntry];
    }

    // Always keep Admins pinned at the top
    updatedList.sort((a, b) => {
      if (a.role === 'admin' && b.role !== 'admin') return -1;
      if (a.role !== 'admin' && b.role === 'admin') return 1;
      return new Date(b.lastActive) - new Date(a.lastActive);
    });

    persistSavedAccounts(updatedList);
  }, [persistSavedAccounts]);

  // Initialize Auth on App Launch
  useEffect(() => {
    const initAuth = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('action') === 'logout-all' || searchParams.get('logout') === 'all') {
          localStorage.removeItem(ACTIVE_TOKEN_KEY);
          localStorage.removeItem(SAVED_ACCOUNTS_KEY);
          setToken(null);
          setUser(null);
          setSavedAccounts([]);
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        const setupRes = await api.checkSetupStatus();
        setIsSetupRequired(setupRes.isSetupRequired);

        const currentToken = localStorage.getItem(ACTIVE_TOKEN_KEY);
        if (currentToken) {
          const profile = await api.getMe();
          if (profile?.user) {
            setUser(profile.user);
            saveAccountToDevice(profile.user, currentToken);
          } else {
            throw new Error('User profile empty');
          }
        }
      } catch (err) {
        console.warn('Auth token invalid or expired on startup:', err.message);
        localStorage.removeItem(ACTIVE_TOKEN_KEY);
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, [token, saveAccountToDevice]);

  // Standard Login (adds or updates saved accounts)
  const login = async (email, password) => {
    const res = await api.login({ email, password });
    localStorage.setItem(ACTIVE_TOKEN_KEY, res.token);
    setToken(res.token);
    setUser(res.user);
    setIsSetupRequired(false);
    saveAccountToDevice(res.user, res.token);
    return res;
  };

  // Standard Register (adds or updates saved accounts)
  const register = async (formData) => {
    const res = await api.register(formData);
    localStorage.setItem(ACTIVE_TOKEN_KEY, res.token);
    setToken(res.token);
    setUser(res.user);
    setIsSetupRequired(false);
    saveAccountToDevice(res.user, res.token);
    return res;
  };

  // Switch to a Staff Account without re-entering credentials
  const switchToStaffAccount = async (account) => {
    if (!account.token) {
      throw new Error('No saved session token found for this account. Please log in with password.');
    }

    try {
      localStorage.setItem(ACTIVE_TOKEN_KEY, account.token);
      setToken(account.token);

      // Verify token with backend
      const profile = await api.getMe();
      if (!profile?.user) {
        throw new Error('Account session expired.');
      }

      setUser(profile.user);
      saveAccountToDevice(profile.user, account.token);
      setIsSwitcherOpen(false);
      return { success: true, user: profile.user };
    } catch (err) {
      // If token expired or invalid, keep account in list but require re-auth
      throw new Error(`Session for ${account.name} has expired. Please sign in with password.`);
    }
  };

  // Switch to Admin (Requires Admin password verification)
  const verifyAndSwitchToAdmin = async (adminIdentifier, adminPassword) => {
    const rawIdentifier = (typeof adminIdentifier === 'object' && adminIdentifier !== null)
      ? (adminIdentifier.email || adminIdentifier.name)
      : adminIdentifier;

    const identifier = (rawIdentifier || 'riya@medstock.ai').toString().trim();
    const res = await api.login({ email: identifier, password: adminPassword });
    if (res.user.role !== 'admin') {
      throw new Error('The credentials provided do not have Administrator privileges.');
    }

    localStorage.setItem(ACTIVE_TOKEN_KEY, res.token);
    setToken(res.token);
    setUser(res.user);
    saveAccountToDevice(res.user, res.token);
    setIsSwitcherOpen(false);
    return { success: true, user: res.user };
  };

  // Remove a saved staff account from this device (Does NOT delete from MongoDB)
  const removeSavedAccount = (accountId) => {
    const current = loadStoredAccounts();
    const target = current.find((a) => a.id === accountId);

    // Prevent removing Admin account to satisfy Requirement 7:
    // "Admin account must always remain available in the account switcher. Admin account must never be replaced or deleted."
    if (target?.role === 'admin') {
      throw new Error('Administrator account cannot be removed from device switcher.');
    }

    const updated = current.filter((a) => a.id !== accountId);
    persistSavedAccounts(updated);

    // If the removed account was currently active, log out
    if (user && (user.id === accountId || user._id === accountId)) {
      logout();
    }
  };

  // Change Password (handles forced or manual update)
  const changePassword = async ({ currentPassword, newPassword, confirmPassword }) => {
    const res = await api.changePassword({ currentPassword, newPassword, confirmPassword });
    if (res.token) {
      localStorage.setItem(ACTIVE_TOKEN_KEY, res.token);
      setToken(res.token);
    }
    if (res.user) {
      setUser(res.user);
      saveAccountToDevice(res.user, res.token || token);
    }
    return res;
  };

  // Log out of active session without clearing other saved accounts from device
  const logout = () => {
    localStorage.removeItem(ACTIVE_TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  // Log out all accounts and clear all saved credentials on this device
  const logoutAllAccounts = () => {
    localStorage.removeItem(ACTIVE_TOKEN_KEY);
    localStorage.removeItem(SAVED_ACCOUNTS_KEY);
    setToken(null);
    setUser(null);
    setSavedAccounts([]);
    setIsSwitcherOpen(false);
  };

  const openSwitcher = () => setIsSwitcherOpen(true);
  const closeSwitcher = () => setIsSwitcherOpen(false);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        savedAccounts,
        loading,
        isSetupRequired,
        isSwitcherOpen,
        openSwitcher,
        closeSwitcher,
        login,
        register,
        logout,
        logoutAllAccounts,
        changePassword,
        switchToStaffAccount,
        verifyAndSwitchToAdmin,
        removeSavedAccount,
        isAdmin: user?.role === 'admin'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
