// src/components/common/Toast.jsx
import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { usePlan } from '../../context/PlanContext';

export function Toast() {
  const { notification } = usePlan();

  if (!notification) return null;

  const { type, message, title } = notification;

  const icons = {
    success: <CheckCircle2 size={20} className="text-emerald-400" style={{ color: '#10b981' }} />,
    warning: <AlertTriangle size={20} className="text-amber-400" style={{ color: '#f59e0b' }} />,
    error: <AlertCircle size={20} className="text-rose-400" style={{ color: '#ef4444' }} />,
    info: <Info size={20} className="text-sky-400" style={{ color: '#38bdf8' }} />
  };

  const bgColors = {
    success: 'rgba(16, 185, 129, 0.15)',
    warning: 'rgba(245, 158, 11, 0.15)',
    error: 'rgba(239, 68, 68, 0.15)',
    info: 'rgba(56, 189, 248, 0.15)'
  };

  const borderColors = {
    success: 'rgba(16, 185, 129, 0.4)',
    warning: 'rgba(245, 158, 11, 0.4)',
    error: 'rgba(239, 68, 68, 0.4)',
    info: 'rgba(56, 189, 248, 0.4)'
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        background: bgColors[type] || bgColors.info,
        backdropFilter: 'blur(16px)',
        border: `1px solid ${borderColors[type] || borderColors.info}`,
        borderRadius: 14,
        padding: '14px 20px',
        boxShadow: '0 20px 30px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        maxWidth: 420,
        animation: 'scaleUp 0.25s ease'
      }}
    >
      <div style={{ marginTop: 2 }}>{icons[type] || icons.info}</div>
      <div style={{ flex: 1 }}>
        {title && (
          <div style={{ fontWeight: 700, fontSize: 13.5, color: '#ffffff', marginBottom: 2 }}>
            {title}
          </div>
        )}
        <div style={{ fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.4 }}>
          {message}
        </div>
      </div>
    </div>
  );
}
