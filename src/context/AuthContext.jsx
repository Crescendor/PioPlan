// src/context/AuthContext.jsx
// Authentication, Session and Role Management for PioPlan

import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const AUTH_STORAGE_KEY = 'pioplan_auth_session_v1';

export function AuthProvider({ children, agents, updateAgentPasswordInDb }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  const [isMustChangePassword, setIsMustChangePassword] = useState(false);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [currentUser]);

  // Admin secret configuration (Cloudflare secret or .env)
  const getAdminSecret = () => {
    return import.meta.env.VITE_ADMIN_PASSWORD || 'Doxish44++';
  };

  const getAdminUsername = () => {
    return import.meta.env.VITE_ADMIN_USERNAME || 'admin';
  };

  /**
   * Login function
   */
  const login = async (identifier, password) => {
    const cleanId = identifier.trim();
    const cleanPass = password.trim();

    // 1. Check Admin Login
    if (cleanId.toLowerCase() === getAdminUsername().toLowerCase()) {
      if (cleanPass === getAdminSecret()) {
        const adminUser = {
          id: 'admin-root',
          username: 'admin',
          name: 'WFM Baş Planlamacı (Admin)',
          role: 'admin',
          email: 'admin@pioplan.com',
          avatar: 'AD',
          avatarBg: '#8b5cf6',
          isFirstLogin: false
        };
        setCurrentUser(adminUser);
        setIsMustChangePassword(false);
        return { success: true, user: adminUser };
      } else {
        return { success: false, error: 'Hatalı Admin şifresi girdiniz.' };
      }
    }

    // 2. Check Agent (Employee) Login
    const agent = agents.find(a => 
      (a.username && a.username.toLowerCase() === cleanId.toLowerCase()) ||
      (a.id && a.id.toLowerCase() === cleanId.toLowerCase()) ||
      (a.email && a.email.toLowerCase() === cleanId.toLowerCase())
    );

    if (!agent) {
      return { success: false, error: 'Kullanıcı bulunamadı. Lütfen Kullanıcı Kodunuzu (Örn: PIO-1001) kontrol edin.' };
    }

    if (agent.password !== cleanPass) {
      return { success: false, error: 'Şifreniz hatalı. Lütfen tekrar deneyin.' };
    }

    const sessionUser = {
      id: agent.id,
      username: agent.username || agent.id,
      name: agent.name,
      role: 'agent',
      email: agent.email,
      avatar: agent.avatar,
      avatarBg: agent.avatarBg,
      teamId: agent.teamId,
      seniority: agent.seniority,
      isFirstLogin: agent.isFirstLogin ?? true
    };

    setCurrentUser(sessionUser);

    if (agent.isFirstLogin) {
      setIsMustChangePassword(true);
    } else {
      setIsMustChangePassword(false);
    }

    return { success: true, user: sessionUser };
  };

  /**
   * Forced first login password change
   */
  const handleCompletePasswordChange = (newPassword) => {
    if (!currentUser || currentUser.role === 'admin') return;

    updateAgentPasswordInDb(currentUser.id, newPassword);

    const updatedUser = {
      ...currentUser,
      isFirstLogin: false
    };

    setCurrentUser(updatedUser);
    setIsMustChangePassword(false);
  };

  /**
   * Logout
   */
  const logout = () => {
    setCurrentUser(null);
    setIsMustChangePassword(false);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isAdmin: currentUser?.role === 'admin',
        isMustChangePassword,
        login,
        logout,
        handleCompletePasswordChange
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
