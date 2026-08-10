// src/components/agents/AgentManager.jsx
import React, { useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  ShieldAlert,
  Sparkles,
  Check,
  X,
  Phone,
  Mail,
  Clock,
  Search,
  Key,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Lock,
  UserCheck,
  Crown,
  ShieldCheck
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { generateAgentId, generateSecurePassword } from '../../utils/authUtils';
import { AdminProfileModal } from '../auth/AdminProfileModal';

const AGENT_RULE_SUGGESTIONS = [
  'Salı ve Çarşamba günleri üniversite dersi nedeniyle sadece Akşam vardiyası veya İzinli olmalıdır.',
  'Gece vardiyası (00:00 - 08:30) yazılamaz.',
  'Haftalık maksimum çalışma süresi 40 saattir.',
  'Perşembe günleri sağlık randevusu sebebiyle sadece Sabah vardiyasında çalışabilir.',
  'Hafta sonu nöbetlerine ve Gece vardiyasına açıktır.',
  'Junior statüsünde olduğu için yanında mutlaka Senior/Lead ile aynı vardiyada olmalıdır.',
  'Pazar günleri kesinlikle izinlidir.'
];

export function AgentManager() {
  const {
    agents,
    teams,
    addAgent,
    updateAgent,
    deleteAgent,
    addAgentRule,
    removeAgentRule,
    updateAgentRule,
    notify
  } = usePlan();

  const { adminProfile } = useAuth();

  // Combine Admin + Agents for selection
  const [selectedUserId, setSelectedUserId] = useState('admin-root');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeamId, setFilterTeamId] = useState('all');

  const [newRuleInput, setNewRuleInput] = useState('');
  const [editingRuleIdx, setEditingRuleIdx] = useState(null);
  const [editingRuleText, setEditingRuleText] = useState('');

  // Password visibility map
  const [visiblePasswords, setVisiblePasswords] = useState({});

  // Modals
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [isEditingAgent, setIsEditingAgent] = useState(false);
  const [agentForm, setAgentForm] = useState({
    name: '',
    username: '',
    password: '',
    email: '',
    phone: '',
    role: 'agent',
    title: 'Müşteri Temsilcisi',
    seniority: 'Mid',
    teamId: teams[0]?.id || '',
    contractHoursWeekly: 42.5
  });

  const isSelectedAdmin = selectedUserId === 'admin-root';
  const selectedAgent = agents.find(a => a.id === selectedUserId);
  const selectedAgentTeam = selectedAgent ? teams.find(t => t.id === selectedAgent.teamId) : null;

  // Filter agents based on search and team
  const filteredAgents = agents.filter(ag => {
    const matchesSearch = ag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (ag.username && ag.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          ag.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ag.seniority?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTeam = filterTeamId === 'all' || ag.teamId === filterTeamId;
    return matchesSearch && matchesTeam;
  });

  const isMatchesAdminSearch = !searchTerm ||
    adminProfile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    adminProfile.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    'admin'.includes(searchTerm.toLowerCase());

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    notify(`${label} panoya kopyalandı.`);
  };

  // Open Create Agent Modal
  const handleOpenCreateAgent = () => {
    setIsEditingAgent(false);
    setAgentForm({
      name: '',
      username: generateAgentId(),
      password: generateSecurePassword(8),
      email: '',
      phone: '',
      role: 'agent',
      title: 'Müşteri Temsilcisi',
      seniority: 'Mid',
      teamId: teams[0]?.id || '',
      contractHoursWeekly: 42.5
    });
    setIsAgentModalOpen(true);
  };

  // Open Edit Agent Modal
  const handleOpenEditAgent = () => {
    if (!selectedAgent) return;
    setIsEditingAgent(true);
    setAgentForm({
      name: selectedAgent.name,
      username: selectedAgent.username || selectedAgent.id,
      password: selectedAgent.password || generateSecurePassword(8),
      email: selectedAgent.email || '',
      phone: selectedAgent.phone || '',
      role: selectedAgent.role || 'agent',
      title: selectedAgent.title || 'Müşteri Temsilcisi',
      seniority: selectedAgent.seniority || 'Mid',
      teamId: selectedAgent.teamId || teams[0]?.id || '',
      contractHoursWeekly: selectedAgent.contractHoursWeekly || 42.5
    });
    setIsAgentModalOpen(true);
  };

  // Save Agent
  const handleSaveAgent = (e) => {
    e.preventDefault();
    if (!agentForm.name.trim()) return;

    if (isEditingAgent) {
      updateAgent({
        ...selectedAgent,
        ...agentForm
      });
    } else {
      const created = addAgent(agentForm);
      setSelectedUserId(created.id);
    }
    setIsAgentModalOpen(false);
  };

  // Rules Handlers
  const handleAddRule = (e) => {
    e.preventDefault();
    if (!newRuleInput.trim() || !selectedAgent) return;
    addAgentRule(selectedAgent.id, newRuleInput);
    setNewRuleInput('');
  };

  const handleQuickAddRule = (ruleStr) => {
    if (!selectedAgent) return;
    addAgentRule(selectedAgent.id, ruleStr);
  };

  const handleSaveEditRule = (idx) => {
    if (!editingRuleText.trim() || !selectedAgent) return;
    updateAgentRule(selectedAgent.id, idx, editingRuleText);
    setEditingRuleIdx(null);
    setEditingRuleText('');
    notify('Çalışan kuralı güncellendi.');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24 }}>
      {/* Left Column: Users List (Admin + Agents) */}
      <div className="glass-panel" style={{ padding: 20, height: 'fit-content' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} color="var(--pioneers-cyan)" /> Kullanıcılar ({agents.length + 1})
          </h3>
          <button
            onClick={handleOpenCreateAgent}
            className="btn btn-primary btn-sm"
          >
            <Plus size={14} /> Yeni Temsilci
          </button>
        </div>

        {/* Search & Team Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input"
              style={{ paddingLeft: 30, fontSize: 12.5 }}
              placeholder="İsim, Kullanıcı Kodu (PIO-...) ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="select"
            style={{ fontSize: 12, padding: '6px 10px' }}
            value={filterTeamId}
            onChange={(e) => setFilterTeamId(e.target.value)}
          >
            <option value="all">Tüm Takımlar & Admin ({agents.length + 1})</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* User Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 600, overflowY: 'auto' }}>
          {/* 1. Admin User Card */}
          {isMatchesAdminSearch && (filterTeamId === 'all') && (
            <div
              onClick={() => setSelectedUserId('admin-root')}
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: isSelectedAdmin ? 'rgba(139, 92, 246, 0.18)' : 'var(--bg-surface)',
                border: `1.5px solid ${isSelectedAdmin ? '#8b5cf6' : 'rgba(139, 92, 246, 0.3)'}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'all 0.15s ease',
                boxShadow: isSelectedAdmin ? '0 0 15px rgba(139, 92, 246, 0.3)' : 'none'
              }}
            >
              <div
                className="agent-avatar"
                style={{ background: adminProfile.avatarBg || '#8b5cf6', width: 34, height: 34, fontSize: 12 }}
              >
                {adminProfile.avatar || 'AD'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {adminProfile.name}
                  <Crown size={12} color="#fbbf24" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span className="badge badge-neutral" style={{ fontSize: 9.5, color: '#a78bfa' }}>
                    admin
                  </span>
                  <span style={{ fontSize: 10.5, color: '#a78bfa', fontWeight: 600 }}>
                    Sistem Yöneticisi
                  </span>
                </div>
              </div>
              <span className="badge badge-warning" style={{ fontSize: 9 }}>
                Admin
              </span>
            </div>
          )}

          {/* 2. Agents Cards List */}
          {filteredAgents.length === 0 && !isMatchesAdminSearch ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Aramanıza uygun kullanıcı bulunamadı.
            </div>
          ) : (
            filteredAgents.map(ag => {
              const isSelected = ag.id === selectedUserId;
              const agTeam = teams.find(t => t.id === ag.teamId);
              return (
                <div
                  key={ag.id}
                  onClick={() => setSelectedUserId(ag.id)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                    border: `1.5px solid ${isSelected ? (agTeam?.color || '#3b82f6') : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? `0 0 15px ${agTeam?.color || '#3b82f6'}25` : 'none'
                  }}
                >
                  <div
                    className="agent-avatar"
                    style={{ background: ag.avatarBg || agTeam?.color || '#3b82f6', width: 34, height: 34, fontSize: 12 }}
                  >
                    {ag.avatar || 'AG'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ag.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span className="badge badge-neutral" style={{ fontSize: 9.5 }}>
                        {ag.username || ag.id}
                      </span>
                      <span style={{ fontSize: 10.5, color: agTeam?.color || 'var(--text-muted)', fontWeight: 600 }}>
                        {agTeam?.name.split(' ')[0] || 'Takımsız'}
                      </span>
                    </div>
                  </div>
                  {ag.isFirstLogin ? (
                    <span className="badge badge-warning" style={{ fontSize: 9 }} title="İlk girişinde şifre değiştirecek">
                      Yeni
                    </span>
                  ) : (
                    <span className="badge badge-success" style={{ fontSize: 9 }} title="Şifresi aktif">
                      Aktif
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Selected User Profile (Admin vs Agent) */}
      {isSelectedAdmin ? (
        /* ADMIN PROFILE VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="glass-panel" style={{ padding: 24, border: '1.5px solid rgba(139, 92, 246, 0.35)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  className="agent-avatar"
                  style={{
                    width: 56,
                    height: 56,
                    fontSize: 20,
                    borderRadius: 'var(--radius-lg)',
                    background: adminProfile.avatarBg || '#8b5cf6',
                    boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)'
                  }}
                >
                  {adminProfile.avatar || 'AD'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: '#ffffff' }}>
                      {adminProfile.name}
                    </h2>
                    <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Crown size={12} /> Root Admin
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, color: '#a78bfa', marginTop: 4 }}>
                    {adminProfile.title || 'Baş Planlamacı / WFM Yöneticisi'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => setIsAdminModalOpen(true)}
                  className="btn btn-primary btn-sm"
                  style={{ padding: '8px 14px' }}
                >
                  <Edit2 size={13} /> Admin Profilini & Şifreyi Düzenle
                </button>
              </div>
            </div>

            {/* Admin Info Banner */}
            <div
              style={{
                marginTop: 18,
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(139, 92, 246, 0.12)',
                border: '1px solid rgba(139, 92, 246, 0.25)',
                color: '#ddd6fe',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <ShieldCheck size={16} color="#a78bfa" style={{ flexShrink: 0 }} />
              <span>
                <strong>Sistem Yöneticisi:</strong> Admin hesabı tüm WFM optimizasyonu, takım ve temsilci yönetim yetkilerine sahiptir. Vardiyalarda temsilci olarak atanmaz.
              </span>
            </div>

            {/* Admin Credentials Row */}
            <div
              style={{
                marginTop: 18,
                padding: '16px 20px',
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(59, 130, 246, 0.08))',
                border: '1px solid rgba(139, 92, 246, 0.25)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16
              }}
            >
              {/* Username */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Key size={12} color="#a78bfa" /> Admin Kullanıcı Adı
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#a78bfa', fontFamily: 'var(--font-mono)' }}>
                    {adminProfile.username || 'admin'}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(adminProfile.username || 'admin', 'Admin Kullanıcı Adı')}
                    className="btn btn-outline btn-sm"
                    style={{ padding: '2px 6px', fontSize: 11 }}
                    title="Kopyala"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>

              {/* Password */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Lock size={12} color="#f59e0b" /> Admin Giriş Şifresi
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                    {visiblePasswords['admin-root'] ? adminProfile.password : '••••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('admin-root')}
                    className="btn btn-outline btn-sm"
                    style={{ padding: '2px 6px', fontSize: 11 }}
                    title={visiblePasswords['admin-root'] ? 'Gizle' : 'Göster'}
                  >
                    {visiblePasswords['admin-root'] ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(adminProfile.password, 'Admin Şifresi')}
                    className="btn btn-outline btn-sm"
                    style={{ padding: '2px 6px', fontSize: 11 }}
                    title="Şifreyi Kopyala"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>

              {/* Status */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                  Hesap Yetkisi
                </div>
                <div style={{ marginTop: 6 }}>
                  <span className="badge badge-success">
                    <UserCheck size={11} /> Tam Yönetici Erişimi
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 16 }}>
              <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Mail size={12} /> E-Posta
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 3 }}>
                  {adminProfile.email || 'admin@pioplan.com'}
                </div>
              </div>

              <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Phone size={12} /> Telefon
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 3 }}>
                  {adminProfile.phone || '+90 532 000 00 00'}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : selectedAgent ? (
        /* AGENT PROFILE VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Agent Header Card */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  className="agent-avatar"
                  style={{
                    width: 56,
                    height: 56,
                    fontSize: 20,
                    borderRadius: 'var(--radius-lg)',
                    background: selectedAgent.avatarBg || selectedAgentTeam?.color || '#3b82f6'
                  }}
                >
                  {selectedAgent.avatar || 'AG'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: '#ffffff' }}>
                      {selectedAgent.name}
                    </h2>
                    <span className="badge badge-neutral">{selectedAgent.seniority}</span>
                    {selectedAgentTeam && (
                      <span
                        className="badge"
                        style={{
                          background: `${selectedAgentTeam.color}20`,
                          color: selectedAgentTeam.color,
                          border: `1px solid ${selectedAgentTeam.color}40`
                        }}
                      >
                        {selectedAgentTeam.name}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {selectedAgent.title || 'Müşteri Hizmetleri Temsilcisi'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={handleOpenEditAgent}
                  className="btn btn-secondary btn-sm"
                >
                  <Edit2 size={13} /> Düzenle
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`${selectedAgent.name} çalışanını silmek istediğinizden emin misiniz?`)) {
                      deleteAgent(selectedAgent.id);
                      setSelectedUserId('admin-root');
                    }
                  }}
                  className="btn btn-danger btn-sm"
                >
                  <Trash2 size={13} /> Sil
                </button>
              </div>
            </div>

            {/* Profile Credentials & Login Information */}
            <div
              style={{
                marginTop: 20,
                padding: '16px 20px',
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.08))',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16
              }}
            >
              {/* User ID / Login Code */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Key size={12} color="#38bdf8" /> Giriş Kodu (Kullanıcı ID)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                    {selectedAgent.username || selectedAgent.id}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(selectedAgent.username || selectedAgent.id, 'Kullanıcı Kodu')}
                    className="btn btn-outline btn-sm"
                    style={{ padding: '2px 6px', fontSize: 11 }}
                    title="Kopyala"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>

              {/* Password */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Lock size={12} color="#f59e0b" /> Sistem Şifresi
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                    {visiblePasswords[selectedAgent.id] ? selectedAgent.password : '••••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility(selectedAgent.id)}
                    className="btn btn-outline btn-sm"
                    style={{ padding: '2px 6px', fontSize: 11 }}
                    title={visiblePasswords[selectedAgent.id] ? 'Gizle' : 'Göster'}
                  >
                    {visiblePasswords[selectedAgent.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(selectedAgent.password, 'Şifre')}
                    className="btn btn-outline btn-sm"
                    style={{ padding: '2px 6px', fontSize: 11 }}
                    title="Şifreyi Kopyala"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>

              {/* First Login Status */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                  Giriş Durumu
                </div>
                <div style={{ marginTop: 6 }}>
                  {selectedAgent.isFirstLogin ? (
                    <span className="badge badge-warning">
                      ⚠️ İlk Girişte Şifre Değişecek
                    </span>
                  ) : (
                    <span className="badge badge-success">
                      <UserCheck size={11} /> Şifre Kullanıcıca Güncellendi
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Meta Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 16 }}>
              <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} /> Haftalık Sözleşme Saati
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#38bdf8', marginTop: 3 }}>
                  {selectedAgent.contractHoursWeekly || 42.5} Saat / Hafta
                </div>
              </div>

              <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Mail size={12} /> E-Posta
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedAgent.email || 'tanimsiz@callcenter.com'}
                </div>
              </div>

              <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Phone size={12} /> Telefon
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 3 }}>
                  {selectedAgent.phone || '+90 5XX XXX XX XX'}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Individual Rules & Constraints Editor */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldAlert size={18} color="#f59e0b" />
                  {selectedAgent.name} - Kişisel Kural ve Kısıtlamaları
                  <span className="pioneers-badge">
                    <Sparkles size={10} /> AI Uyumlu
                  </span>
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Öğrenci ders saatleri, sağlık izinleri veya özel tercihler satır satır işlenir ve AI çizelgelerinde asla ihlal edilmez.
                </p>
              </div>
            </div>

            {/* Add Rule Input */}
            <form onSubmit={handleAddRule} style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
              <input
                type="text"
                className="input"
                value={newRuleInput}
                onChange={(e) => setNewRuleInput(e.target.value)}
                placeholder="Örn: Salı ve Perşembe akşamı üniversite dersi var, gündüz veya izinli yazılmalı..."
              />
              <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }}>
                <Plus size={16} /> Kural Ekle
              </button>
            </form>

            {/* Quick Suggestion Pills */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                Hızlı Kişisel Kural Şablonları:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {AGENT_RULE_SUGGESTIONS.map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleQuickAddRule(sug)}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: 11, padding: '3px 8px', borderRadius: 'var(--radius-full)' }}
                  >
                    + {sug.slice(0, 36)}...
                  </button>
                ))}
              </div>
            </div>

            {/* Rules List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(selectedAgent.rules || []).length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  Bu temsilciye ait özel bir kural veya kısıtlama girilmemiş. Genel takım kuralları uygulanacaktır.
                </div>
              ) : (
                selectedAgent.rules.map((rule, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12
                    }}
                  >
                    {editingRuleIdx === idx ? (
                      <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                        <input
                          type="text"
                          className="input"
                          value={editingRuleText}
                          onChange={(e) => setEditingRuleText(e.target.value)}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditRule(idx)}
                          className="btn btn-primary btn-sm"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingRuleIdx(null)}
                          className="btn btn-secondary btn-sm"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                          <span
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              background: 'var(--bg-surface-elevated)',
                              color: '#fbbf24',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 11,
                              fontWeight: 700,
                              flexShrink: 0
                            }}
                          >
                            {idx + 1}
                          </span>
                          <span style={{ fontSize: 13, color: '#f8fafc', lineHeight: 1.4 }}>
                            {rule}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRuleIdx(idx);
                              setEditingRuleText(rule);
                            }}
                            className="btn btn-outline btn-sm"
                            style={{ padding: '4px 6px' }}
                            title="Düzenle"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeAgentRule(selectedAgent.id, idx)}
                            className="btn btn-danger btn-sm"
                            style={{ padding: '4px 6px' }}
                            title="Sil"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Admin Profile Modal */}
      <AdminProfileModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />

      {/* Agent Create / Edit Modal */}
      <Modal
        isOpen={isAgentModalOpen}
        onClose={() => setIsAgentModalOpen(false)}
        title={isEditingAgent ? `${agentForm.name} Bilgilerini Düzenle` : 'Yeni Çağrı Merkezi Temsilcisi Ekle'}
      >
        <form onSubmit={handleSaveAgent} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Ad Soyad
            </label>
            <input
              type="text"
              className="input"
              value={agentForm.name}
              onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
              placeholder="Örn: Caner Korkmaz"
              required
            />
          </div>

          {/* Credentials Generation Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span>Kullanıcı Kodu (Giriş ID)</span>
                <button
                  type="button"
                  onClick={() => setAgentForm({ ...agentForm, username: generateAgentId() })}
                  style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 2 }}
                >
                  <RefreshCw size={11} /> Yenile
                </button>
              </label>
              <input
                type="text"
                className="input"
                style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#38bdf8' }}
                value={agentForm.username}
                onChange={(e) => setAgentForm({ ...agentForm, username: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span>Geçici Şifre</span>
                <button
                  type="button"
                  onClick={() => setAgentForm({ ...agentForm, password: generateSecurePassword(8) })}
                  style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 2 }}
                >
                  <RefreshCw size={11} /> Şifre Belirle
                </button>
              </label>
              <input
                type="text"
                className="input"
                style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#f59e0b' }}
                value={agentForm.password}
                onChange={(e) => setAgentForm({ ...agentForm, password: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Bağlı Takım
              </label>
              <select
                className="select"
                value={agentForm.teamId}
                onChange={(e) => setAgentForm({ ...agentForm, teamId: e.target.value })}
              >
                <option value="">-- Takım Seçin --</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Kıdem Seviyesi
              </label>
              <select
                className="select"
                value={agentForm.seniority}
                onChange={(e) => setAgentForm({ ...agentForm, seniority: e.target.value })}
              >
                <option value="Junior">Junior Temsilci</option>
                <option value="Mid">Mid Seviye Temsilci</option>
                <option value="Senior">Senior (Kıdemli) Temsilci</option>
                <option value="Team Lead">Takım Lideri</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Haftalık Hedef Saat
              </label>
              <input
                type="number"
                step="0.5"
                className="input"
                value={agentForm.contractHoursWeekly}
                onChange={(e) => setAgentForm({ ...agentForm, contractHoursWeekly: Number(e.target.value) })}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Telefon Numarası
              </label>
              <input
                type="text"
                className="input"
                value={agentForm.phone}
                onChange={(e) => setAgentForm({ ...agentForm, phone: e.target.value })}
                placeholder="+90 532 ..."
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              E-Posta Adresi
            </label>
            <input
              type="email"
              className="input"
              value={agentForm.email}
              onChange={(e) => setAgentForm({ ...agentForm, email: e.target.value })}
              placeholder="ad.soyad@callcenter.com"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
            <button type="button" onClick={() => setIsAgentModalOpen(false)} className="btn btn-secondary btn-sm">
              İptal
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              {isEditingAgent ? 'Bilgileri Kaydet' : 'Temsilciyi Oluştur'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
