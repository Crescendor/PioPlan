// src/components/timeline/ShiftHandoverModal.jsx
import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { usePlan } from '../../context/PlanContext';
import { ShieldAlert, UserX, UserCheck, Clock, ArrowRight, AlertTriangle } from 'lucide-react';
import { formatTurkishDisplay } from '../../utils/dateUtils';

export function ShiftHandoverModal({ isOpen, onClose, assignment, defaultHour }) {
  const { agents, teams, performShiftHandover } = usePlan();

  const [handoverHour, setHandoverHour] = useState(defaultHour !== undefined ? defaultHour : 14);
  const [selectedBackupLevel, setSelectedBackupLevel] = useState(1); // 1: Backup 1, 2: Backup 2, 3: Custom
  const [customAgentId, setCustomAgentId] = useState('');
  const [reason, setReason] = useState('Acil Sağlık / Rahatsızlık');

  if (!assignment) return null;

  const currentTeam = teams.find(t => t.id === assignment.teamId) || teams[0];
  const teamAgents = agents.filter(a => a.teamId === currentTeam.id);

  const primaryAgent = agents.find(a => a.id === assignment.primaryAgentId);
  const backup1 = agents.find(a => a.id === assignment.backupAgent1Id);
  const backup2 = agents.find(a => a.id === assignment.backupAgent2Id);

  const handleConfirmHandover = () => {
    let replacementId = null;
    if (selectedBackupLevel === 1) {
      replacementId = backup1?.id;
    } else if (selectedBackupLevel === 2) {
      replacementId = backup2?.id;
    } else {
      replacementId = customAgentId;
    }

    if (!replacementId) {
      alert('Lütfen görevi devralacak bir yedek temsilci belirleyin.');
      return;
    }

    performShiftHandover({
      assignmentId: assignment.id,
      replacementAgentId: replacementId,
      backupLevel: selectedBackupLevel,
      handoverHour,
      reason
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Acil Vardiya Devri & Yedek Atama"
      icon={<ShieldAlert size={22} color="#f59e0b" />}
      maxWidth="620px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Banner Alert */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}
        >
          <AlertTriangle size={24} color="#f59e0b" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 12.5, color: '#fef3c7' }}>
            <strong>Vardiya Kesintisi Devri:</strong> Çalışanın vardiyası belirtilen saat itibariyle kesilir ve 1. Yedek / 2. Yedek anında operasyona dahil edilir.
          </div>
        </div>

        {/* Current Shift Summary */}
        <div
          style={{
            padding: '14px',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Vardiyadan Çıkarılacak Asıl Çalışan</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f87171', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <UserX size={15} /> {primaryAgent?.name || 'Bilinmeyen'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
              {assignment.shiftName} ({assignment.startTime} - {assignment.endTime})
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tarih & Takım</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              {assignment.date}
            </div>
            <div style={{ fontSize: 11, color: currentTeam.color }}>
              {currentTeam.name}
            </div>
          </div>
        </div>

        {/* Devir Saati Seçimi */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Clock size={14} color="#38bdf8" /> Kesilme / Devir Başlangıç Saati
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <select
              className="select"
              value={handoverHour}
              onChange={(e) => setHandoverHour(Number(e.target.value))}
              style={{ width: 140, fontWeight: 700, fontFamily: 'var(--font-mono)' }}
            >
              {Array.from({ length: 24 }).map((_, h) => (
                <option key={h} value={h}>
                  Saat {String(h).padStart(2, '0')}:00
                </option>
              ))}
            </select>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              itibariyle kalan mesaiyi yedek personel tamamlayacaktır.
            </span>
          </div>
        </div>

        {/* Devralacak Yedek Seçimi (1. Yedek vs 2. Yedek vs Özel) */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
            Görevi Devralacak Personel (Yedek Rotasyonu)
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {/* Option 1: Backup 1 */}
            <div
              onClick={() => setSelectedBackupLevel(1)}
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${selectedBackupLevel === 1 ? '#f59e0b' : 'var(--border-subtle)'}`,
                background: selectedBackupLevel === 1 ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-surface)',
                cursor: backup1 ? 'pointer' : 'not-allowed',
                opacity: backup1 ? 1 : 0.5,
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="badge badge-warning" style={{ fontSize: 10 }}>
                  1. Yedek (Standby)
                </span>
                {selectedBackupLevel === 1 && <span style={{ color: '#f59e0b', fontWeight: 800 }}>✓ SEÇİLDİ</span>}
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#ffffff', marginTop: 6 }}>
                {backup1 ? backup1.name : 'Atanmış 1. Yedek Yok'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {backup1 ? `${backup1.seniority} - Hazırda Bekliyor` : 'Önceden atanmadı'}
              </div>
            </div>

            {/* Option 2: Backup 2 */}
            <div
              onClick={() => setSelectedBackupLevel(2)}
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${selectedBackupLevel === 2 ? '#8b5cf6' : 'var(--border-subtle)'}`,
                background: selectedBackupLevel === 2 ? 'rgba(139, 92, 246, 0.1)' : 'var(--bg-surface)',
                cursor: backup2 ? 'pointer' : 'not-allowed',
                opacity: backup2 ? 1 : 0.5,
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.4)', fontSize: 10 }}>
                  2. Yedek (Yedeğin Yedeği)
                </span>
                {selectedBackupLevel === 2 && <span style={{ color: '#c084fc', fontWeight: 800 }}>✓ SEÇİLDİ</span>}
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#ffffff', marginTop: 6 }}>
                {backup2 ? backup2.name : 'Atanmış 2. Yedek Yok'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {backup2 ? `${backup2.seniority} - İkincil Standby` : 'Önceden atanmadı'}
              </div>
            </div>
          </div>
        </div>

        {/* Mazeret / Açıklama */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            Kesinti / Devir Nedeni
          </label>
          <input
            type="text"
            className="input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Örn: Acil Sağlık Raporu, Teknik Arıza, İdari İzin..."
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
            İptal
          </button>
          <button
            type="button"
            onClick={handleConfirmHandover}
            className="btn btn-primary btn-sm"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
          >
            <ShieldAlert size={15} />
            <span>Devri Başlat ve Yedeği Devreye Sok</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
