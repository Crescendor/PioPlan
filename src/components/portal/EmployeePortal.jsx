// src/components/portal/EmployeePortal.jsx
import React, { useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useAuth } from '../../context/AuthContext';
import {
  Calendar,
  Clock,
  Download,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  UserCheck,
  Award,
  Sparkles,
  Coffee
} from 'lucide-react';
import {
  getDaysInMonth,
  getDaysOfWeek,
  getMondayOfWeek,
  formatDateISO,
  TURKISH_MONTHS,
  formatTurkishDisplay
} from '../../utils/dateUtils';
import { exportEmployeeSchedulePdf } from '../../services/pdfService';

export function EmployeePortal() {
  const {
    agents,
    teams,
    assignments,
    currentDate,
    notify
  } = usePlan();

  const { currentUser } = useAuth();

  const [portalPeriod, setPortalPeriod] = useState('month'); // 'month' | 'week'
  const [activeDate, setActiveDate] = useState(currentDate || '2026-08-10');

  const currentAgent = agents.find(a => a.id === currentUser?.id) || currentUser || agents[0];
  const agentTeam = teams.find(t => t.id === currentAgent?.teamId) || { name: 'Genel Operasyon', code: 'GEN', color: '#3b82f6' };

  const parsedDate = new Date(activeDate);
  const currentYear = parsedDate.getFullYear();
  const currentMonth = parsedDate.getMonth();

  // Days list depending on period
  const monday = getMondayOfWeek(new Date(activeDate));
  const weekDays = getDaysOfWeek(monday);
  const monthDays = getDaysInMonth(currentYear, currentMonth);

  const activeDays = portalPeriod === 'week' ? weekDays : monthDays;
  const monthName = TURKISH_MONTHS[currentMonth];

  // Calculate stats for current month
  const monthlyAssignments = assignments.filter(asg => {
    if (!asg.date.startsWith(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`)) return false;
    return asg.primaryAgentId === currentAgent.id || asg.backupAgent1Id === currentAgent.id || asg.backupAgent2Id === currentAgent.id;
  });

  const totalPrimaryHours = monthlyAssignments
    .filter(a => a.primaryAgentId === currentAgent.id && a.startTime !== 'OFF')
    .reduce((acc, a) => acc + (a.durationHours || 0), 0);

  const totalOffDays = monthlyAssignments.filter(
    a => a.primaryAgentId === currentAgent.id && a.startTime === 'OFF'
  ).length;

  const totalStandbyDays = monthlyAssignments.filter(
    a => a.backupAgent1Id === currentAgent.id || a.backupAgent2Id === currentAgent.id
  ).length;

  const monthlyTargetHours = (currentAgent.contractHoursWeekly || 42.5) * 4;
  const progressPercent = Math.min(100, Math.round((totalPrimaryHours / Math.max(1, monthlyTargetHours)) * 100));

  // Date Navigators
  const handlePrev = () => {
    if (portalPeriod === 'week') {
      const d = new Date(monday);
      d.setDate(d.getDate() - 7);
      setActiveDate(formatDateISO(d));
    } else {
      const d = new Date(currentYear, currentMonth - 1, 1);
      setActiveDate(formatDateISO(d));
    }
  };

  const handleNext = () => {
    if (portalPeriod === 'week') {
      const d = new Date(monday);
      d.setDate(d.getDate() + 7);
      setActiveDate(formatDateISO(d));
    } else {
      const d = new Date(currentYear, currentMonth + 1, 1);
      setActiveDate(formatDateISO(d));
    }
  };

  // Export PDF
  const handleDownloadPdf = () => {
    exportEmployeeSchedulePdf({
      agent: currentAgent,
      team: agentTeam,
      assignments: monthlyAssignments,
      monthName,
      year: currentYear,
      totalHours: totalPrimaryHours,
      standbyCount: totalStandbyDays
    });
    notify(`${currentAgent.name} için ${monthName} ${currentYear} çalışma programı PDF olarak indirildi.`, 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 1. Hero Profile & Monthly Stats Card */}
      <div className="portal-hero">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div
              className="agent-avatar"
              style={{
                width: 64,
                height: 64,
                fontSize: 22,
                borderRadius: 'var(--radius-xl)',
                background: currentAgent.avatarBg || agentTeam.color || '#3b82f6',
                boxShadow: `0 0 25px ${agentTeam.color}50`
              }}
            >
              {currentAgent.avatar || 'AG'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#ffffff' }}>
                  {currentAgent.name}
                </h1>
                <span className="badge badge-neutral">{currentAgent.seniority}</span>
                <span
                  className="badge"
                  style={{
                    background: `${agentTeam.color}20`,
                    color: agentTeam.color,
                    border: `1px solid ${agentTeam.color}40`
                  }}
                >
                  {agentTeam.name}
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                {currentAgent.title || 'Müşteri Hizmetleri Temsilcisi'} • {currentAgent.email}
              </div>
            </div>
          </div>

          {/* PDF Download Button */}
          <button
            onClick={handleDownloadPdf}
            className="btn btn-primary"
            style={{ padding: '10px 20px', fontSize: 14 }}
          >
            <Download size={16} />
            <span>Vardiya Programını PDF İndir</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="portal-stats-grid">
          {/* Monthly Working Hours */}
          <div className="portal-stat-card">
            <div className="portal-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <Clock size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Aylık Toplam Çalışma</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#ffffff', marginTop: 2 }}>
                {totalPrimaryHours.toFixed(1)} <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>/ {monthlyTargetHours} Saat</span>
              </div>
              <div style={{ width: '100%', height: 6, background: 'rgba(255, 255, 255, 0.1)', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
                <div style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #3b82f6)', borderRadius: 3 }} />
              </div>
            </div>
          </div>

          {/* Standby / Backup Duties */}
          <div className="portal-stat-card">
            <div className="portal-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Yedek / Nöbet Görevleri</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fbbf24', marginTop: 2 }}>
                {totalStandbyDays} Gün
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                1. ve 2. Seviye Standby
              </div>
            </div>
          </div>

          {/* Rest / Off Days */}
          <div className="portal-stat-card">
            <div className="portal-stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
              <Coffee size={22} />
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Haftalık İzin (OFF)</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#c084fc', marginTop: 2 }}>
                {totalOffDays} Gün
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                Dinlenme günleri
              </div>
            </div>
          </div>

          {/* Contract Status */}
          <div className="portal-stat-card">
            <div className="portal-stat-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
              <Award size={22} />
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Sözleşme Tipi</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#ffffff', marginTop: 2 }}>
                {currentAgent.contractHoursWeekly || 42.5}s Tam Zamanlı
              </div>
              <div style={{ fontSize: 11, color: '#38bdf8', marginTop: 4 }}>
                Pioneers AI Onaylı
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Schedule Calendar View (Weekly or Monthly with Past/Future Navigation) */}
      <div className="glass-panel" style={{ padding: 24 }}>
        {/* Navigation & Period Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={18} color="var(--pioneers-cyan)" />
              {currentAgent.name} - Vardiya Çizelgesi
            </h3>

            <div className="date-controls">
              <button onClick={handlePrev} className="btn btn-outline btn-sm" style={{ padding: '4px 8px' }}>
                <ChevronLeft size={16} />
              </button>
              <div className="date-display-label">
                {portalPeriod === 'week' ? `Hafta: ${weekDays[0].dayNumber} - ${weekDays[6].dayNumber} ${monthName} ${currentYear}` : `${monthName} ${currentYear}`}
              </div>
              <button onClick={handleNext} className="btn btn-outline btn-sm" style={{ padding: '4px 8px' }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                onClick={() => setPortalPeriod('week')}
                className={`btn btn-sm ${portalPeriod === 'week' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '4px 10px', fontSize: 12 }}
              >
                Haftalık
              </button>
              <button
                type="button"
                onClick={() => setPortalPeriod('month')}
                className={`btn btn-sm ${portalPeriod === 'month' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '4px 10px', fontSize: 12 }}
              >
                Aylık
              </button>
            </div>
          </div>
        </div>

        {/* Shifts Grid Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: portalPeriod === 'week' ? 'repeat(7, 1fr)' : 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 12
          }}
        >
          {activeDays.map(day => {
            const primaryAsg = assignments.find(
              a => a.date === day.iso && a.primaryAgentId === currentAgent.id
            );
            const isStandby1 = assignments.some(
              a => a.date === day.iso && a.backupAgent1Id === currentAgent.id
            );
            const isStandby2 = assignments.some(
              a => a.date === day.iso && a.backupAgent2Id === currentAgent.id
            );

            const isOff = primaryAsg?.startTime === 'OFF';

            return (
              <div
                key={day.iso}
                style={{
                  borderRadius: 'var(--radius-lg)',
                  background: day.isToday ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-surface-elevated)',
                  border: day.isToday ? '1.5px solid #3b82f6' : '1px solid var(--border-subtle)',
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  transition: 'all 0.15s ease'
                }}
                className="hover:border-blue-400"
              >
                {/* Day Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: day.isToday ? '#38bdf8' : '#ffffff' }}>
                      {day.dayShort} {day.dayNumber}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                      {day.monthName}
                    </div>
                  </div>
                  {day.isToday && <span className="badge badge-info" style={{ fontSize: 9 }}>BUGÜN</span>}
                  {day.isWeekend && !day.isToday && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Hafta Sonu</span>}
                </div>

                {/* Primary Shift Card */}
                {primaryAsg ? (
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 'var(--radius-md)',
                      background: isOff ? 'rgba(100, 116, 139, 0.12)' : `${primaryAsg.color || '#3b82f6'}20`,
                      border: `1px solid ${isOff ? 'rgba(100, 116, 139, 0.3)' : (primaryAsg.color || '#3b82f6')}`,
                      borderLeft: `4px solid ${isOff ? '#64748b' : (primaryAsg.color || '#3b82f6')}`
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 12, color: isOff ? 'var(--text-muted)' : '#ffffff' }}>
                      {primaryAsg.shiftName}
                    </div>
                    <div style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', color: isOff ? 'var(--text-muted)' : '#38bdf8', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} />
                      {isOff ? 'Dinlenme / İzinli' : `${primaryAsg.startTime} - ${primaryAsg.endTime}`}
                    </div>
                    {!isOff && (
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4 }}>
                        Süre: <strong>{primaryAsg.durationHours} Saat</strong>
                      </div>
                    )}
                    {primaryAsg.isHandedOver && (
                      <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700, marginTop: 4 }}>
                        ⚠️ Saat {primaryAsg.handoverDetails?.handoverTime} devredildi
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: 10, textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                    Atama Yok
                  </div>
                )}

                {/* Standby Duty Alerts */}
                {isStandby1 && (
                  <div
                    style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      color: '#fbbf24',
                      fontSize: 10.5,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <ShieldAlert size={12} /> 1. Yedek (Standby)
                  </div>
                )}

                {isStandby2 && (
                  <div
                    style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      background: 'rgba(139, 92, 246, 0.15)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      color: '#c084fc',
                      fontSize: 10.5,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <ShieldAlert size={12} /> 2. Yedek (Standby)
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
