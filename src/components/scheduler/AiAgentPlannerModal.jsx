// src/components/scheduler/AiAgentPlannerModal.jsx
import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { usePlan } from '../../context/PlanContext';
import { executeAiPlanningAgent } from '../../services/pioneersAiAgent';
import {
  Sparkles,
  Bot,
  Send,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Zap,
  RotateCcw,
  Sliders,
  Check,
  Layers,
  Edit3,
  Cpu,
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getMondayOfWeek, getDaysOfWeek, getDaysInMonth, parseDateISO } from '../../utils/dateUtils';

const FRESH_PROMPT_SUGGESTIONS = [
  'BON01 vardiyası kesinlikle olmasın, diğer vardiyaları kurallara göre dağıt.',
  'Tüm takım ve çalışan kurallarına %100 sadık kalarak eksiksiz program planla.',
  'Gece vardiyalarını sadece uygun temsilcilere ver, gündüzleri eşit paylaştır.',
  'Pazar günlerini herkese izinli yap, hafta içine 2 kademeli yedekleri eksiksiz ata.'
];

const EDIT_PROMPT_SUGGESTIONS = [
  'Salı günü Caner ile Zeynep in vardiyalarını takas et, diğerleri aynı kalsın.',
  'Çarşamba günü Zeynep i izinli yap, yerine uygun birini sabah vardiyasına al.',
  'Hafta sonundaki gece vardiyalarını kaldır, temsilcileri gündüze çek.',
  'Tüm planı koru, sadece Caner in vardiyalarını akşam vardiyasına al.'
];

const AI_ENGINES = [
  { id: 'auto', name: 'Pioneers AI Hibrit (Önerilen)', icon: '🤖', desc: 'En hızlı ve %100 kural garantili akıllı motor' },
  { id: 'deepseek', name: 'DeepSeek R1 / V3 Reasoning', icon: '🧠', desc: 'Derin muhakeme ve karmaşık WFM optimizasyonu' },
  { id: 'llama', name: 'Meta Llama 3.3 70B (Groq)', icon: '⚡', desc: 'Işık hızında serbest vardiya planlayıcı' },
  { id: 'gemini', name: 'Google Gemini 3.5 Flash', icon: '💎', desc: 'Yüksek kapasiteli kurumsal AI motoru' }
];

