// src/context/PlanContext.jsx
// Central Application State & Workforce Management Controller

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  INITIAL_TEAMS,
  INITIAL_AGENTS,
  generateInitialSchedule,
  INITIAL_AI_AUDIT_REPORT
} from '../data/initialData';
import {
  generateScheduleWithAi,
  auditScheduleWithAi
} from '../services/pioneersAi';
import { formatDateISO, getMondayOfWeek, getDaysOfWeek, getDaysInMonth } from '../utils/dateUtils';
import { generateAgentId, generateSecurePassword } from '../utils/authUtils';

const PlanContext = createContext(null);

const STORAGE_KEYS = {
  TEAMS: 'pioplan_teams_v1',
  AGENTS: 'pioplan_agents_v1',
  ASSIGNMENTS: 'pioplan_assignments_v1',
  AI_AUDIT: 'pioplan_ai_audit_v1',
  USER_ROLE: 'pioplan_user_role_v1',
  ACTIVE_AGENT: 'pioplan_active_agent_v1',
};

export function PlanProvider({ children }) {
  // 1. Teams
  const [teams, setTeams] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TEAMS);
    return saved ? JSON.parse(saved) : INITIAL_TEAMS;
  });

  // 2. Agents (Employees)
  const [agents, setAgents] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AGENTS);
    return saved ? JSON.parse(saved) : INITIAL_AGENTS;
  });

  // 3. Shift Assignments
  const [assignments, setAssignments] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS);
    return saved ? JSON.parse(saved) : generateInitialSchedule();
  });

  // 4. AI Audit Report
  const [aiAuditReport, setAiAuditReport] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AI_AUDIT);
    return saved ? JSON.parse(saved) : INITIAL_AI_AUDIT_REPORT;
  });

  // 5. Navigation & View State
  const [currentView, setCurrentView] = useState('planner'); // 'planner' | 'timeline' | 'teams' | 'agents' | 'portal'
  const [userRole, setUserRole] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.USER_ROLE) || 'admin'; // 'admin' | 'agent'
  });
  const [activeAgentId, setActiveAgentId] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_AGENT) || 'agent-2'; // Selin Karaca
  });

  // 6. Planner Filters & Date
  const [selectedTeamId, setSelectedTeamId] = useState('team-inbound');
  const [currentDate, setCurrentDate] = useState(() => {
    return formatDateISO(getMondayOfWeek(new Date('2026-08-10')));
  });
  const [period, setPeriod] = useState('week'); // 'week' | 'month'
  const [timelineStartHour, setTimelineStartHour] = useState(8); // Timeline viewport start hour (0-23)

  // 7. Loading and Notification States
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isAiAuditing, setIsAiAuditing] = useState(false);
  const [notification, setNotification] = useState(null);

  // Sync with LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
  }, [teams]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(agents));
  }, [agents]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(assignments));
  }, [assignments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AI_AUDIT, JSON.stringify(aiAuditReport));
  }, [aiAuditReport]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USER_ROLE, userRole);
  }, [userRole]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_AGENT, activeAgentId);
  }, [activeAgentId]);

  // Helper notification dispatcher
  const notify = (message, type = 'success', title = '') => {
    setNotification({ id: Date.now(), message, type, title });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Switch Role
  const switchRole = (newRole, agentId = null) => {
    setUserRole(newRole);
    if (newRole === 'agent') {
      setCurrentView('portal');
      if (agentId) setActiveAgentId(agentId);
    } else {
      setCurrentView('planner');
    }
  };

  // TEAM CRUD & Rules
  const updateTeam = (updatedTeam) => {
    setTeams(prev => prev.map(t => t.id === updatedTeam.id ? updatedTeam : t));
    notify(`${updatedTeam.name} takımı başarıyla güncellendi.`);
  };

  const addTeam = (newTeam) => {
    const teamWithId = {
      ...newTeam,
      id: `team-${Date.now()}`,
      shiftTemplates: newTeam.shiftTemplates || [
        { id: `st-${Date.now()}-1`, name: 'Gündüz (08:30 - 17:30)', code: 'GND', startTime: '08:30', endTime: '17:30', durationHours: 9, color: '#3b82f6', minRequired: 2 },
        { id: 's_off', name: 'İzinli / OFF', code: 'OFF', startTime: 'OFF', endTime: 'OFF', durationHours: 0, color: '#64748b', minRequired: 0 }
      ],
      rules: newTeam.rules || ['Haftalık en az 1 gün dinlenme zorunludur.']
    };
    setTeams(prev => [...prev, teamWithId]);
    notify(`${teamWithId.name} takımı oluşturuldu.`);
    return teamWithId;
  };

  const deleteTeam = (teamId) => {
    setTeams(prev => prev.filter(t => t.id !== teamId));
    notify('Takım silindi.', 'info');
  };

  const addTeamRule = (teamId, ruleText) => {
    if (!ruleText.trim()) return;
    setTeams(prev => prev.map(t => {
      if (t.id === teamId) {
        return { ...t, rules: [...(t.rules || []), ruleText.trim()] };
      }
      return t;
    }));
    notify('Takım kuralı eklendi.');
  };

  const removeTeamRule = (teamId, ruleIndex) => {
    setTeams(prev => prev.map(t => {
      if (t.id === teamId) {
        const nextRules = [...(t.rules || [])];
        nextRules.splice(ruleIndex, 1);
        return { ...t, rules: nextRules };
      }
      return t;
    }));
    notify('Takım kuralı kaldırıldı.', 'info');
  };

  const updateTeamRule = (teamId, ruleIndex, newText) => {
    setTeams(prev => prev.map(t => {
      if (t.id === teamId) {
        const nextRules = [...(t.rules || [])];
        nextRules[ruleIndex] = newText;
        return { ...t, rules: nextRules };
      }
      return t;
    }));
  };

  // AGENT CRUD & Rules
  const addAgent = (newAgent) => {
    const agentWithId = {
      ...newAgent,
      id: `agent-${Date.now()}`,
      username: newAgent.username || generateAgentId(),
      password: newAgent.password || generateSecurePassword(),
      isFirstLogin: true,
      avatar: newAgent.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      avatarBg: newAgent.avatarBg || '#3b82f6',
      rules: newAgent.rules || []
    };
    setAgents(prev => [...prev, agentWithId]);
    notify(`${agentWithId.name} (${agentWithId.username}) sisteme eklendi.`);
    return agentWithId;
  };

  const updateAgent = (updatedAgent) => {
    setAgents(prev => prev.map(a => a.id === updatedAgent.id ? updatedAgent : a));
    notify(`${updatedAgent.name} bilgileri güncellendi.`);
  };

  const updateAgentPassword = (agentId, newPassword) => {
    setAgents(prev => prev.map(a => {
      if (a.id === agentId) {
        return {
          ...a,
          password: newPassword,
          isFirstLogin: false
        };
      }
      return a;
    }));
    notify('Kullanıcı şifresi başarıyla güncellendi.', 'success');
  };

  const deleteAgent = (agentId) => {
    setAgents(prev => prev.filter(a => a.id !== agentId));
    setAssignments(prev => prev.filter(asg => asg.primaryAgentId !== agentId));
    notify('Çalışan ve ilişkili kayıtlar silindi.', 'info');
  };

  const addAgentRule = (agentId, ruleText) => {
    if (!ruleText.trim()) return;
    setAgents(prev => prev.map(a => {
      if (a.id === agentId) {
        return { ...a, rules: [...(a.rules || []), ruleText.trim()] };
      }
      return a;
    }));
    notify('Çalışan kural kısıtı kaydedildi.');
  };

  const removeAgentRule = (agentId, ruleIndex) => {
    setAgents(prev => prev.map(a => {
      if (a.id === agentId) {
        const nextRules = [...(a.rules || [])];
        nextRules.splice(ruleIndex, 1);
        return { ...a, rules: nextRules };
      }
      return a;
    }));
    notify('Çalışan kuralı silindi.', 'info');
  };

  const updateAgentRule = (agentId, ruleIndex, newText) => {
    setAgents(prev => prev.map(a => {
      if (a.id === agentId) {
        const nextRules = [...(a.rules || [])];
        nextRules[ruleIndex] = newText;
        return { ...a, rules: nextRules };
      }
      return a;
    }));
  };

  // ASSIGNMENTS & EDITING
  const updateAssignment = (assignmentId, updatedFields) => {
    setAssignments(prev => prev.map(asg => {
      if (asg.id === assignmentId) {
        return { ...asg, ...updatedFields };
      }
      return asg;
    }));
    notify('Vardiya ataması güncellendi.');
  };

  const addAssignment = (newAssignment) => {
    const asgWithId = {
      ...newAssignment,
      id: `asg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      status: 'scheduled'
    };
    setAssignments(prev => [...prev, asgWithId]);
    notify('Yeni vardiya eklendi.');
  };

  const deleteAssignment = (assignmentId) => {
    setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    notify('Vardiya silindi.', 'info');
  };

  // TEAM SHIFT TEMPLATES CRUD
  const addShiftTemplate = (teamId, newTemplate) => {
    const tmplWithId = {
      ...newTemplate,
      id: `st-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      durationHours: Number(newTemplate.durationHours) || 8.5,
      minRequired: Number(newTemplate.minRequired) || 1,
      maxCapacity: Number(newTemplate.maxCapacity) || 4
    };
    setTeams(prev => prev.map(t => {
      if (t.id === teamId) {
        return { ...t, shiftTemplates: [...(t.shiftTemplates || []), tmplWithId] };
      }
      return t;
    }));
    notify(`${tmplWithId.name} (${tmplWithId.startTime}-${tmplWithId.endTime}) vardiya şablonu eklendi.`);
    return tmplWithId;
  };

  const updateShiftTemplate = (teamId, templateId, updatedFields) => {
    setTeams(prev => prev.map(t => {
      if (t.id === teamId) {
        return {
          ...t,
          shiftTemplates: t.shiftTemplates.map(tmpl => {
            if (tmpl.id === templateId) {
              return {
                ...tmpl,
                ...updatedFields,
                durationHours: updatedFields.durationHours !== undefined ? Number(updatedFields.durationHours) : tmpl.durationHours
              };
            }
            return tmpl;
          })
        };
      }
      return t;
    }));
    notify('Vardiya şablonu güncellendi.');
  };

  const deleteShiftTemplate = (teamId, templateId) => {
    setTeams(prev => prev.map(t => {
      if (t.id === teamId) {
        return {
          ...t,
          shiftTemplates: t.shiftTemplates.filter(tmpl => tmpl.id !== templateId)
        };
      }
      return t;
    }));
    notify('Vardiya şablonu silindi.', 'info');
  };

  // 24H LIVE TIMELINE: SHIFT HANDOVER & EMERGENCY BACKUP REPLACEMENT
  const performShiftHandover = ({
    assignmentId,
    replacementAgentId,
    backupLevel = 1, // 1 for Backup 1, 2 for Backup 2, 0 for custom
    handoverHour,
    reason = 'Acil Durum / Mazeret'
  }) => {
    const targetAsg = assignments.find(a => a.id === assignmentId);
    if (!targetAsg) return;

    const oldAgent = agents.find(a => a.id === targetAsg.primaryAgentId);
    const newAgent = agents.find(a => a.id === replacementAgentId);
    const handoverTimeStr = `${String(handoverHour).padStart(2, '0')}:00`;

    const handoverDetails = {
      originalAgentId: targetAsg.primaryAgentId,
      originalAgentName: oldAgent?.name || 'Bilinmeyen',
      replacedByAgentId: replacementAgentId,
      replacedByName: newAgent?.name || 'Bilinmeyen',
      backupLevel: backupLevel === 1 ? '1. Yedek (Standby)' : backupLevel === 2 ? '2. Yedek' : 'Özel Atama',
      handoverTime: handoverTimeStr,
      timestamp: new Date().toISOString(),
      reason
    };

    // Split into 2 assignments:
    // 1. Original agent: from original startTime to handoverHour
    // 2. Replacement agent: from handoverHour to original endTime
    const updatedOriginal = {
      ...targetAsg,
      endTime: handoverTimeStr,
      status: 'interrupted',
      isHandedOver: true,
      handoverDetails,
      notes: `${targetAsg.notes ? targetAsg.notes + ' | ' : ''}Saat ${handoverTimeStr} itibariyle mazeretle kesildi (${oldAgent?.name}). Görevi ${newAgent?.name} devraldı.`
    };

    const newBackupShift = {
      ...targetAsg,
      id: `asg-handover-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      primaryAgentId: replacementAgentId,
      startTime: handoverTimeStr,
      endTime: targetAsg.endTime,
      status: 'in_progress',
      isHandoverTakeover: true,
      handoverDetails,
      notes: `Saat ${handoverTimeStr} itibariyle ${oldAgent?.name} yerine ${handoverDetails.backupLevel} olarak göreve dahil oldu. Neden: ${reason}`
    };

    setAssignments(prev => [
      ...prev.map(asg => asg.id === assignmentId ? updatedOriginal : asg),
      newBackupShift
    ]);

    notify(
      `Saat ${handoverTimeStr} itibariyle ${oldAgent?.name} vardiyası kesildi, ${newAgent?.name} (${handoverDetails.backupLevel}) göreve başladı!`,
      'warning',
      'Acil Yedek Devri Gerçekleşti'
    );
  };

  // PIONEERS AI TRIGGER: GENERATE SCHEDULE
  const generateScheduleAi = async (customInstructions = '') => {
    const currentTeam = teams.find(t => t.id === selectedTeamId) || teams[0];
    const teamAgents = agents.filter(a => a.teamId === currentTeam.id);

    if (teamAgents.length === 0) {
      notify('Seçili takımda henüz kayıtlı çalışan bulunmamaktadır.', 'error');
      return;
    }

    setIsAiGenerating(true);

    try {
      const monday = getMondayOfWeek(new Date(currentDate));
      let daysToPlan = [];

      if (period === 'week') {
        daysToPlan = getDaysOfWeek(monday);
      } else {
        const d = new Date(currentDate);
        daysToPlan = getDaysInMonth(d.getFullYear(), d.getMonth());
      }

      const result = await generateScheduleWithAi({
        team: currentTeam,
        agents: teamAgents,
        days: daysToPlan,
        period,
        customInstructions
      });

      if (result && result.assignments) {
        // Remove existing assignments for this team in this date range, then append new ones
        const plannedDateSet = new Set(daysToPlan.map(d => d.iso));
        setAssignments(prev => [
          ...prev.filter(a => !(a.teamId === currentTeam.id && plannedDateSet.has(a.date))),
          ...result.assignments
        ]);

        if (result.auditReport) {
          setAiAuditReport(result.auditReport);
        }

        notify(
          `${currentTeam.name} için ${daysToPlan.length} günlük vardiya ve 2 kademeli yedek ataması Pioneers AI tarafından optimize edildi.`,
          'success',
          'Pioneers AI Vardiya Üretimi Tamamlandı'
        );
      }
    } catch (err) {
      console.error('AI Generation error:', err);
      notify(`Pioneers AI optimizasyon hatası: ${err.message}`, 'error');
    } finally {
      setIsAiGenerating(false);
    }
  };

  // PIONEERS AI TRIGGER: AUDIT EXISTING SCHEDULE
  const auditCurrentScheduleAi = async () => {
    const currentTeam = teams.find(t => t.id === selectedTeamId) || teams[0];
    const teamAgents = agents.filter(a => a.teamId === currentTeam.id);
    const monday = getMondayOfWeek(new Date(currentDate));
    const days = period === 'week' ? getDaysOfWeek(monday) : getDaysInMonth(monday.getFullYear(), monday.getMonth());
    const dateSet = new Set(days.map(d => d.iso));
    const currentTeamAssignments = assignments.filter(a => a.teamId === currentTeam.id && dateSet.has(a.date));

    setIsAiAuditing(true);
    try {
      const report = await auditScheduleWithAi({
        team: currentTeam,
        agents: teamAgents,
        assignments: currentTeamAssignments,
        days
      });
      setAiAuditReport(report);
      notify('Pioneers AI kural denetimi ve sağlık skoru güncellendi.', 'success', 'Vardiya Denetimi Tamamlandı');
    } catch (err) {
      notify('Denetim sırasında hata oluştu: ' + err.message, 'error');
    } finally {
      setIsAiAuditing(false);
    }
  };

  // Reset to Clean Initial Data
  const resetToFactoryDefaults = () => {
    setTeams(INITIAL_TEAMS);
    setAgents(INITIAL_AGENTS);
    setAssignments(generateInitialSchedule());
    setAiAuditReport(INITIAL_AI_AUDIT_REPORT);
    notify('Sistem fabrika verilerine sıfırlandı.', 'info');
  };

  return (
    <PlanContext.Provider
      value={{
        // Data
        teams,
        agents,
        assignments,
        aiAuditReport,
        // Active selections & filters
        currentView,
        setCurrentView,
        userRole,
        switchRole,
        activeAgentId,
        setActiveAgentId,
        selectedTeamId,
        setSelectedTeamId,
        currentDate,
        setCurrentDate,
        period,
        setPeriod,
        timelineStartHour,
        setTimelineStartHour,
        // AI State
        isAiGenerating,
        isAiAuditing,
        generateScheduleAi,
        auditCurrentScheduleAi,
        // Operations
        addTeam,
        updateTeam,
        deleteTeam,
        addTeamRule,
        removeTeamRule,
        updateTeamRule,
        addAgent,
        updateAgent,
        updateAgentPassword,
        deleteAgent,
        addAgentRule,
        removeAgentRule,
        updateAgentRule,
        updateAssignment,
        addAssignment,
        deleteAssignment,
        addShiftTemplate,
        updateShiftTemplate,
        deleteShiftTemplate,
        performShiftHandover,
        resetToFactoryDefaults,
        // Notifications
        notification,
        notify
      }}
    >
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
}
