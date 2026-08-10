// src/components/layout/Navbar.jsx
import React, { useState } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  Users,
  ShieldCheck,
  Zap,
  RotateCcw,
  Key,
  LogOut,
  User
} from 'lucide-react';
import { usePlan } from '../../context/PlanContext';
import { useAuth } from '../../context/AuthContext';
import { setPioneersApiKey, getPioneersApiKey } from '../../services/pioneersAi';
import { Modal } from '../common/Modal';

export function Navbar({ onOpenAiModal }) {
  const {
    currentView,
    setCurrentView,
    resetToFactoryDefaults,
    isAiGenerating,
    notify
  } = usePlan();

  const { currentUser, isAdmin, logout } = useAuth();

  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getPioneersApiKey());

  const handleSaveApiKey = () => {
    setPioneersApiKey(apiKeyInput);
    setIsApiKeyModalOpen(false);
    notify('Pioneers AI API anahtarı başarıyla güncellendi.', 'success');
  };

  return (
    <>
      <header className="navbar">
        {/* Brand */}
        <div className="nav-brand">
          <div className="brand-icon">
            <Sparkles size={22} />
          </div>
          <div>
            <div className="brand-title">
              PioPlan
              <span className="pioneers-badge">
                <Zap size={11} fill="white" /> Pioneers AI
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 0.2 }}>
              Çağrı Merkezi WFM & Vardiya Optimizasyonu
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Admin Views vs Agent View) */}
        <nav className="nav-tabs">
          {isAdmin ? (
            <>
              <button
                onClick={() => setCurrentView('planner')}
                className={`nav-tab-btn ${currentView === 'planner' ? 'active' : ''}`}
              >
                <Calendar size={15} />
                <span>Vardiya Planlayıcı</span>
              </button>

              <button
                onClick={() => setCurrentView('timeline')}
                className={`nav-tab-btn ${currentView === 'timeline' ? 'active active-timeline' : ''}`}
              >
                <Clock size={15} />
                <span>24h Canlı Timeline</span>
                <span className="pulse-dot online" style={{ marginLeft: 2 }} />
              </button>

              <button
                onClick={() => setCurrentView('teams')}
                className={`nav-tab-btn ${currentView === 'teams' ? 'active' : ''}`}
              >
                <ShieldCheck size={15} />
                <span>Takımlar & Kurallar</span>
              </button>

              <button
                onClick={() => setCurrentView('agents')}
                className={`nav-tab-btn ${currentView === 'agents' ? 'active' : ''}`}
              >
                <Users size={15} />
                <span>Çalışanlar</span>
              </button>
            </>
          ) : (
            <div
              style={{
                padding: '6px 14px',
                color: '#38bdf8',
                fontWeight: 700,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Calendar size={15} />
              <span>Bireysel Vardiya Portalı</span>
            </div>
          )}
        </nav>

        {/* Right Actions & User Profile */}
        <div className="nav-actions">
          {isAdmin && (
            <button
              onClick={onOpenAiModal}
              disabled={isAiGenerating}
              className="btn btn-ai btn-sm"
              title="Pioneers AI ile Kural Tabanlı Otomatik Vardiya Oluştur"
            >
              <Sparkles size={14} className={isAiGenerating ? 'animate-spin' : ''} />
              <span>{isAiGenerating ? 'AI Optimize Ediyor...' : 'Pioneers AI ile Planla'}</span>
            </button>
          )}

          {/* User Profile Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-full)',
              padding: '4px 12px 4px 6px',
              gap: 8
            }}
          >
            <div
              className="agent-avatar"
              style={{
                width: 26,
                height: 26,
                fontSize: 11,
                background: currentUser?.avatarBg || (isAdmin ? '#8b5cf6' : '#3b82f6')
              }}
            >
              {currentUser?.avatar || (isAdmin ? 'AD' : 'AG')}
            </div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: '#ffffff' }}>
                {currentUser?.name || 'Kullanıcı'}
              </div>
              <div style={{ fontSize: 10, color: isAdmin ? '#a78bfa' : '#38bdf8', fontWeight: 600 }}>
                {isAdmin ? 'WFM Admin' : currentUser?.username || 'Temsilci'}
              </div>
            </div>
          </div>

          {/* Settings & Reset (Admin only) */}
          {isAdmin && (
            <>
              <button
                onClick={() => setIsApiKeyModalOpen(true)}
                className="btn btn-outline btn-sm"
                title="Pioneers AI API Ayarları"
                style={{ padding: '6px 8px' }}
              >
                <Key size={14} />
              </button>

              <button
                onClick={() => {
                  if (window.confirm('Tüm veritabanını temizlemek istiyor musunuz?')) {
                    resetToFactoryDefaults();
                  }
                }}
                className="btn btn-outline btn-sm"
                title="Verileri Temizle"
                style={{ padding: '6px 8px' }}
              >
                <RotateCcw size={14} />
              </button>
            </>
          )}

          {/* Logout */}
          <button
            onClick={() => {
              if (window.confirm('Oturumu kapatmak istediğinizden emin misiniz?')) {
                logout();
              }
            }}
            className="btn btn-danger btn-sm"
            title="Çıkış Yap"
            style={{ padding: '6px 10px' }}
          >
            <LogOut size={14} />
            <span>Çıkış</span>
          </button>
        </div>
      </header>

      {/* API Key Modal */}
      <Modal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        title="Pioneers AI Motor Yapılandırması"
        icon={<Sparkles size={20} />}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            PioPlan, vardiya kural optimizasyonları ve kural denetimi için <strong>Pioneers AI</strong> altyapısını kullanmaktadır.
          </p>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Pioneers AI API Anahtarı
            </label>
            <input
              type="text"
              className="input"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="API Anahtarınızı girin..."
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setIsApiKeyModalOpen(false)}>
              İptal
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleSaveApiKey}>
              Kaydet
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
