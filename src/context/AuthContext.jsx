// src/context/AuthContext.jsx
// Authentication, Session and Role Management for PioPlan

import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const AUTH_STORAGE_KEY = 'pioplan_auth_session_v1';
const ADMIN_STORAGE_KEY = 'pioplan_admin_profile_v1';

const DEFAULT_ADMIN = {
  id: 'admin-root',
  username: 'admin',
  name: 'WFM Sistem Yöneticisi (Admin)',
  title: 'Baş Planlamacı / WFM Yöneticisi',
  role: 'admin',
  email: 'admin@pioplan.com',
  phone: '+90 532 000 00 00',
  password: 'Doxish44++',
  avatar: 'AD',
  avatarBg: '#8b5cf6',
  isFirstLogin: false
};

export function AuthProvider({ children, agents, updateAgentPasswordInDb }) {
  // Admin Profile state
  const [adminProfile, setAdminProfile] = useState(() => {
    const saved = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {
      ...DEFAULT_ADMIN,
      password: import.meta.env.VITE_ADMIN_PASSWORD || DEFAULT_ADMIN.password,
      username: import.meta.env.VITE_ADMIN_USERNAME || DEFAULT_ADMIN.username
    };
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  const [isMustChangePassword, setIsMustChangePassword] = useState(false);

  useEffect(() => {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(adminProfile));
  }, [adminProfile]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [currentUser]);

  /**
   * Update Admin Profile (name, email, phone, title, password)
   */
  const updateAdminProfile = (updatedFields) => {
    setAdminProfile(prev => {
      const next = { ...prev, ...updatedFields };
      if (currentUser?.role === 'admin') {
        setCurrentUser(next);
      }
      return next;
    });
  };

  /**
   * Login function
   */
  const login = async (identifier, password) => {
    const cleanId = identifier.trim();
    const cleanPass = password.trim();

    // 1. Check Admin Login
    const currentAdminUsername = adminProfile.username || 'admin';
    const currentAdminPassword = adminProfile.password || import.meta.env.VITE_ADMIN_PASSWORD || 'Doxish44++';

    if (cleanId.toLowerCase() === currentAdminUsername.toLowerCase()) {
      if (cleanPass === currentAdminPassword) {
        setCurrentUser(adminProfile);
        setIsMustChangePassword(false);
        return { success: true, user: adminProfile };
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
        adminProfile,
        updateAdminProfile,
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
