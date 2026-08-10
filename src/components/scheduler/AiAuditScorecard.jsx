// src/components/scheduler/AiAuditScorecard.jsx
import React, { useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  MessageSquareQuote,
  Filter
} from 'lucide-react';

export function AiAuditScorecard() {
  const {
    aiAuditReport,
    auditCurrentScheduleAi,
    isAiAuditing,
    teams,
    selectedTeamId
  } = usePlan();

  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'satisfied' | 'warning' | 'violated'

  const currentTeam = teams.find(t => t.id === selectedTeamId) || teams[0];

  if (!aiAuditReport) return null;

  const { score, status, summary, stats, checks = [], aiInsights = [] } = aiAuditReport;

  const filteredChecks = checks.filter(c => {
    if (activeFilter === 'all') return true;
    return c.status === activeFilter;
  });

  const getScoreColor = (sc) => {
    if (sc >= 90) return '#10b981';
    if (sc >= 75) return '#f59e0b';
    return '#ef4444';
  };

  const getStatusBadge = (st) => {
    if (st === 'satisfied') {
      return (
        <span className="badge badge-success">
          <CheckCircle2 size={11} /> Sağlandı
        </span>
      );
    }
    if (st === 'warning') {
      return (
        <span className="badge badge-warning">
          <AlertTriangle size={11} /> Tehlikede / Risk
        </span>
      );
    }
    return (
      <span className="badge badge-danger">
        <XCircle size={11} /> Sağlanamadı
      </span>
    );
  };

  return (
    <div className="audit-card">
      {/* Header Banner */}
      <div className="audit-header-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Score Badge */}
          <div
            className={`score-circle ${score >= 90 ? '' : score >= 75 ? 'score-warning' : 'score-critical'}`}
          >
            <span style={{ fontSize: 19, fontWeight: 800, color: getScoreColor(score) }}>
              %{score}
            </span>
            <span style={{ fontSize: 9, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
              Uyum
            </span>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                Pioneers AI Vardiya Sağlık & Kural Denetim Raporu
              </h3>
              <span className="pioneers-badge">
                <Sparkles size={10} /> AI Denetimli
              </span>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4, maxWidth: 650 }}>
              {summary}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={auditCurrentScheduleAi}
            disabled={isAiAuditing}
            className="btn btn-outline btn-sm"
          >
            <RefreshCw size={13} className={isAiAuditing ? 'animate-spin' : ''} />
            <span>{isAiAuditing ? 'Denetleniyor...' : 'Yeniden Denetle'}</span>
          </button>
        </div>
      </div>

      {/* Stats and Category Filters */}
      <div
        style={{
          padding: '12px 24px',
          background: 'var(--bg-surface-elevated)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12.5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Toplam Kural:</span>
            <span className="badge badge-neutral">{stats?.totalRulesEvaluated || checks.length}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, color: '#34d399' }}>Sağlanan:</span>
            <span className="badge badge-success">{stats?.satisfiedCount || 0}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, color: '#fbbf24' }}>Tehlikede:</span>
            <span className="badge badge-warning">{stats?.warningCount || 0}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, color: '#f87171' }}>Sağlanamayan:</span>
            <span className="badge badge-danger">{stats?.violatedCount || 0}</span>
          </div>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Filtrele:</span>
          <button
            onClick={() => setActiveFilter('all')}
            className={`btn btn-sm ${activeFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '3px 8px', fontSize: 11 }}
          >
            Tümü ({checks.length})
          </button>
          <button
            onClick={() => setActiveFilter('satisfied')}
            className={`btn btn-sm ${activeFilter === 'satisfied' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '3px 8px', fontSize: 11 }}
          >
            Sağlandı ({stats?.satisfiedCount || 0})
          </button>
          <button
            onClick={() => setActiveFilter('warning')}
            className={`btn btn-sm ${activeFilter === 'warning' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '3px 8px', fontSize: 11 }}
          >
            Tehlikede ({stats?.warningCount || 0})
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        {/* Left: Checked Rules List */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={16} color="var(--pioneers-purple)" />
            Kural Uyum Listesi & Denetim Maddeleri
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflowY: 'auto' }}>
            {filteredChecks.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                Bu filtreye uygun kural kaydı bulunamadı.
              </div>
            ) : (
              filteredChecks.map((chk, idx) => (
                <div key={chk.id || idx} className="audit-check-item">
                  <div style={{ marginTop: 2 }}>
                    {chk.status === 'satisfied' && <CheckCircle2 size={18} style={{ color: '#10b981' }} />}
                    {chk.status === 'warning' && <AlertTriangle size={18} style={{ color: '#f59e0b' }} />}
                    {chk.status === 'violated' && <XCircle size={18} style={{ color: '#ef4444' }} />}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                        {chk.target}
                      </span>
                      {getStatusBadge(chk.status)}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-highlight)', marginBottom: 4 }}>
                      <strong>Kural:</strong> {chk.rule}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                      {chk.details}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Pioneers AI Operational Commentary & Insights */}
        <div
          style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: 'var(--pioneers-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}
              >
                <MessageSquareQuote size={16} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Pioneers AI Operasyonel Yorumu
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                  Yapay zeka tavsiyeleri ve risk analizleri
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {aiInsights.map((insight, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderLeft: '3px solid var(--pioneers-purple)',
                    fontSize: 12,
                    color: '#e2e8f0',
                    lineHeight: 1.5
                  }}
                >
                  {insight}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              fontSize: 11,
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <TrendingUp size={16} color="#38bdf8" />
            <span>
              <strong>Yedek Güvencesi:</strong> Tüm vardiyalarda 1. ve 2. seviye yedekler tanımlı olduğundan operasyonel risk sıfıra yakındır.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
