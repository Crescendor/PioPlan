// src/components/scheduler/ShiftEditModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { usePlan } from '../../context/PlanContext';
import { Calendar, Clock, ShieldAlert, User, Check, Trash2 } from 'lucide-react';
import { formatTurkishDisplay } from '../../utils/dateUtils';

export function ShiftEditModal({ isOpen, onClose, assignment, date, initialAgentId, teamId }) {
  const { teams, agents, updateAssignment, addAssignment, deleteAssignment } = usePlan();

  const currentTeam = teams.find(t => t.id === teamId) || teams[0] || null;
  const teamAgents = currentTeam ? agents.filter(a => a.teamId === currentTeam.id) : [];

  const [selectedTemplateId, setSelectedTemplateId] = useState(
    assignment ? assignment.shiftTemplateId : (currentTeam?.shiftTemplates?.[0]?.id || '')
  );
  const [primaryAgentId, setPrimaryAgentId] = useState(
    assignment ? assignment.primaryAgentId : (initialAgentId || teamAgents[0]?.id || '')
  );
  const [backup1Id, setBackup1Id] = useState(assignment ? assignment.backupAgent1Id : '');
  const [backup2Id, setBackup2Id] = useState(assignment ? assignment.backupAgent2Id : '');
  const [notes, setNotes] = useState(assignment?.notes || '');

  useEffect(() => {
    if (assignment) {
      setSelectedTemplateId(assignment.shiftTemplateId);
      setPrimaryAgentId(assignment.primaryAgentId);
      setBackup1Id(assignment.backupAgent1Id || '');
      setBackup2Id(assignment.backupAgent2Id || '');
      setNotes(assignment.notes || '');
    } else {
      setSelectedTemplateId(currentTeam?.shiftTemplates?.[0]?.id || '');
      setPrimaryAgentId(initialAgentId || teamAgents[0]?.id || '');
      setBackup1Id('');
      setBackup2Id('');
      setNotes('');
    }
  }, [assignment, initialAgentId, currentTeam]);

  if (!isOpen || !currentTeam) return null;

  const handleSave = () => {
    const template = currentTeam.shiftTemplates?.find(t => t.id === selectedTemplateId) || 
                     currentTeam.shiftTemplates?.[0] || {
                       id: 's_default',
                       name: 'Genel Vardiya (09:00 - 18:00)',
                       code: 'VARD',
                       startTime: '09:00',
                       endTime: '18:00',
                       durationHours: 9.0,
                       color: '#3b82f6'
                     };

    const payload = {
      date: assignment ? assignment.date : date,
      teamId: currentTeam.id,
      shiftTemplateId: template.id,
      shiftName: template.name,
      shiftCode: template.code,
      startTime: template.startTime,
      endTime: template.endTime,
      durationHours: template.durationHours,
      color: template.color,
      primaryAgentId,
      backupAgent1Id: backup1Id || null,
      backupAgent2Id: backup2Id || null,
      notes
    };

    if (assignment) {
      updateAssignment(assignment.id, payload);
    } else {
      addAssignment(payload);
    }
    onClose();
  };

  const handleDelete = () => {
    if (assignment) {
      deleteAssignment(assignment.id);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={assignment ? 'Vardiyayı Düzenle' : 'Yeni Vardiya Ata'}
      icon={<Clock size={20} />}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Date & Team Display */}
        <div
          style={{
            padding: '10px 14px',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tarih</div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>
              {formatTurkishDisplay(assignment ? assignment.date : date)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Takım</div>
            <div style={{ fontWeight: 700, color: currentTeam.color, fontSize: 13 }}>
              {currentTeam.name}
            </div>
          </div>
        </div>

        {/* Shift Template Selector */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            Vardiya Şablonu
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
            {(currentTeam.shiftTemplates || []).map(tmpl => {
              const isSelected = selectedTemplateId === tmpl.id;
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => setSelectedTemplateId(tmpl.id)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${isSelected ? tmpl.color : 'var(--border-subtle)'}`,
                    background: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                    color: isSelected ? 'white' : 'var(--text-secondary)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    boxShadow: isSelected ? `0 0 12px ${tmpl.color}40` : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 12, color: tmpl.color }}>
                    {tmpl.code}
                  </div>
                  <div style={{ fontSize: 11, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {tmpl.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    {tmpl.startTime === 'OFF' ? 'İzin' : `${tmpl.startTime} - ${tmpl.endTime}`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary Agent */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            Asıl Görevli Temsilci
          </label>
          <select
            className="select"
            value={primaryAgentId}
            onChange={(e) => setPrimaryAgentId(e.target.value)}
          >
            {teamAgents.length === 0 ? (
              <option value="">Bu takımda henüz temsilci yok</option>
            ) : (
              teamAgents.map(ag => (
                <option key={ag.id} value={ag.id}>
                  {ag.name} ({ag.seniority})
                </option>
              ))
            )}
          </select>
        </div>

        {/* 1st and 2nd Backup Assigners */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
              <ShieldAlert size={13} /> 1. Yedek (Standby)
            </label>
            <select
              className="select"
              value={backup1Id}
              onChange={(e) => setBackup1Id(e.target.value)}
            >
              <option value="">-- Yedek Seçilmedi --</option>
              {teamAgents.filter(a => a.id !== primaryAgentId).map(ag => (
                <option key={ag.id} value={ag.id}>
                  {ag.name} ({ag.seniority})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
              <ShieldAlert size={13} /> 2. Yedek (Yedeğin Yedeği)
            </label>
            <select
              className="select"
              value={backup2Id}
              onChange={(e) => setBackup2Id(e.target.value)}
            >
              <option value="">-- 2. Yedek Seçilmedi --</option>
              {teamAgents.filter(a => a.id !== primaryAgentId && a.id !== backup1Id).map(ag => (
                <option key={ag.id} value={ag.id}>
                  {ag.name} ({ag.seniority})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            Notlar & Özel Talimatlar
          </label>
          <input
            type="text"
            className="input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Örn: Pik saat desteği, eğitim sonrası vs."
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          {assignment ? (
            <button
              type="button"
              onClick={handleDelete}
              className="btn btn-danger btn-sm"
              title="Vardiyayı Kaldır"
            >
              <Trash2 size={14} /> Vardiyayı Sil
            </button>
          ) : <div />}

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
              İptal
            </button>
            <button type="button" onClick={handleSave} className="btn btn-primary btn-sm">
              <Check size={14} /> Kaydet
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
