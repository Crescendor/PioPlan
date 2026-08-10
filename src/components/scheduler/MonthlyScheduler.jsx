// src/components/scheduler/MonthlyScheduler.jsx
import React, { useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Download,
  Calendar,
  Clock,
  User,
  Plus
} from 'lucide-react';
import {
  getDaysInMonth,
  formatDateISO,
  TURKISH_MONTHS,
  TURKISH_DAYS_SHORT
} from '../../utils/dateUtils';
import { ShiftEditModal } from './ShiftEditModal';
import { AiAuditScorecard } from './AiAuditScorecard';
import { exportTeamRosterPdf } from '../../services/pdfService';

export function MonthlyScheduler({ onOpenAiModal }) {
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
    isAiGenerating,
    notify
  } = usePlan();

  const [modalState, setModalState] = useState({
    isOpen: false,
    assignment: null,
    date: null,
    agentId: null
  });

  const currentTeam = teams.find(t => t.id === selectedTeamId) || teams[0];
  const teamAgents = agents.filter(a => a.teamId === currentTeam.id);

  const parsedDate = new Date(currentDate);
  const currentYear = parsedDate.getFullYear();
  const currentMonth = parsedDate.getMonth();

  const monthDays = getDaysInMonth(currentYear, currentMonth);
  const monthTitle = `${TURKISH_MONTHS[currentMonth]} ${currentYear}`;

  const handlePrevMonth = () => {
    const d = new Date(currentYear, currentMonth - 1, 1);
    setCurrentDate(formatDateISO(d));
  };

  const handleNextMonth = () => {
    const d = new Date(currentYear, currentMonth + 1, 1);
    setCurrentDate(formatDateISO(d));
  };

  const handleExportPdf = () => {
    exportTeamRosterPdf({
      team: currentTeam,
      agents: teamAgents,
      days: monthDays.slice(0, 14), // clean two-week slice for readable PDF or full month
      assignments,
      periodLabel: `Aylık Roster (${monthTitle})`
    });
    notify(`${currentTeam.name} ${monthTitle} programı PDF olarak indirildi.`, 'success');
  };

  return (
    <div>
      {/* Header */}
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
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: t.color }} />
                <span>{t.name}</span>
                <span className="badge badge-neutral" style={{ fontSize: 10 }}>{t.code}</span>
              </button>
            );
          })}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
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

          <div className="date-controls">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="btn btn-outline btn-sm"
              style={{ padding: '4px 8px' }}
              title="Önceki Ay"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="date-display-label">
              {monthTitle}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="btn btn-outline btn-sm"
              style={{ padding: '4px 8px' }}
              title="Sonraki Ay"
            >
              <ChevronRight size={16} />
            </button>
          </div>

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
          >
            <Download size={14} />
            <span>PDF İndir</span>
          </button>
        </div>
      </div>

      {/* Monthly Calendar Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 8,
          background: 'var(--bg-surface)',
          padding: 12,
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)'
        }}
      >
        {/* Day Name Headers */}
        {TURKISH_DAYS_SHORT.map((dayName, idx) => (
          <div
            key={dayName}
            style={{
              padding: '8px 4px',
              textAlign: 'center',
              fontWeight: 700,
              fontSize: 12,
              color: idx >= 5 ? '#f59e0b' : 'var(--text-secondary)',
              background: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            {dayName}
          </div>
        ))}

        {/* Empty padding cells for first day of month alignment */}
        {Array.from({ length: monthDays[0].dayIndex }).map((_, i) => (
          <div key={`empty-${i}`} style={{ minHeight: 90, opacity: 0.3 }} />
        ))}

        {/* Month Day Cells */}
        {monthDays.map(day => {
          const dayAssignments = assignments.filter(
            a => a.date === day.iso && a.teamId === currentTeam.id && a.startTime !== 'OFF'
          );

          return (
            <div
              key={day.iso}
              style={{
                minHeight: 110,
                background: day.isToday ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-surface-elevated)',
                border: day.isToday ? '1px solid #3b82f6' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 6px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}
            >
              {/* Day Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 13,
                    color: day.isToday ? '#38bdf8' : day.isWeekend ? '#fbbf24' : 'var(--text-primary)'
                  }}
                >
                  {day.dayNumber}
                </span>
                {dayAssignments.length > 0 && (
                  <span className="badge badge-neutral" style={{ fontSize: 9 }}>
                    {dayAssignments.length} Vardiya
                  </span>
                )}
              </div>

              {/* Day Shifts Chips */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                {dayAssignments.slice(0, 3).map(asg => {
                  const agent = agents.find(a => a.id === asg.primaryAgentId);
                  return (
                    <div
                      key={asg.id}
                      onClick={() => setModalState({ isOpen: true, assignment: asg, date: day.iso, agentId: asg.primaryAgentId })}
                      style={{
                        padding: '3px 5px',
                        borderRadius: 4,
                        background: `${asg.color || '#3b82f6'}20`,
                        border: `1px solid ${asg.color || '#3b82f6'}60`,
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                      title={`${agent?.name || 'Temsilci'} (${asg.shiftName} ${asg.startTime}-${asg.endTime})`}
                    >
                      <span>{agent?.name.split(' ')[0] || 'Atanmadı'}</span>
                      <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{asg.shiftCode || asg.startTime}</span>
                    </div>
                  );
                })}

                {dayAssignments.length > 3 && (
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center' }}>
                    +{dayAssignments.length - 3} daha...
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setModalState({ isOpen: true, assignment: null, date: day.iso, agentId: null })}
                style={{
                  background: 'transparent',
                  border: '1px dashed rgba(255, 255, 255, 0.1)',
                  borderRadius: 4,
                  padding: '2px 0',
                  color: 'var(--text-muted)',
                  fontSize: 9,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2
                }}
                className="hover:border-blue-400 hover:text-white"
              >
                <Plus size={10} /> Ekle
              </button>
            </div>
          );
        })}
      </div>

      {/* AI Audit Scorecard */}
      <AiAuditScorecard />

      {/* Shift Edit Modal */}
      <ShiftEditModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, assignment: null, date: null, agentId: null })}
        assignment={modalState.assignment}
        date={modalState.date}
        initialAgentId={modalState.agentId}
        teamId={currentTeam.id}
      />
    </div>
  );
}
