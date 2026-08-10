// src/components/timeline/ContinuousTimeline24h.jsx
import React, { useState, useRef, useEffect } from 'react';
import { usePlan } from '../../context/PlanContext';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Users,
  Zap,
  Radio,
  ArrowRightLeft,
  AlertCircle,
  Calendar,
  Sparkles
} from 'lucide-react';
import {
  get24HourSlots,
  isShiftActiveAtHour,
  formatTurkishDisplay,
  formatDateISO,
  getMondayOfWeek,
  getDaysOfWeek
} from '../../utils/dateUtils';
import { ShiftHandoverModal } from './ShiftHandoverModal';

export function ContinuousTimeline24h() {
  const {
    teams,
    agents,
    assignments,
    selectedTeamId,
    setSelectedTeamId,
    currentDate,
    setCurrentDate
  } = usePlan();

  const [handoverModalState, setHandoverModalState] = useState({
    isOpen: false,
    assignment: null,
    defaultHour: 14
  });

  const [selectedTimelineDate, setSelectedTimelineDate] = useState(currentDate || '2026-08-10');
  const [filterTeamId, setFilterTeamId] = useState('all'); // 'all' | teamId
  const scrollContainerRef = useRef(null);

  const currentHourNow = new Date().getHours();
  const hourSlots = get24HourSlots();

  // 7-day quick switcher tabs based on current reference date
  const monday = getMondayOfWeek(new Date(selectedTimelineDate));
  const weekDays = getDaysOfWeek(monday);

  // Scroll to current hour automatically on initial mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      const scrollPos = Math.max(0, (currentHourNow - 2) * 75);
      scrollContainerRef.current.scrollLeft = scrollPos;
    }
  }, []);

  // Multi-day Navigation
  const handlePrevDay = () => {
    const d = new Date(selectedTimelineDate);
    d.setDate(d.getDate() - 1);
    setSelectedTimelineDate(formatDateISO(d));
  };

  const handleNextDay = () => {
    const d = new Date(selectedTimelineDate);
    d.setDate(d.getDate() + 1);
    setSelectedTimelineDate(formatDateISO(d));
  };

  const handleToday = () => {
    setSelectedTimelineDate(formatDateISO(new Date()));
  };

  // Bulk scroll timeline & handle cross-day boundary
  const handleBulkScroll = (hours) => {
    if (scrollContainerRef.current) {
      const currentScroll = scrollContainerRef.current.scrollLeft;
      const maxScroll = scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth;

      if (hours > 0 && currentScroll >= maxScroll - 30) {
        // Advanced past midnight, jump to next day
        handleNextDay();
        scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      } else if (hours < 0 && currentScroll <= 30) {
        // Rewinded before midnight, jump to prev day
        handlePrevDay();
        scrollContainerRef.current.scrollTo({ left: maxScroll, behavior: 'smooth' });
      } else {
        scrollContainerRef.current.scrollBy({
          left: hours * 75,
          behavior: 'smooth'
        });
      }
    }
  };

  const handleJumpToWindow = (startH) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: startH * 75,
        behavior: 'smooth'
      });
    }
  };

  // Filter assignments for selected date (matches real-time changes instantly!)
  const dateAssignments = assignments.filter(
    a => a.date === selectedTimelineDate && a.startTime !== 'OFF'
  );

  // Filter agents based on team filter
  const displayedAgents = agents.filter(a => {
    if (filterTeamId === 'all') return true;
    return a.teamId === filterTeamId;
  });

  // Calculate live agents currently on shift at current hour
  const isSelectedDateToday = formatDateISO(new Date()) === selectedTimelineDate;
  const liveTargetHour = isSelectedDateToday ? currentHourNow : 12; // Default to mid-day preview if looking at another day

  const liveActiveAssignments = dateAssignments.filter(asg =>
    isShiftActiveAtHour(asg.startTime, asg.endTime, liveTargetHour)
  );

  return (
    <div className="timeline-container">
      {/* 1. Live Cockpit Top Header */}
      <div className="timeline-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}
            >
              <Radio size={18} className="animate-pulse" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8 }}>
                24 Saatlik Canlı Timeline
                <span className="badge badge-success" style={{ fontSize: 10 }}>
                  ● CANLI İZLEME
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {formatTurkishDisplay(selectedTimelineDate)}
              </div>
            </div>
          </div>

          {/* Multi-Day Navigation */}
          <div className="date-controls" style={{ marginLeft: 8 }}>
            <button
              type="button"
              onClick={handlePrevDay}
              className="btn btn-outline btn-sm"
              style={{ padding: '4px 8px' }}
              title="Önceki Gün"
            >
              <ChevronLeft size={16} />
            </button>

            <input
              type="date"
              className="input"
              style={{ padding: '4px 8px', fontSize: 12.5, width: 140, border: 'none', background: 'transparent', textAlign: 'center', fontWeight: 700 }}
              value={selectedTimelineDate}
              onChange={(e) => setSelectedTimelineDate(e.target.value)}
            />

            <button
              type="button"
              onClick={handleNextDay}
              className="btn btn-outline btn-sm"
              style={{ padding: '4px 8px' }}
              title="Sonraki Gün"
            >
              <ChevronRight size={16} />
            </button>

            <button
              type="button"
              onClick={handleToday}
              className="btn btn-secondary btn-sm"
              style={{ padding: '4px 8px', fontSize: 11 }}
            >
              Bugün
            </button>
          </div>

          {/* Team Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setFilterTeamId('all')}
              className={`btn btn-sm ${filterTeamId === 'all' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: 11.5, padding: '4px 10px' }}
            >
              Tümü ({agents.length})
            </button>
            {teams.map(t => (
              <button
                key={t.id}
                onClick={() => setFilterTeamId(t.id)}
                className={`btn btn-sm ${filterTeamId === t.id ? 'btn-primary' : 'btn-outline'}`}
                style={{
                  fontSize: 11.5,
                  padding: '4px 10px',
                  borderColor: filterTeamId === t.id ? t.color : 'var(--border-subtle)'
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, display: 'inline-block' }} />
                {t.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Bulk Scroll & Quick Shift Windows */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="timeline-bulk-controls">
            <button
              type="button"
              onClick={() => handleBulkScroll(-4)}
              className="btn btn-outline btn-sm"
              style={{ padding: '4px 8px' }}
              title="4 Saat Geri Kaydır (Geceye veya Önceki Güne)"
            >
              <ChevronLeft size={14} /> -4s
            </button>

            <button
              type="button"
              onClick={() => handleJumpToWindow(8)}
              className="btn btn-secondary btn-sm"
              style={{ padding: '4px 8px', fontSize: 11 }}
            >
              Gündüz (08-16)
            </button>

            <button
              type="button"
              onClick={() => handleJumpToWindow(16)}
              className="btn btn-secondary btn-sm"
              style={{ padding: '4px 8px', fontSize: 11 }}
            >
              Akşam (16-00)
            </button>

            <button
              type="button"
              onClick={() => handleJumpToWindow(0)}
              className="btn btn-secondary btn-sm"
              style={{ padding: '4px 8px', fontSize: 11 }}
            >
              Gece (00-08)
            </button>

            <button
              type="button"
              onClick={() => handleBulkScroll(4)}
              className="btn btn-outline btn-sm"
              style={{ padding: '4px 8px' }}
              title="4 Saat İleri Kaydır (Sabaha veya Sonraki Güne)"
            >
              +4s <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Day Switcher Strip */}
      <div
        style={{
          padding: '6px 20px',
          background: 'rgba(22, 29, 47, 0.6)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          overflowX: 'auto'
        }}
      >
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 6, fontWeight: 600 }}>
          Hızlı Gün Seçimi:
        </span>
        {weekDays.map(day => {
          const isCurrent = day.iso === selectedTimelineDate;
          return (
            <button
              key={day.iso}
              type="button"
              onClick={() => setSelectedTimelineDate(day.iso)}
              style={{
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                border: `1px solid ${isCurrent ? '#3b82f6' : 'var(--border-subtle)'}`,
                background: isCurrent ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                color: isCurrent ? '#60a5fa' : 'var(--text-secondary)',
                fontSize: 11.5,
                fontWeight: isCurrent ? 700 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              {day.dayShort} {day.dayNumber} {day.monthName.slice(0, 3)}
              {day.isToday && <span style={{ color: '#38bdf8', marginLeft: 4 }}>•</span>}
            </button>
          );
        })}
      </div>

      {/* 3. Realtime Status Bar: Who is on Shift AT THIS TIME */}
      <div
        style={{
          padding: '10px 24px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#38bdf8' }}>
            <Clock size={15} />
            {isSelectedDateToday ? `Şu Anki Saat (${String(currentHourNow).padStart(2, '0')}:00):` : `Seçili Saat (${String(liveTargetHour).padStart(2, '0')}:00):`}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {liveActiveAssignments.length === 0 ? (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Bu saatte aktif çalışan bulunmuyor veya dinlenme molası.
              </span>
            ) : (
              liveActiveAssignments.map(asg => {
                const ag = agents.find(a => a.id === asg.primaryAgentId);
                const tm = teams.find(t => t.id === asg.teamId);
                const isHandoverShift = asg.isHandoverTakeover;

                return (
                  <div
                    key={asg.id}
                    onClick={() => setHandoverModalState({ isOpen: true, assignment: asg, defaultHour: liveTargetHour })}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      background: isHandoverShift ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                      border: `1px solid ${isHandoverShift ? '#f59e0b' : (tm?.color || '#3b82f6')}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 11.5,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover:scale-105"
                    title={isHandoverShift ? `Yedek devraldı (${asg.startTime}-${asg.endTime})` : `Aktif Görevde (${asg.startTime}-${asg.endTime}) - Tıklayarak acil devir yapabilirsiniz`}
                  >
                    <span className="pulse-dot online" />
                    <strong style={{ color: '#ffffff' }}>{ag?.name || 'Temsilci'}</strong>
                    {isHandoverShift && (
                      <span className="badge badge-warning" style={{ fontSize: 9, padding: '1px 4px' }}>
                        ⚡ YEDEK DEVRALDI
                      </span>
                    )}
                    <span style={{ color: tm?.color, fontSize: 10 }}>({tm?.code})</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{asg.startTime}-{asg.endTime}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
          Toplam <strong>{liveActiveAssignments.length}</strong> temsilci aktif hatta.
        </div>
      </div>

      {/* 4. Horizontal Scrollable 24-Hour Gantt Timeline */}
      <div className="timeline-scroll-wrapper" ref={scrollContainerRef}>
        <div className="timeline-grid">
          {/* Top Row: Empty corner + 24 Hours Headers */}
          <div
            style={{
              padding: '12px 16px',
              fontWeight: 800,
              fontSize: 12,
              background: 'var(--bg-surface-elevated)',
              borderBottom: '1px solid var(--border-subtle)',
              borderRight: '1px solid var(--border-subtle)',
              position: 'sticky',
              left: 0,
              zIndex: 15
            }}
          >
            Temsilciler & Takımlar
          </div>

          {hourSlots.map(slot => {
            const isNow = isSelectedDateToday && slot.hour === currentHourNow;
            return (
              <div
                key={slot.hour}
                className={`timeline-hour-header ${isNow ? 'current-hour' : ''}`}
                title={slot.timeWindow}
              >
                <div>{slot.label}</div>
                {isNow && (
                  <div style={{ fontSize: 8.5, color: '#f87171', fontWeight: 800, textTransform: 'uppercase' }}>
                    ŞU AN
                  </div>
                )}
              </div>
            );
          })}

          {/* Agent Rows */}
          {displayedAgents.map(agent => {
            const agentTeam = teams.find(t => t.id === agent.teamId) || teams[0];
            
            // An agent can have multiple assignment segments (e.g. initial shift before handover + takeover shift after handover)
            const agentAssignments = dateAssignments.filter(a => a.primaryAgentId === agent.id);

            return (
              <div key={agent.id} className="timeline-row">
                {/* Agent Sticky Left Card */}
                <div className="timeline-agent-label">
                  <div
                    className="agent-avatar"
                    style={{ background: agent.avatarBg || agentTeam.color, width: 28, height: 28, fontSize: 11 }}
                  >
                    {agent.avatar || 'AG'}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {agent.name}
                    </div>
                    <div style={{ fontSize: 10, color: agentTeam.color, fontWeight: 600 }}>
                      {agentTeam.name.split(' ')[0]} • {agent.seniority}
                    </div>
                  </div>
                </div>

                {/* 24 Hour Slots for this Agent */}
                {hourSlots.map(slot => {
                  const isNow = isSelectedDateToday && slot.hour === currentHourNow;

                  // Find if any assignment for this agent is active at this slot hour
                  const activeAssignment = agentAssignments.find(a =>
                    isShiftActiveAtHour(a.startTime, a.endTime, slot.hour)
                  );

                  return (
                    <div
                      key={slot.hour}
                      className={`timeline-slot-cell ${isNow ? 'now-highlight' : ''}`}
                    >
                      {activeAssignment && (
                        <div
                          className="timeline-active-block"
                          style={{
                            background: activeAssignment.isHandoverTakeover
                              ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                              : activeAssignment.isHandedOver
                              ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
                              : (activeAssignment.color || agentTeam.color),
                            border: activeAssignment.isHandoverTakeover
                              ? '1px solid #fbbf24'
                              : activeAssignment.isHandedOver
                              ? '1px solid #f87171'
                              : 'none',
                            boxShadow: activeAssignment.isHandoverTakeover ? '0 0 10px rgba(245, 158, 11, 0.4)' : 'none'
                          }}
                          onClick={() => setHandoverModalState({
                            isOpen: true,
                            assignment: activeAssignment,
                            defaultHour: slot.hour
                          })}
                          title={`Vardiya: ${activeAssignment.shiftName} (${activeAssignment.startTime} - ${activeAssignment.endTime})\n${activeAssignment.isHandoverTakeover ? '⚡ Yedek bu saatte devraldı.' : activeAssignment.isHandedOver ? '⏸️ Vardiya bu saatten sonra kesildi.' : 'Tıklayarak acil yedek devri yapabilirsiniz.'}`}
                        >
                          <div style={{ fontSize: 9.5, fontWeight: 800, whiteSpace: 'nowrap' }}>
                            {activeAssignment.isHandoverTakeover ? '⚡ YEDEK' : (activeAssignment.shiftCode || activeAssignment.startTime)}
                          </div>
                          <div style={{ fontSize: 8, opacity: 0.9 }}>
                            {activeAssignment.startTime} - {activeAssignment.endTime}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Emergency Shift Handover Modal */}
      <ShiftHandoverModal
        isOpen={handoverModalState.isOpen}
        onClose={() => setHandoverModalState({ isOpen: false, assignment: null, defaultHour: 14 })}
        assignment={handoverModalState.assignment}
        defaultHour={handoverModalState.defaultHour}
      />
    </div>
  );
}