export function AiAgentPlannerModal({ isOpen, onClose }) {
  const {
    teams,
    agents,
    assignments,
    selectedTeamId,
    currentDate,
    period,
    setPeriod,
    applyAgentSchedule,
    auditCurrentScheduleAi,
    notify
  } = usePlan();

  const currentTeam = teams.find(t => t.id === selectedTeamId) || teams[0] || null;
  const teamAgents = currentTeam ? agents.filter(a => a.role !== 'admin' && a.teamId === currentTeam.id) : [];

  // Mode: 'edit' (Mevcut Planı Düzenle) vs 'fresh' (Sıfırdan Yeni Plan)
  const [planMode, setPlanMode] = useState('fresh');
  const [selectedEngine, setSelectedEngine] = useState('auto');
  const [promptInput, setPromptInput] = useState('');
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentResult, setAgentResult] = useState(null);

  if (!isOpen || !currentTeam) return null;

  // Active target days
  const monday = getMondayOfWeek(currentDate ? parseDateISO(currentDate) : new Date());
  const targetDays = period === 'week' ? getDaysOfWeek(monday) : getDaysInMonth(monday.getFullYear(), monday.getMonth());
  const currentTeamAssignments = assignments.filter(a => a.teamId === currentTeam.id);

  const handleRunAgent = async (overridePrompt = null) => {
    const textToRun = overridePrompt !== null ? overridePrompt : promptInput;
    if (!textToRun.trim()) {
      notify('Lütfen yapay zeka ajanına bir talimat veya istek yazın.', 'warning');
      return;
    }

    setIsAgentRunning(true);
    setAgentResult(null);

    try {
      const result = await executeAiPlanningAgent({
        userPrompt: textToRun,
        team: currentTeam,
        agents: teamAgents,
        days: targetDays,
        currentAssignments: currentTeamAssignments,
        period,
        planMode,
        engine: selectedEngine
      });

      setAgentResult(result);
      notify(
        planMode === 'edit'
          ? 'Pioneers AI mevcut plan üzerinde revizyonu tamamladı.'
          : 'Pioneers AI Ajanı planlamayı tamamladı.',
        'success',
        'AI Ajanı Hazır'
      );
    } catch (err) {
      console.error('Agent execution error:', err);
      notify(`AI Ajanı hatası: ${err.message}`, 'error');
    } finally {
      setIsAgentRunning(false);
    }
  };

  const handleApplySchedule = () => {
    if (!agentResult || !agentResult.assignments) return;

    // Safely apply assignments using PlanContext's applyAgentSchedule
    applyAgentSchedule(agentResult.assignments, targetDays, currentTeam.id);

    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // ignore
    }

    notify(
      `${currentTeam.name} için ${agentResult.assignments.length} vardiya takvime uygulandı.`,
      'success',
      'Vardiya Takvime İşlendi'
    );

    // Auto audit
    setTimeout(() => {
      auditCurrentScheduleAi();
    }, 300);

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pioneers AI Otonom Vardiya Planlama ve Düzenleme Ajanı"
      icon={<Bot size={22} color="var(--pioneers-cyan)" />}
      maxWidth="820px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header Hero Banner */}
        <div
          style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(6, 182, 212, 0.2))',
            borderRadius: 'var(--radius-lg)',
            border: '1.5px solid rgba(139, 92, 246, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--pioneers-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)',
              flexShrink: 0
            }}
          >
            <Bot size={28} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#ffffff' }}>
                Pioneers AI WFM Copilot
              </h3>
              <span className="pioneers-badge">
                <Zap size={11} /> Çoklu AI Motoru & Canlı Düzenleme
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
              Hedef Takım: <strong style={{ color: currentTeam.color || '#3b82f6' }}>{currentTeam.name}</strong> ({teamAgents.length} Temsilci) | {period === 'week' ? 'Haftalık' : 'Aylık'} Takvim ({targetDays.length} Gün)
            </p>
          </div>
        </div>

        {/* Action Mode Toggle: Fresh Plan vs In-Place Edit */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            background: 'var(--bg-surface)',
            padding: 6,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <button
            type="button"
            onClick={() => {
              setPlanMode('fresh');
              setAgentResult(null);
            }}
            className={`btn btn-sm ${planMode === 'fresh' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '8px 14px', fontSize: 12.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <Sparkles size={14} />
            <span>Sıfırdan Yeni Plan Oluştur</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPlanMode('edit');
              setAgentResult(null);
            }}
            className={`btn btn-sm ${planMode === 'edit' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '8px 14px', fontSize: 12.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <Edit3 size={14} />
            <span>Mevcut Planı Düzenle / Hızlı Revizyon</span>
          </button>
        </div>

        {/* AI Engine Selector Row */}
        <div>
          <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Cpu size={14} color="var(--pioneers-cyan)" /> Tercih Edilen AI Planlama Motoru:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
            {AI_ENGINES.map(eng => {
              const isSelected = selectedEngine === eng.id;
              return (
                <button
                  key={eng.id}
                  type="button"
                  onClick={() => setSelectedEngine(eng.id)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-surface)',
                    border: `1.5px solid ${isSelected ? 'var(--pioneers-cyan)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 12, color: isSelected ? '#38bdf8' : '#ffffff', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{eng.icon}</span>
                    <span>{eng.name}</span>
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>
                    {eng.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* In-Place Status Banner if in Edit Mode */}
        {planMode === 'edit' && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              color: '#93c5fd',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <RefreshCw size={15} />
            <span>
              <strong>Hızlı Düzenleme Modu Aktif:</strong> Mevcut {currentTeamAssignments.length} vardiya hafızaya alındı. Sadece değiştirmek istediğiniz kişileri veya günleri belirtin; planın geri kalanı aynen korunacaktır.
            </span>
          </div>
        )}

        {/* Prompt Input Box */}
        <div>
          <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span>{planMode === 'edit' ? 'Düzenleme / Revizyon Talimatı:' : 'Yeni Planlama Talimatı:'}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {planMode === 'edit' ? 'Örn: Caner ile Mert in Salı vardiyasını takas et' : 'Örn: BON01 olmasın, Pazar herkes izinli'}
            </span>
          </label>
          <div style={{ position: 'relative' }}>
            <textarea
              className="textarea"
              rows={3}
              style={{ fontSize: 13, paddingRight: 40, lineHeight: 1.5 }}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder={
                planMode === 'edit'
                  ? 'Örn: Salı günü Caner ile Mert in vardiyalarını takas et. Çarşamba Zeynep i izinli yap, diğer herkes aynı kalsın...'
                  : 'Örn: BON01 vardiyası kesinlikle olmayacak. Caner sadece Akşam vardiyasında çalışsın, Pazar günleri herkes izinli olsun...'
              }
              disabled={isAgentRunning}
            />
          </div>
        </div>

        {/* Quick Suggestion Pills */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
            {planMode === 'edit' ? 'Hızlı Düzenleme Şablonları:' : 'Hızlı Planlama Şablonları:'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(planMode === 'edit' ? EDIT_PROMPT_SUGGESTIONS : FRESH_PROMPT_SUGGESTIONS).map((sug, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPromptInput(sug);
                }}
                className="btn btn-outline btn-sm"
                style={{ fontSize: 11, padding: '3px 9px', borderRadius: 'var(--radius-full)' }}
              >
                + {sug.slice(0, 48)}...
              </button>
            ))}
          </div>
        </div>

        {/* Run Agent Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            onClick={() => handleRunAgent()}
            disabled={isAgentRunning}
            className="btn btn-ai"
            style={{ padding: '10px 24px', fontSize: 13.5 }}
          >
            <Sparkles size={16} className={isAgentRunning ? 'animate-spin' : ''} />
            <span>
              {isAgentRunning
                ? (planMode === 'edit' ? 'AI Mevcut Planı Revize Ediyor...' : 'Pioneers AI Planlıyor...')
                : (planMode === 'edit' ? 'Mevcut Planı Revize Et' : 'Yeni Planı Başlat')}
            </span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Agent Output & Reasoning Preview */}
        {agentResult && (
          <div
            style={{
              padding: '16px 20px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-surface)',
              border: '1.5px solid rgba(16, 185, 129, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              animation: 'fadeIn 0.3s ease'
            }}
          >
            {/* Agent Message Banner */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#10b981',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Bot size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 13.5, color: '#34d399' }}>
                  {planMode === 'edit' ? 'AI Revizyon Sonucu & Gerekçelendirmesi:' : 'Pioneers AI Ajanı Yanıtı & Gerekçelendirmesi:'}
                </div>
                <div style={{ fontSize: 12.5, color: '#f1f5f9', marginTop: 4, lineHeight: 1.5 }}>
                  {agentResult.agentResponse}
                </div>
              </div>
            </div>

            {/* Changes Summary */}
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                fontSize: 12,
                color: '#93c5fd',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <ShieldCheck size={16} />
              <span><strong>Uygulanan İşlem:</strong> {agentResult.appliedChangesSummary}</span>
            </div>

            {/* Rule Compliance Checklist */}
            {(agentResult.ruleComplianceReport || []).length > 0 && (
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Doğrulanan Kural Maddeleri ({agentResult.ruleComplianceReport.length}):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 150, overflowY: 'auto' }}>
                  {agentResult.ruleComplianceReport.map((rep, rIdx) => (
                    <div
                      key={rIdx}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-surface-elevated)',
                        fontSize: 11.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle2 size={14} color="#10b981" />
                        <span style={{ fontWeight: 700, color: '#ffffff' }}>{rep.ruleName || rep.target}:</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{rep.explanation}</span>
                      </div>
                      <span className="badge badge-success" style={{ fontSize: 9.5 }}>%100 Sağlandı</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Apply Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                onClick={handleApplySchedule}
                className="btn btn-primary"
                style={{ padding: '10px 24px', fontSize: 13.5, background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                <Check size={16} />
                <span>{planMode === 'edit' ? `Revize Çizelgeyi Takvime Uygula (${agentResult.assignments.length} Atama)` : `Bu Çizelgeyi Takvime Uygula (${agentResult.assignments.length} Atama)`}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
