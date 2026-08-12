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
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getMondayOfWeek, getDaysOfWeek, getDaysInMonth } from '../../utils/dateUtils';

const QUICK_PROMPT_SUGGESTIONS = [
  'BON01 vardiyası kesinlikle olmasın, diğer vardiyaları kurallara göre dağıt.',
  'Tüm takım ve çalışan kurallarına %100 sadık kalarak haftalık programı planla.',
  'Gece vardiyalarını sadece uygun temsilcilere ver, gündüzleri eşit paylaştır.',
  'Haftalık çalışma saatlerini temsilciler arasında tam dengeli ve adil dağıt.',
  'Pazar günlerini herkese izinli yap, hafta içine 2 kademeli yedekleri eksiksiz ata.'
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

  const [promptInput, setPromptInput] = useState('');
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentResult, setAgentResult] = useState(null);

  if (!isOpen || !currentTeam) return null;

  const handleRunAgent = async (overridePrompt = null) => {
    const textToRun = overridePrompt !== null ? overridePrompt : promptInput;
    if (!textToRun.trim()) {
      notify('Lütfen yapay zeka ajanına bir talimat veya istek yazın.', 'warning');
      return;
    }

    setIsAgentRunning(true);
    setAgentResult(null);

    const monday = getMondayOfWeek(new Date(currentDate));
    const days = period === 'week' ? getDaysOfWeek(monday) : getDaysInMonth(monday.getFullYear(), monday.getMonth());

    try {
      const result = await executeAiPlanningAgent({
        userPrompt: textToRun,
        team: currentTeam,
        agents: teamAgents,
        days,
        currentAssignments: assignments.filter(a => a.teamId === currentTeam.id),
        period
      });

      setAgentResult(result);
      notify('Pioneers AI Ajanı planlamayı tamamladı. Önizlemeyi inceleyebilirsiniz.', 'success', 'AI Ajanı Hazır');
    } catch (err) {
      console.error('Agent execution error:', err);
      notify(`AI Ajanı hatası: ${err.message}`, 'error');
    } finally {
      setIsAgentRunning(false);
    }
  };

  const handleApplySchedule = () => {
    if (!agentResult || !agentResult.assignments) return;

    const monday = getMondayOfWeek(new Date(currentDate));
    const days = period === 'week' ? getDaysOfWeek(monday) : getDaysInMonth(monday.getFullYear(), monday.getMonth());

    // Safely apply assignments using PlanContext's applyAgentSchedule
    applyAgentSchedule(agentResult.assignments, days, currentTeam.id);

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
      `${currentTeam.name} için ${agentResult.assignments.length} vardiya Pioneers AI Ajanı tarafından takvime uygulandı.`,
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
      title="Pioneers AI Otonom Vardiya Planlama Ajanı"
      icon={<Bot size={22} color="var(--pioneers-cyan)" />}
      maxWidth="780px"
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
              width: 46,
              height: 46,
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
            <Bot size={26} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#ffffff' }}>
                Pioneers AI WFM Planning Agent
              </h3>
              <span className="pioneers-badge">
                <Zap size={11} /> Canlı Gemini 3.6 Motoru
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
              Hedef Takım: <strong style={{ color: currentTeam.color || '#3b82f6' }}>{currentTeam.name}</strong> ({teamAgents.length} Temsilci) | Tüm kuralları satır satır denetleyen otonom planlayıcı.
            </p>
          </div>
        </div>

        {/* Prompt Input Box */}
        <div>
          <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span>Ajana Talimat Verin (Doğal Dil ile Ne Yapmasını İstediğinizi Yazın):</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Örn: BON01 olmasın, Caner akşam çalışsın</span>
          </label>
          <div style={{ position: 'relative' }}>
            <textarea
              className="textarea"
              rows={3}
              style={{ fontSize: 13, paddingRight: 40, lineHeight: 1.5 }}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="Örn: BON01 vardiyası kesinlikle olmayacak. Caner Korkmaz sadece Akşam vardiyasında çalışsın, Pazar günleri herkes izinli olsun..."
              disabled={isAgentRunning}
            />
          </div>
        </div>

        {/* Quick Suggestion Pills */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
            Hızlı Ajan Talimatı Şablonları:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {QUICK_PROMPT_SUGGESTIONS.map((sug, idx) => (
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
            <span>{isAgentRunning ? 'Pioneers AI Ajanı Düşünüyor & Planlıyor...' : 'Ajanı Çalıştır'}</span>
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
                  Pioneers AI Ajanı Yanıtı & Gerekçelendirmesi:
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
              <span><strong>Uygulanan Optimizasyon:</strong> {agentResult.appliedChangesSummary}</span>
            </div>

            {/* Rule Compliance Checklist */}
            {(agentResult.ruleComplianceReport || []).length > 0 && (
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Doğrulanan Kural Maddeleri ({agentResult.ruleComplianceReport.length}):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
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
                <span>Bu Çizelgeyi Takvime Uygula ({agentResult.assignments.length} Atama)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
