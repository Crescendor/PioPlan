// src/components/scheduler/ClearScheduleModal.jsx
import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { usePlan } from '../../context/PlanContext';
import { Trash2, AlertTriangle, Calendar, ShieldCheck, Check, Layers } from 'lucide-react';

export function ClearScheduleModal({
  isOpen,
  onClose,
  currentTeam,
  currentDays = [],
  periodLabel = 'Bu Hafta'
}) {
  const { clearSchedule, assignments } = usePlan();
  const [selectedScope, setSelectedScope] = useState('period'); // 'period' | 'team_all' | 'all'

  if (!isOpen || !currentTeam) return null;

  const currentDayIsoList = currentDays.map(d => typeof d === 'string' ? d : d.iso);
  const currentPeriodCount = assignments.filter(
    a => a.teamId === currentTeam.id && currentDayIsoList.includes(a.date)
  ).length;

  const teamTotalCount = assignments.filter(a => a.teamId === currentTeam.id).length;
  const allTotalCount = assignments.length;

  const handleConfirmClear = () => {
    if (selectedScope === 'period') {
      clearSchedule({
        teamId: currentTeam.id,
        dateList: currentDayIsoList,
        scope: 'period'
      });
    } else if (selectedScope === 'team_all') {
      clearSchedule({
        teamId: currentTeam.id,
        scope: 'team_all'
      });
    } else if (selectedScope === 'all') {
      clearSchedule({
        scope: 'all'
      });
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Vardiya Planını Temizle"
      icon={<Trash2 size={20} color="#ef4444" />}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Hangi kapsamdaki vardiya atamalarını silmek istediğinizi seçin:
        </p>

        {/* Scope Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* 1. Period (Week / Month) */}
          <div
            onClick={() => setSelectedScope('period')}
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              background: selectedScope === 'period' ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-surface)',
              border: `1.5px solid ${selectedScope === 'period' ? '#ef4444' : 'var(--border-subtle)'}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              transition: 'all 0.15s ease'
            }}
          >
            <Calendar size={18} color={selectedScope === 'period' ? '#ef4444' : 'var(--text-muted)'} style={{ marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Sadece {periodLabel} Programını Temizle</span>
                <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                  {currentPeriodCount} vardiya
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Yalnızca <strong>{currentTeam.name}</strong> takımının bu aktif dönemdeki ({currentDays.length} gün) atamalarını siler.
              </div>
            </div>
          </div>

          {/* 2. Team All */}
          <div
            onClick={() => setSelectedScope('team_all')}
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              background: selectedScope === 'team_all' ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-surface)',
              border: `1.5px solid ${selectedScope === 'team_all' ? '#ef4444' : 'var(--border-subtle)'}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              transition: 'all 0.15s ease'
            }}
          >
            <ShieldCheck size={18} color={selectedScope === 'team_all' ? '#ef4444' : 'var(--text-muted)'} style={{ marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Bu Takımın Tüm Programını Temizle</span>
                <span className="badge badge-warning" style={{ fontSize: 11 }}>
                  {teamTotalCount} vardiya
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                <strong>{currentTeam.name}</strong> takımına ait geçmiş ve gelecek tüm vardiya çizelgesini sıfırlar.
              </div>
            </div>
          </div>

          {/* 3. All Teams */}
          <div
            onClick={() => setSelectedScope('all')}
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              background: selectedScope === 'all' ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-surface)',
              border: `1.5px solid ${selectedScope === 'all' ? '#ef4444' : 'var(--border-subtle)'}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              transition: 'all 0.15s ease'
            }}
          >
            <Layers size={18} color={selectedScope === 'all' ? '#ef4444' : 'var(--text-muted)'} style={{ marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Tüm Şirket / Tüm Takımların Planını Sıfırla</span>
                <span className="badge badge-danger" style={{ fontSize: 11 }}>
                  {allTotalCount} vardiya
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Sistemdeki tüm takımların ve çalışanların kayıtlı bütün vardiya çizelgesini tamamen siler.
              </div>
            </div>
          </div>
        </div>

        {/* Warning Callout */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#fca5a5',
            fontSize: 12
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>Bu işlem geri alınamaz. Seçili kapsamdaki vardiya atamaları kalıcı olarak silinecektir.</span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
            İptal
          </button>
          <button type="button" onClick={handleConfirmClear} className="btn btn-danger btn-sm">
            <Trash2 size={14} /> Planı Temizle
          </button>
        </div>
      </div>
    </Modal>
  );
}
