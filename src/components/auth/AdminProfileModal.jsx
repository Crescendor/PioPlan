// src/components/auth/AdminProfileModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { usePlan } from '../../context/PlanContext';
import { ShieldCheck, User, Mail, Phone, Lock, Eye, EyeOff, Check, Key } from 'lucide-react';

export function AdminProfileModal({ isOpen, onClose }) {
  const { adminProfile, updateAdminProfile } = useAuth();
  const { notify } = usePlan();

  const [form, setForm] = useState({
    name: '',
    title: '',
    email: '',
    phone: '',
    password: '',
    avatarBg: '#8b5cf6'
  });

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (adminProfile) {
      setForm({
        name: adminProfile.name || '',
        title: adminProfile.title || 'Baş Planlamacı / WFM Yöneticisi',
        email: adminProfile.email || '',
        phone: adminProfile.phone || '',
        password: adminProfile.password || '',
        avatarBg: adminProfile.avatarBg || '#8b5cf6'
      });
    }
  }, [adminProfile, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.password.trim()) {
      notify('İsim ve şifre alanları boş bırakılamaz.', 'error');
      return;
    }

    const initials = form.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'AD';

    updateAdminProfile({
      ...form,
      avatar: initials
    });

    notify('Yönetici profiliniz ve şifreniz başarıyla güncellendi.', 'success');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Admin Profil & Güvenlik Ayarları"
      icon={<ShieldCheck size={20} color="#8b5cf6" />}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div
            className="agent-avatar"
            style={{ width: 48, height: 48, fontSize: 18, background: form.avatarBg }}
          >
            {form.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'AD'}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#ffffff' }}>
              Sistem Yöneticisi Hesabı
            </div>
            <div style={{ fontSize: 11.5, color: '#a78bfa' }}>
              Kullanıcı Kodu: <strong>admin</strong> (Değiştirilemez)
            </div>
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            Ad Soyad / Yönetici Ünvanı
          </label>
          <input
            type="text"
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Örn: Burak Kaya"
            required
          />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            Görev / Departman Rolü
          </label>
          <input
            type="text"
            className="input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Örn: WFM Operasyon Direktörü"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              E-Posta
            </label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="admin@sirketiniz.com"
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Telefon
            </label>
            <input
              type="text"
              className="input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+90 532 ..."
            />
          </div>
        </div>

        {/* Admin Password */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
            <Key size={13} /> Admin Giriş Şifresi
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              className="input"
              style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, paddingRight: 40 }}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
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
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
            Güncellediğiniz yeni şifre hem bu panelde hem de bir sonraki Admin girişinizde geçerli olur.
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
            İptal
          </button>
          <button type="submit" className="btn btn-primary btn-sm">
            <Check size={14} /> Profili Kaydet
          </button>
        </div>
      </form>
    </Modal>
  );
}
