// src/components/scheduler/AiGenerateModal.jsx
import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { usePlan } from '../../context/PlanContext';
import { Sparkles, ShieldCheck, UserCheck, Zap, AlertCircle, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export function AiGenerateModal({ isOpen, onClose }) {
  const {
    teams,
    agents,
    selectedTeamId,
    period,
    setPeriod,
    generateScheduleAi,
    isAiGenerating
  } = usePlan();

  const [customInstructions, setCustomInstructions] = useState('');
  const currentTeam = teams.find(t => t.id === selectedTeamId) || teams[0];
  const teamAgents = agents.filter(a => a.teamId === currentTeam.id);

  const handleGenerate = async () => {
    await generateScheduleAi(customInstructions);
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // ignore
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pioneers AI Otomatik Vardiya Optimizatörü"
      icon={<Sparkles size={20} />}
      maxWidth="650px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Banner */}
        <div
          style={{
            padding: '14px 18px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(6, 182, 212, 0.15))',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
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
              background: 'var(--pioneers-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              flexShrink: 0
            }}
          >
            <Zap size={22} fill="white" />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#ffffff', fontSize: 14 }}>
              Pioneers AI Kural & Kapasite Motoru
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Tüm takım ve temsilci kural kısıtlamalarını satır satır analiz ederek 1. ve 2. kademe yedekli kusursuz vardiya üretir.
            </div>
          </div>
        </div>

        {/* Target Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div
            style={{
              padding: '12px 14px',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Hedef Takım</div>
            <div style={{ fontWeight: 700, color: currentTeam.color, fontSize: 14, marginTop: 2 }}>
              {currentTeam.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
              {teamAgents.length} Kayıtlı Temsilci
            </div>
          </div>

          <div
            style={{
              padding: '12px 14px',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Planlama Periyodu</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button
                type="button"
                onClick={() => setPeriod('week')}
                className={`btn btn-sm ${period === 'week' ? 'btn-primary' : 'btn-outline'}`}
                style={{ flex: 1, padding: '4px 8px', fontSize: 12 }}
              >
                Haftalık (7 Gün)
              </button>
              <button
                type="button"
                onClick={() => setPeriod('month')}
                className={`btn btn-sm ${period === 'month' ? 'btn-primary' : 'btn-outline'}`}
                style={{ flex: 1, padding: '4px 8px', fontSize: 12 }}
              >
                Aylık (30 Gün)
              </button>
            </div>
          </div>
        </div>

        {/* Active Rules Summary */}
        <div
          style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            padding: '12px 16px',
            maxHeight: 150,
            overflowY: 'auto'
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={14} color="#10b981" /> İşlenecek Kural Kısıtlamaları ({currentTeam.rules?.length || 0} Takım, {teamAgents.reduce((acc, a) => acc + (a.rules?.length || 0), 0)} Kişi Kuralı)
          </div>
          <ul style={{ paddingLeft: 18, fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {(currentTeam.rules || []).map((r, i) => (
              <li key={`tr-${i}`} style={{ color: '#cbd5e1' }}>
                <strong>[Takım]</strong> {r}
              </li>
            ))}
            {teamAgents.flatMap(a => (a.rules || []).map((r, i) => (
              <li key={`ar-${a.id}-${i}`}>
                <strong style={{ color: '#38bdf8' }}>[{a.name}]</strong> {r}
              </li>
            )))}
          </ul>
        </div>

        {/* Custom Instructions Prompt Input */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            Ekstra Operasyonel Talimat (İsteğe Bağlı)
          </label>
          <textarea
            className="textarea"
            rows={3}
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="Örn: Bu hafta Çarşamba günü yeni kampanya başlıyor, 12:00-20:30 vardiyasına kıdemli temsilcileri önceliklendir..."
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isAiGenerating}
            className="btn btn-secondary btn-sm"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isAiGenerating}
            className="btn btn-ai btn-sm"
            style={{ padding: '8px 20px' }}
          >
            <Sparkles size={16} className={isAiGenerating ? 'animate-spin' : ''} />
            <span>{isAiGenerating ? 'Pioneers AI Planlıyor...' : 'Vardiyayı Optimize Et'}</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </Modal>
  );
}
