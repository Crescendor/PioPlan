// src/components/auth/LoginPage.jsx
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Sparkles,
  Zap,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim() || !password.trim()) {
      setError('Lütfen kullanıcı bilginizi ve şifrenizi girin.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await login(identifier, password);
      if (!res.success) {
        setError(res.error || 'Giriş yapılamadı.');
      }
    } catch (err) {
      setError('Giriş sırasında bir hata oluştu: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        position: 'relative',
        zIndex: 10
      }}
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: 440,
          width: '100%',
          padding: '36px 32px',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid rgba(139, 92, 246, 0.25)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(139, 92, 246, 0.2)',
          background: 'rgba(16, 21, 34, 0.85)',
          backdropFilter: 'blur(24px)'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--pioneers-gradient)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 0 25px rgba(139, 92, 246, 0.6)',
              marginBottom: 14
            }}
          >
            <Sparkles size={28} />
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>
            PioPlan
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6 }}>
            <span className="pioneers-badge">
              <Zap size={11} fill="white" /> Pioneers AI
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Çağrı Merkezi WFM Portalı
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#fca5a5',
              fontSize: 12.5,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 18,
              animation: 'fadeIn 0.2s ease'
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Kullanıcı Kodu / E-Posta / Admin ID
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input"
                style={{ paddingLeft: 36 }}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Örn: PIO-1001 veya admin"
                autoFocus
                required
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Şifre
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="input"
                style={{ paddingLeft: 36, paddingRight: 40 }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Şifrenizi girin..."
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: 10,
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 4
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-ai"
            style={{ width: '100%', padding: '12px', fontSize: 14, marginTop: 6 }}
          >
            {isLoading ? (
              <span>Giriş Yapılıyor...</span>
            ) : (
              <>
                <span>Sisteme Giriş Yap</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Security Footer Notice */}
        <div
          style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontSize: 11,
            color: 'var(--text-muted)'
          }}
        >
          <ShieldCheck size={14} color="#10b981" />
          <span>256-Bit SSL • Cloudflare Koruma ve Pioneers AI</span>
        </div>
      </div>
    </div>
  );
}
