// src/components/teams/TeamManager.jsx
import React, { useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import {
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  Clock,
  Sparkles,
  Check,
  X,
  AlertCircle,
  Settings
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { calculateShiftDurationHours } from '../../utils/dateUtils';

const QUICK_RULE_SUGGESTIONS = [
  'Haftalık en az 2 gün (ardışık veya ayrı) dinlenme zorunludur.',
  'Her vardiyada en az 1 Senior veya Team Lead seviyesinde personel bulunmalıdır.',
  'Gece vardiyasından (00:00-08:30) çıkan personel en az 24 saat dinlendirilmelidir.',
  'Yoğun saatler olan 10:00 - 18:00 arasında aynı anda en az 3 temsilci aktif olmalıdır.',
  'Haftalık maksimum toplam mesai 45 saati geçemez.',
  'Operasyon haftanın 7 günü kesintisiz devam eder, izinler rotasyonla dağıtılır.',
  'Her vardiya için mutlaka 1. ve 2. yedek temsilci atanmış olmalıdır.'
];

export function TeamManager() {
  const {
    teams,
    addTeam,
    updateTeam,
    deleteTeam,
    addTeamRule,
    removeTeamRule,
    updateTeamRule,
    addShiftTemplate,
    updateShiftTemplate,
    deleteShiftTemplate,
    notify
  } = usePlan();

  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id || '');
  const [newRuleInput, setNewRuleInput] = useState('');
  const [editingRuleIndex, setEditingRuleIndex] = useState(null);
  const [editingRuleText, setEditingRuleText] = useState('');

  // Team Create / Edit Modals
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [teamForm, setTeamForm] = useState({
    name: '',
    code: '',
    color: '#3b82f6',
    description: ''
  });

  // Shift Template Modal
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    code: '',
    startTime: '09:00',
    endTime: '18:00',
    color: '#3b82f6',
    minRequired: 2,
    maxCapacity: 5
  });

  const currentTeam = teams.find(t => t.id === selectedTeamId) || teams[0] || null;

  // Team Form Handlers
  const handleOpenCreateTeam = () => {
    setIsEditingTeam(false);
    setTeamForm({ name: '', code: '', color: '#3b82f6', description: '' });
    setIsTeamModalOpen(true);
  };

  const handleOpenEditTeam = () => {
    if (!currentTeam) return;
    setIsEditingTeam(true);
    setTeamForm({
      name: currentTeam.name,
      code: currentTeam.code,
      color: currentTeam.color,
      description: currentTeam.description || ''
    });
    setIsTeamModalOpen(true);
  };

  const handleSaveTeam = (e) => {
    e.preventDefault();
    if (!teamForm.name.trim()) return;

    if (isEditingTeam && currentTeam) {
      updateTeam({
        ...currentTeam,
        name: teamForm.name,
        code: teamForm.code,
        color: teamForm.color,
        description: teamForm.description
      });
    } else {
      const created = addTeam(teamForm);
      setSelectedTeamId(created.id);
    }
    setIsTeamModalOpen(false);
  };

  // Shift Template Form Handlers
  const handleOpenAddTemplate = () => {
    if (!currentTeam) return;
    setEditingTemplateId(null);
    setTemplateForm({
      name: 'Sabah Satış (09:00 - 18:00)',
      code: 'SAT-09',
      startTime: '09:00',
      endTime: '18:00',
      color: currentTeam.color || '#10b981',
      minRequired: 2,
      maxCapacity: 5
    });
    setIsTemplateModalOpen(true);
  };

  const handleOpenEditTemplate = (tmpl) => {
    if (!currentTeam) return;
    setEditingTemplateId(tmpl.id);
    setTemplateForm({
      name: tmpl.name,
      code: tmpl.code,
      startTime: tmpl.startTime,
      endTime: tmpl.endTime,
      color: tmpl.color || currentTeam.color,
      minRequired: tmpl.minRequired || 1,
      maxCapacity: tmpl.maxCapacity || 4
    });
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = (e) => {
    e.preventDefault();
    if (!templateForm.name.trim() || !currentTeam) return;

    const durationHours = calculateShiftDurationHours(templateForm.startTime, templateForm.endTime);

    if (editingTemplateId) {
      updateShiftTemplate(currentTeam.id, editingTemplateId, {
        ...templateForm,
        durationHours
      });
    } else {
      addShiftTemplate(currentTeam.id, {
        ...templateForm,
        durationHours
      });
    }
    setIsTemplateModalOpen(false);
  };

  const handleDeleteTemplate = (tmplId) => {
    if (!currentTeam) return;
    if (window.confirm('Bu vardiya şablonunu silmek istediğinizden emin misiniz?')) {
      deleteShiftTemplate(currentTeam.id, tmplId);
    }
  };

  // Rules Handlers
  const handleAddRule = (e) => {
    e.preventDefault();
    if (!newRuleInput.trim() || !currentTeam) return;
    addTeamRule(currentTeam.id, newRuleInput);
    setNewRuleInput('');
  };

  const handleQuickAddRule = (ruleStr) => {
    if (!currentTeam) return;
    addTeamRule(currentTeam.id, ruleStr);
  };

  const handleSaveEditRule = (idx) => {
    if (!editingRuleText.trim() || !currentTeam) return;
    updateTeamRule(currentTeam.id, idx, editingRuleText);
    setEditingRuleIndex(null);
    setEditingRuleText('');
    notify('Takım kuralı güncellendi.');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
      {/* Left Column: Team List */}
      <div className="glass-panel" style={{ padding: 20, height: 'fit-content' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={18} color="var(--pioneers-purple)" /> Takımlar ({teams.length})
          </h3>
          <button
            onClick={handleOpenCreateTeam}
            className="btn btn-primary btn-sm"
          >
            <Plus size={14} /> Yeni Takım
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {teams.length === 0 ? (
            <div style={{ padding: '24px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>
              Henüz kayıtlı takım yok. "Yeni Takım" butonuna basarak ilk takımınızı oluşturun.
            </div>
          ) : (
            teams.map(team => {
              const isSelected = currentTeam && team.id === currentTeam.id;
              return (
                <div
                  key={team.id}
                  onClick={() => setSelectedTeamId(team.id)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                    border: `1.5px solid ${isSelected ? team.color : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? `0 0 15px ${team.color}25` : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#ffffff' }}>
                      {team.name}
                    </span>
                    <span className="badge" style={{ background: `${team.color}20`, color: team.color, border: `1px solid ${team.color}40`, fontSize: 10 }}>
                      {team.code}
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {team.description}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>📋 {team.rules?.length || 0} Kural</span>
                    <span>⏰ {team.shiftTemplates?.length || 0} Vardiya</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Selected Team's Rules & Custom Shift Templates */}
      {currentTeam ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Team Details Header */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: currentTeam.color || '#3b82f6' }}>
                    {currentTeam.name}
                  </h2>
                  <span className="badge badge-neutral">{currentTeam.code}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                  {currentTeam.description}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={handleOpenEditTeam}
                  className="btn btn-secondary btn-sm"
                  title="Takım Bilgilerini Düzenle"
                >
                  <Edit2 size={13} /> Takımı Düzenle
                </button>

                {teams.length > 1 && (
                  <button
                    onClick={() => {
                      if (window.confirm(`${currentTeam.name} takımını silmek istediğinizden emin misiniz?`)) {
                        deleteTeam(currentTeam.id);
                      }
                    }}
                    className="btn btn-danger btn-sm"
                  >
                    <Trash2 size={13} /> Sil
                  </button>
                )}
              </div>
            </div>

            {/* Section: Custom Shift Templates for this Team */}
            <div style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={16} color="#38bdf8" /> {currentTeam.name} İçin Özel Vardiyalar ({currentTeam.shiftTemplates?.length || 0})
                </h4>
                <button
                  onClick={handleOpenAddTemplate}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: 12 }}
                >
                  <Plus size={13} /> Vardiya Ekle (Örn: 09:00 - 18:00)
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                {(currentTeam.shiftTemplates || []).map(tmpl => (
                  <div
                    key={tmpl.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-surface)',
                      border: `1px solid ${tmpl.color || 'var(--border-subtle)'}`,
                      borderLeft: `4px solid ${tmpl.color || '#3b82f6'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 8
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: '#ffffff' }}>
                          {tmpl.name}
                        </span>
                        <span className="badge" style={{ background: `${tmpl.color || '#3b82f6'}20`, color: tmpl.color || '#3b82f6', fontSize: 10 }}>
                          {tmpl.code}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#38bdf8', fontFamily: 'var(--font-mono)', marginTop: 4, fontWeight: 600 }}>
                        {tmpl.startTime === 'OFF' ? 'İzinli / OFF' : `${tmpl.startTime} - ${tmpl.endTime} (${tmpl.durationHours} Saat)`}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        Kapasite: Min. {tmpl.minRequired || 1} Personel
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, borderTop: '1px solid var(--border-subtle)', paddingTop: 6 }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEditTemplate(tmpl)}
                        className="btn btn-outline btn-sm"
                        style={{ padding: '3px 6px', fontSize: 11 }}
                        title="Vardiyayı Düzenle"
                      >
                        <Edit2 size={12} /> Düzenle
                      </button>
                      {tmpl.startTime !== 'OFF' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tmpl.id)}
                          className="btn btn-danger btn-sm"
                          style={{ padding: '3px 6px', fontSize: 11 }}
                          title="Vardiyayı Sil"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Line-by-Line Rules Editor */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={18} color="#10b981" /> Satır Satır Takım Kuralları
                  <span className="pioneers-badge">
                    <Sparkles size={10} /> AI Uyumlu
                  </span>
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Pioneers AI vardiya planlarken bu kuralları satır satır işler ve denetim raporunda doğrular.
                </p>
              </div>
            </div>

            {/* Add Rule Input */}
            <form onSubmit={handleAddRule} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <input
                type="text"
                className="input"
                value={newRuleInput}
                onChange={(e) => setNewRuleInput(e.target.value)}
                placeholder="Örn: Hafta içi her gün en az 3 temsilci aktif olmalı..."
              />
              <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }}>
                <Plus size={16} /> Kural Ekle
              </button>
            </form>

            {/* Quick Suggestion Pills */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                Hızlı Kural Şablonları (Tek Tıkla Ekle):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {QUICK_RULE_SUGGESTIONS.map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleQuickAddRule(sug)}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: 11, padding: '3px 8px', borderRadius: 'var(--radius-full)' }}
                  >
                    + {sug.slice(0, 38)}...
                  </button>
                ))}
              </div>
            </div>

            {/* Rules List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(currentTeam.rules || []).length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  Bu takıma henüz kural tanımlanmamış. Yukarıdan yeni kural ekleyebilirsiniz.
                </div>
              ) : (
                currentTeam.rules.map((rule, idx) => (
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
                    {editingRuleIndex === idx ? (
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
                          onClick={() => setEditingRuleIndex(null)}
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
                              color: 'var(--text-secondary)',
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
                              setEditingRuleIndex(idx);
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
                            onClick={() => removeTeamRule(currentTeam.id, idx)}
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
      ) : (
        <div className="glass-panel" style={{ padding: '60px 30px', textAlign: 'center' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 'var(--radius-lg)',
              background: 'rgba(139, 92, 246, 0.15)',
              color: '#a78bfa',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16
            }}
          >
            <ShieldCheck size={30} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#ffffff', marginBottom: 8 }}>
            Çağrı Merkezi Takım Yönetimi
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 460, margin: '0 auto 20px' }}>
            Şirketinizdeki Inbound, Outbound, Canlı Destek veya Teknik Destek gibi departman takımlarını oluşturarak başlayın.
          </p>
          <button onClick={handleOpenCreateTeam} className="btn btn-primary" style={{ padding: '10px 24px' }}>
            <Plus size={16} /> İlk Takımı Oluştur
          </button>
        </div>
      )}

      {/* Team Create / Edit Modal */}
      <Modal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        title={isEditingTeam ? `${currentTeam?.name} Takımını Düzenle` : 'Yeni Çağrı Merkezi Takımı Ekle'}
      >
        <form onSubmit={handleSaveTeam} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Takım Adı
            </label>
            <input
              type="text"
              className="input"
              value={teamForm.name}
              onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
              placeholder="Örn: Outbound Satış & Telemarketing"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Takım Kodu
              </label>
              <input
                type="text"
                className="input"
                value={teamForm.code}
                onChange={(e) => setTeamForm({ ...teamForm, code: e.target.value.toUpperCase() })}
                placeholder="Örn: OUT-SALES"
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Takım Rengi
              </label>
              <input
                type="color"
                className="input"
                style={{ height: 42, padding: 4 }}
                value={teamForm.color}
                onChange={(e) => setTeamForm({ ...teamForm, color: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Açıklama & Operasyonel Rol
            </label>
            <textarea
              className="textarea"
              rows={3}
              value={teamForm.description}
              onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
              placeholder="Takımın operasyondaki sorumluluk alanı..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
            <button type="button" onClick={() => setIsTeamModalOpen(false)} className="btn btn-secondary btn-sm">
              İptal
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              {isEditingTeam ? 'Değişiklikleri Kaydet' : 'Takımı Oluştur'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Shift Template Add / Edit Modal */}
      {currentTeam && (
        <Modal
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          title={editingTemplateId ? 'Vardiya Şablonunu Düzenle' : `${currentTeam.name} İçin Özel Vardiya Ekle`}
          icon={<Clock size={20} />}
        >
          <form onSubmit={handleSaveTemplate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Vardiya Adı
              </label>
              <input
                type="text"
                className="input"
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                placeholder="Örn: Sabah Satış (09:00 - 18:00)"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Vardiya Kodu
                </label>
                <input
                  type="text"
                  className="input"
                  value={templateForm.code}
                  onChange={(e) => setTemplateForm({ ...templateForm, code: e.target.value.toUpperCase() })}
                  placeholder="Örn: SAT-0918"
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Vardiya Rengi
                </label>
                <input
                  type="color"
                  className="input"
                  style={{ height: 42, padding: 4 }}
                  value={templateForm.color}
                  onChange={(e) => setTemplateForm({ ...templateForm, color: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Başlangıç Saati
                </label>
                <input
                  type="time"
                  className="input"
                  value={templateForm.startTime}
                  onChange={(e) => setTemplateForm({ ...templateForm, startTime: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Bitiş Saati
                </label>
                <input
                  type="time"
                  className="input"
                  value={templateForm.endTime}
                  onChange={(e) => setTemplateForm({ ...templateForm, endTime: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Min. Gerekli Personel
                </label>
                <input
                  type="number"
                  min="1"
                  className="input"
                  value={templateForm.minRequired}
                  onChange={(e) => setTemplateForm({ ...templateForm, minRequired: Number(e.target.value) })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Maks. Kapasite
                </label>
                <input
                  type="number"
                  min="1"
                  className="input"
                  value={templateForm.maxCapacity}
                  onChange={(e) => setTemplateForm({ ...templateForm, maxCapacity: Number(e.target.value) })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
              <button type="button" onClick={() => setIsTemplateModalOpen(false)} className="btn btn-secondary btn-sm">
                İptal
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                {editingTemplateId ? 'Vardiyayı Kaydet' : 'Vardiyayı Ekle'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
