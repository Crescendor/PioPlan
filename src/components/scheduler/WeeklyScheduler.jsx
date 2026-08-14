// src/components/scheduler/WeeklyScheduler.jsx
import React, { useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Download,
  Plus,
  Clock,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Calendar as CalendarIcon,
  Trash2,
  Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  getMondayOfWeek,
  getDaysOfWeek,
  formatDateISO,
  TURKISH_MONTHS
} from '../../utils/dateUtils';
import { ShiftEditModal } from './ShiftEditModal';
import { AiAuditScorecard } from './AiAuditScorecard';
import { ClearScheduleModal } from './ClearScheduleModal';
import { exportTeamRosterPdf } from '../../services/pdfService';
import { solveWfmSchedule } from '../../services/wfmSolver';

export function WeeklyScheduler({ onOpenAiModal }) {
  const {
    teams,
    agents,
    assignments,
    selectedTeamId,
    setSelectedTeamId,
    currentDate,
    setCurrentDate,
    period,
    setPeriod,
    setCurrentView,
    isAiGenerating,
    applyAgentSchedule,
    notify
  } = usePlan();

  const [modalState, setModalState] = useState({
    isOpen: false,
    assignment: null,
    date: null,
    agentId: null
  });

  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const currentTeam = teams.find(t => t.id === selectedTeamId) || teams[0] || null;
  const teamAgents = currentTeam ? agents.filter(a => a.role !== 'admin' && a.teamId === currentTeam.id) : [];

  // Compute current week days
  const monday = getMondayOfWeek(new Date(currentDate || '2026-08-10'));
  const weekDays = getDaysOfWeek(monday);

  const startDay = weekDays[0];
  const endDay = weekDays[6];
  const weekTitle = `${startDay.dayNumber} ${startDay.monthName} - ${endDay.dayNumber} ${endDay.monthName} ${startDay.date.getFullYear()}`;

  // Date Navigation
  const handlePrevWeek = () => {
    const d = new Date(monday);
    d.setDate(d.getDate() - 7);
    setCurrentDate(formatDateISO(d));
  };

  const handleNextWeek = () => {
    const d = new Date(monday);
    d.setDate(d.getDate() + 7);
    setCurrentDate(formatDateISO(d));
  };

  const handleToday = () => {
    setCurrentDate(formatDateISO(getMondayOfWeek(new Date())));
  };

  // 1-Click Instant 7/24 Call Center Plan
  const handleQuick724Plan = () => {
    if (!currentTeam || teamAgents.length === 0) {
      notify('Takımda kayıtlı çalışan bulunamadı.', 'warning');
      return;
    }
    const result = solveWfmSchedule({
      team: currentTeam,
      agents: teamAgents,
      days: weekDays
    });
    if (result && result.assignments) {
      applyAgentSchedule(result.assignments, weekDays, currentTeam.id);
      try {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      } catch (e) {}
      notify(`${currentTeam.name} için 7/24 kesintisiz vardiya planı ve yedekler uygulandı.`, 'success', '7/24 Hat Planı Hazır');
    }
  };

  // Export PDF
  const handleExportPdf = () => {
    if (!currentTeam) return;
    exportTeamRosterPdf({
      team: currentTeam,
      agents: teamAgents,
      days: weekDays,
      assignments,
      periodLabel: `Haftalık Roster (${weekTitle})`
    });
    notify(`${currentTeam.name} haftalık programı PDF olarak indirildi.`, 'success');
  };

  // Helper to calculate total weekly hours for an agent
  const getAgentWeeklyHours = (agentId) => {
    const agentAssignments = assignments.filter(
      asg => asg.primaryAgentId === agentId &&
      weekDays.some(d => d.iso === asg.date)
    );
    return agentAssignments.reduce((acc, asg) => acc + (asg.durationHours || 0), 0);
  };

  if (!currentTeam || teams.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '60px 30px', textAlign: 'center' }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(59, 130, 246, 0.15)',
            color: '#38bdf8',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16
          }}
        >
          <ShieldCheck size={30} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#ffffff', marginBottom: 8 }}>
          Henüz Bir Takım Oluşturulmamış
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto 20px', lineHeight: 1.5 }}>
          Vardiya çizelgelemesi ve Pioneers AI optimizasyonlarını başlatmak için lütfen önce ilk çağrı merkezi takımınızı oluşturun.
        </p>
        <button
          onClick={() => setCurrentView('teams')}
          className="btn btn-primary"
          style={{ padding: '10px 24px' }}
        >
          <Plus size={16} /> Takımlar & Kurallar Sekmesine Git
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Top Header & Team Selector */}
      <div className="scheduler-header">
        {/* Team Selector Pills */}
        <div className="team-selector-pills">
          {teams.map(t => {
            const isActive = t.id === currentTeam.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTeamId(t.id)}
                className={`team-pill ${isActive ? 'active' : ''}`}
                style={{
                  borderColor: isActive ? t.color : 'var(--border-subtle)',
                  boxShadow: isActive ? `0 0 15px ${t.color}30` : 'none'
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: t.color
                  }}
                />
                <span>{t.name}</span>
                <span className="badge badge-neutral" style={{ fontSize: 10 }}>
                  {t.code}
                </span>
              </button>
            );
          })}
        </div>

        {/* Date Navigation & View Mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Period Toggle */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: 2
            }}
          >
            <button
              type="button"
              onClick={() => setPeriod('week')}
              className={`btn btn-sm ${period === 'week' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '4px 10px', fontSize: 12 }}
            >
              Haftalık
            </button>
            <button
              type="button"
              onClick={() => setPeriod('month')}
              className={`btn btn-sm ${period === 'month' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '4px 10px', fontSize: 12 }}
            >
              Aylık
            </button>
          </div>

          {/* Week Date Picker */}
          <div className="date-controls">
            <button
              type="button"
              onClick={handlePrevWeek}
              className="btn btn-outline btn-sm"
              style={{ padding: '4px 8px' }}
              title="Önceki Hafta"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="date-display-label">
              {weekTitle}
            </div>

            <button
              type="button"
              onClick={handleNextWeek}
              className="btn btn-outline btn-sm"
              style={{ padding: '4px 8px' }}
              title="Sonraki Hafta"
            >
              <ChevronRight size={16} />
            </button>

            <button
              type="button"
              onClick={handleToday}
              className="btn btn-secondary btn-sm"
              style={{ padding: '4px 10px', fontSize: 11.5 }}
            >
              Bu Hafta
            </button>
          </div>

          {/* Action Buttons */}
          <button
            type="button"
            onClick={handleQuick724Plan}
            className="btn btn-primary btn-sm"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', padding: '6px 12px', fontSize: 12.5 }}
            title="Takımın tüm vardiyalarını 7 gün kesintisiz ve kurallara %100 uyumlu olarak 1 tıkla anında planla"
          >
            <Zap size={14} />
            <span>7/24 Kesintisiz Planla</span>
          </button>

          <button
            type="button"
            onClick={onOpenAiModal}
            disabled={isAiGenerating}
            className="btn btn-ai btn-sm"
          >
            <Sparkles size={14} className={isAiGenerating ? 'animate-spin' : ''} />
            <span>Pioneers AI ile Planla</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            className="btn btn-outline btn-sm"
            title="Haftalık Programı PDF Olarak İndir"
          >
            <Download size={14} />
            <span>PDF İndir</span>
          </button>

          <button
            type="button"
            onClick={() => setIsClearModalOpen(true)}
            className="btn btn-danger btn-sm"
            style={{ padding: '6px 10px' }}
            title="Vardiya Planını Temizle"
          >
            <Trash2 size={14} />
            <span>Planı Temizle</span>
          </button>
        </div>
      </div>

      {/* Main Weekly Scheduler Table */}
      <div className="scheduler-table-container">
        <table className="scheduler-table">
          <thead>
            <tr>
              <th className="agent-row-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Temsilci ({teamAgents.length})</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Haftalık Saat</span>
                </div>
              </th>
              {weekDays.map(day => (
                <th
                  key={day.iso}
                  className={day.isToday ? 'today-col' : ''}
                  style={{ minWidth: 170 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{day.dayShort}, {day.dayNumber} {day.monthName}</span>
                    {day.isToday && <span className="badge badge-info" style={{ fontSize: 9 }}>BUGÜN</span>}
                    {day.isWeekend && !day.isToday && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>H.Sonu</span>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teamAgents.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  Bu takımda henüz çalışan bulunmuyor. "Çalışanlar" sekmesinden yeni temsilci ekleyebilirsiniz.
                </td>
              </tr>
            ) : (
              teamAgents.map(agent => {
                const totalWeeklyHours = getAgentWeeklyHours(agent.id);
                const targetHours = agent.contractHoursWeekly || 42.5;
                const isOvertime = totalWeeklyHours > targetHours;

                return (
                  <tr key={agent.id}>
                    {/* Agent Profile Cell */}
                    <td className="agent-row-header">
                      <div className="agent-cell-info">
                        <div
                          className="agent-avatar"
                          style={{ background: agent.avatarBg || '#3b82f6' }}
                        >
                          {agent.avatar || 'AG'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {agent.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <span className="badge badge-neutral" style={{ fontSize: 10 }}>
                              {agent.seniority}
                            </span>
                            <span
                              className={`badge ${isOvertime ? 'badge-warning' : 'badge-success'}`}
                              style={{ fontSize: 10 }}
                            >
                              {totalWeeklyHours.toFixed(1)} / {targetHours}s
                            </span>
                          </div>
                          {agent.rules?.length > 0 && (
                            <div style={{ fontSize: 10.5, color: '#38bdf8', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              ⚠️ {agent.rules[0]}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 7 Days Shift Slots */}
                    {weekDays.map(day => {
                      // Primary assignment
                      const primaryAsg = assignments.find(
                        a => a.date === day.iso && a.primaryAgentId === agent.id && a.teamId === currentTeam.id
                      );

                      // Backup assignments where this agent is standby
                      const standby1Asgs = assignments.filter(
                        a => a.date === day.iso && a.backupAgent1Id === agent.id && a.teamId === currentTeam.id
                      );
                      const standby2Asgs = assignments.filter(
                        a => a.date === day.iso && a.backupAgent2Id === agent.id && a.teamId === currentTeam.id
                      );

                      // Find backup agent names for tooltip / badge
                      const b1Agent = primaryAsg?.backupAgent1Id ? agents.find(a => a.id === primaryAsg.backupAgent1Id) : null;
                      const b2Agent = primaryAsg?.backupAgent2Id ? agents.find(a => a.id === primaryAsg.backupAgent2Id) : null;

                      return (
                        <td
                          key={day.iso}
                          style={{
                            background: day.isToday ? 'rgba(59, 130, 246, 0.03)' : 'transparent',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            setModalState({
                              isOpen: true,
                              assignment: primaryAsg || null,
                              date: day.iso,
                              agentId: agent.id
                            });
                          }}
                        >
                          {primaryAsg ? (
                            <div
                              className={`shift-card ${primaryAsg.startTime === 'OFF' ? 'is-off' : ''} ${primaryAsg.isHandedOver ? 'handed-over' : ''}`}
                              style={{
                                background: primaryAsg.startTime === 'OFF' ? 'rgba(100, 116, 139, 0.12)' : `${primaryAsg.color || '#3b82f6'}18`,
                                borderColor: primaryAsg.isHandedOver ? '#f59e0b' : (primaryAsg.color || 'var(--border-subtle)')
                              }}
                            >
                              <div className="shift-header">
                                <span style={{ color: primaryAsg.startTime === 'OFF' ? 'var(--text-muted)' : (primaryAsg.color || '#3b82f6') }}>
                                  {primaryAsg.shiftCode || primaryAsg.shiftName}
                                </span>
                                {primaryAsg.startTime !== 'OFF' && (
                                  <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                                    {primaryAsg.durationHours}s
                                  </span>
                                )}
                              </div>

                              <div className="shift-time">
                                <Clock size={11} />
                                <span>
                                  {primaryAsg.startTime === 'OFF' ? 'İzinli / OFF' : `${primaryAsg.startTime} - ${primaryAsg.endTime}`}
                                </span>
                              </div>

                              {/* Handover Notice */}
                              {primaryAsg.isHandedOver && (
                                <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700, marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <ShieldAlert size={10} /> Devredildi ({primaryAsg.handoverDetails?.handoverTime})
                                </div>
                              )}

                              {/* 1st and 2nd Backup Pills */}
                              {primaryAsg.startTime !== 'OFF' && (b1Agent || b2Agent) && (
                                <div className="backup-pill-group">
                                  {b1Agent && (
                                    <span className="backup-mini-tag" style={{ color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.3)' }} title={`1. Yedek: ${b1Agent.name}`}>
                                      1.Y: {b1Agent.name.split(' ')[0]}
                                    </span>
                                  )}
                                  {b2Agent && (
                                    <span className="backup-mini-tag" style={{ color: '#c084fc', border: '1px solid rgba(192, 132, 252, 0.3)' }} title={`2. Yedek: ${b2Agent.name}`}>
                                      2.Y: {b2Agent.name.split(' ')[0]}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div
                              style={{
                                height: 50,
                                border: '1px dashed var(--border-subtle)',
                                borderRadius: 'var(--radius-md)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-muted)',
                                fontSize: 11,
                                gap: 4,
                                transition: 'all 0.15s ease'
                              }}
                              className="hover:border-blue-500 hover:text-white"
                            >
                              <Plus size={13} /> Vardiya Ata
                            </div>
                          )}

                          {/* Standby Duty Indicator */}
                          {standby1Asgs.length > 0 && (
                            <div
                              style={{
                                marginTop: 4,
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: 'rgba(245, 158, 11, 0.12)',
                                border: '1px solid rgba(245, 158, 11, 0.25)',
                                color: '#fbbf24',
                                fontSize: 10,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                              title="Bu tarihte 1. Yedek olarak görevli"
                            >
                              <ShieldAlert size={10} /> 1. Yedek Nöbeti
                            </div>
                          )}
                          {standby2Asgs.length > 0 && (
                            <div
                              style={{
                                marginTop: 3,
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: 'rgba(139, 92, 246, 0.12)',
                                border: '1px solid rgba(139, 92, 246, 0.25)',
                                color: '#c084fc',
                                fontSize: 10,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                              title="Bu tarihte 2. Yedek olarak görevli"
                            >
                              <ShieldAlert size={10} /> 2. Yedek Nöbeti
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* AI Audit Scorecard Report at the bottom */}
      <AiAuditScorecard />

      {/* Shift Edit Modal */}
      {currentTeam && (
        <ShiftEditModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState({ isOpen: false, assignment: null, date: null, agentId: null })}
          assignment={modalState.assignment}
          date={modalState.date}
          initialAgentId={modalState.agentId}
          teamId={currentTeam.id}
        />
      )}

      {/* Clear Schedule Modal */}
      {currentTeam && (
        <ClearScheduleModal
          isOpen={isClearModalOpen}
          onClose={() => setIsClearModalOpen(false)}
          currentTeam={currentTeam}
          currentDays={weekDays}
          periodLabel={`Bu Hafta (${weekTitle})`}
        />
      )}
    </div>
  );
}
