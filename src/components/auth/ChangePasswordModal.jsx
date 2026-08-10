// src/components/auth/ChangePasswordModal.jsx
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, ShieldAlert, Check, AlertCircle } from 'lucide-react';

export function ChangePasswordModal({ isOpen }) {
  const { currentUser, handleCompletePasswordChange } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !currentUser) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Yeni şifreniz en az 6 karakter olmalıdır.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Girdiğiniz yeni şifreler birbiriyle uyuşmuyor.');
      return;
    }

    handleCompletePasswordChange(newPassword);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: 480,
          background: 'var(--bg-surface-elevated)',
          border: '1.5px solid #f59e0b',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(245, 158, 11, 0.25)'
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-md)',
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ShieldAlert size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#ffffff' }}>
              İlk Giriş: Şifrenizi Yenileyin
            </h3>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              Güvenliğiniz için lütfen yeni bir şifre belirleyin.
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Sayın <strong>{currentUser.name}</strong>, geçici şifrenizle ilk girişinizi yaptınız. Hesabınızı güvene almak için kalıcı şifrenizi belirlemeniz gerekmektedir.
          </div>

          {error && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Yeni Şifreniz
            </label>
            <input
              type="password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="En az 6 karakter..."
              autoFocus
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Yeni Şifrenizi Tekrar Girin
            </label>
            <input
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Şifreyi onaylayın..."
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '11px', fontSize: 13.5, marginTop: 8 }}
          >
            <Check size={16} />
            <span>Şifremi Güncelle ve Devam Et</span>
          </button>
        </form>
      </div>
    </div>
  );
}
