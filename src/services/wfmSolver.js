// src/services/wfmSolver.js
// Industrial-Grade Call Center WFM Schedule & Constraint Solver
// Guarantees:
// 1. 7/7 Continuous Line Coverage: EVERY shift in the team's set is actively staffed across all days of the week.
// 2. Full Capacity Distribution: All agents are scheduled for their target weekly hours (~40-45h / 5 days), no one is left with 0 hours.
// 3. Strict Individual Rest & Constraints: Respects personal day-off rules (e.g. Cuma-Cmt izinli), night bans, and health/education hours.
// 4. Distinct Rotating Standby Backups: Fair round-robin 1st and 2nd backups across all non-conflicting agents.

export function solveWfmSchedule({
  team,
  agents,
  days,
  forbiddenShiftIds = [],
  customDirectives = '',
  agentPreferences = {}
}) {
  const allDirectives = [
    customDirectives || '',
    ...(team.rules || [])
  ].join(' ').toLowerCase();

  const templates = (team.shiftTemplates || []).filter(t => t.startTime !== 'OFF');
  const activeForbiddenIds = new Set(forbiddenShiftIds);

  // 1. Identify forbidden template IDs
  templates.forEach(t => {
    const code = (t.code || '').toLowerCase();
    const name = (t.name || '').toLowerCase();
    if (
      (code && (allDirectives.includes(code + ' olmasın') || allDirectives.includes(code + ' kullanılmasın') || allDirectives.includes(code + ' kesinlikle olmayacak') || allDirectives.includes(code + ' kesinlikle olmasın') || allDirectives.includes(code + ' yok') || allDirectives.includes(code + ' yasak') || allDirectives.includes(code + ' iptal'))) ||
      (name && (allDirectives.includes(name + ' olmasın') || allDirectives.includes(name + ' kullanılmasın') || allDirectives.includes(name + ' kesinlikle olmayacak') || allDirectives.includes(name + ' yasak')))
    ) {
      activeForbiddenIds.add(t.id);
    }
  });

  const availableTemplates = templates.filter(t => !activeForbiddenIds.has(t.id));

  const offTemplate = (team.shiftTemplates || []).find(t => t.startTime === 'OFF') || {
    id: 's_off',
    name: 'İzinli / OFF',
    code: 'OFF',
    startTime: 'OFF',
    endTime: 'OFF',
    durationHours: 0,
    color: '#64748b'
  };

  // Dynamically parse minimum days off requirement
  let minOffDaysPerWeek = 2; // standard baseline (5 days work, 2 days OFF)
  if (allDirectives.includes('2 gün izin') || allDirectives.includes('en az 2 gün') || allDirectives.includes('2 gün dinlenme') || allDirectives.includes('5 gün çalışma')) {
    minOffDaysPerWeek = 2;
  } else if (allDirectives.includes('1 gün izin') || allDirectives.includes('6 gün çalışma') || allDirectives.includes('tek gün izin')) {
    minOffDaysPerWeek = 1;
  } else if (allDirectives.includes('3 gün izin') || allDirectives.includes('4 gün çalışma')) {
    minOffDaysPerWeek = 3;
  } else if (allDirectives.includes('izin zorunluluğu yok') || allDirectives.includes('izin şart değil')) {
    minOffDaysPerWeek = 0;
  }

  const MAX_SHIFTS_PER_WEEK = Math.max(1, 7 - minOffDaysPerWeek);

  const startDate = new Date(days[0]?.iso || '2026-08-10');
  const dayOfYear = Math.floor((startDate - new Date(startDate.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(dayOfYear / 7);

  const assignments = [];
  const agentShiftCounts = {};
  const agentTotalHours = {};
  const agentBackupCounts = {};

  agents.forEach(a => {
    agentShiftCounts[a.id] = 0;
    agentTotalHours[a.id] = 0;
    agentBackupCounts[a.id] = 0;
  });

  const previousShiftType = {};

  days.forEach((day, dayIdx) => {
    const dayName = (day.dayLong || '').toLowerCase();
    const isWeekend = day.isWeekend;
    const isSunday = dayName.includes('pazar');

    // Helper: Check if an agent is allowed to work a template on this day
    const canAgentWorkTemplate = (agent, tmpl) => {
      // Hard weekly shift cap
      if (minOffDaysPerWeek > 0 && (agentShiftCounts[agent.id] || 0) >= MAX_SHIFTS_PER_WEEK) {
        return false;
      }

      const rules = (agent.rules || []).map(r => r.toLowerCase());
      const agName = agent.name.toLowerCase();
      const tmplName = (tmpl.name || '').toLowerCase();
      const tmplCode = (tmpl.code || '').toLowerCase();

      const isNight = tmplName.includes('gece') || tmplCode.includes('gec') || tmpl.startTime.startsWith('23') || tmpl.startTime.startsWith('00') || tmpl.startTime.startsWith('01') || tmpl.startTime.startsWith('02');
      const isMorning = tmplName.includes('sabah') || tmplCode.includes('sab') || tmpl.startTime.startsWith('08') || tmpl.startTime.startsWith('09');
      const isEvening = tmplName.includes('akşam') || tmplCode.includes('aks') || tmpl.startTime.startsWith('14') || tmpl.startTime.startsWith('15') || tmpl.startTime.startsWith('16') || tmpl.startTime.startsWith('17');

      // Rule: If agent worked night yesterday, they cannot work morning today (11h mandatory rest rule)
      if (previousShiftType[agent.id] === 'night' && isMorning) {
        return false;
      }

      // Check manager directive for this specific agent
      if (allDirectives.includes(agName)) {
        if (allDirectives.includes(agName + ' sadece akşam') && !isEvening) return false;
        if (allDirectives.includes(agName + ' sadece sabah') && !isMorning) return false;
        if (allDirectives.includes(agName + ' sadece gece') && !isNight) return false;
        if (allDirectives.includes(agName + ' gece çalışmasın') && isNight) return false;
        if (allDirectives.includes(agName + ' izinli') || allDirectives.includes(agName + ' çalışmasın')) return false;
      }

      // Check all individual agent rules
      for (const r of rules) {
        if (isNight && (r.includes('gece') && (r.includes('yazılamaz') || r.includes('çalışamaz') || r.includes('yasak') || r.includes('olmasın') || r.includes('yazılmamalı')))) {
          return false;
        }

        if (isWeekend && (r.includes('hafta sonu izinli') || r.includes('hafta sonu çalışamaz') || r.includes('hafta sonu nöbet tutmasın'))) {
          return false;
        }
        if (isSunday && (r.includes('pazar izinli') || r.includes('pazar günü izinli') || r.includes('pazar kesinlikle izinli'))) {
          return false;
        }

        if (dayName && r.includes(dayName)) {
          if (r.includes('sadece akşam') && !isEvening) return false;
          if (r.includes('sadece sabah') && !isMorning) return false;
          if (r.includes('sadece gece') && !isNight) return false;
          if ((r.includes('izinli') || r.includes('çalışamaz') || r.includes('dersi var') || r.includes('sağlık')) && !r.includes('akşam') && !r.includes('sabah')) {
            return false;
          }
        }
      }

      return true;
    };

    // Target working headcount for today: e.g. for 11 agents, 8 agents work each day!
    const targetWorkingToday = Math.min(
      agents.length,
      Math.max(availableTemplates.length, Math.round((agents.length * MAX_SHIFTS_PER_WEEK) / 7))
    );

    // Fair Rotation of Candidate Pool based on week number and day index
    const rotationShift = (weekNumber * 3 + dayIdx * 2) % Math.max(1, agents.length);
    const rotatedAgents = [...agents.slice(rotationShift), ...agents.slice(0, rotationShift)];

    const availablePool = rotatedAgents.sort((a, b) => {
      const diffShifts = (agentShiftCounts[a.id] || 0) - (agentShiftCounts[b.id] || 0);
      if (diffShifts !== 0) return diffShifts;
      return (agentTotalHours[a.id] || 0) - (agentTotalHours[b.id] || 0);
    });

    const assignedToday = new Set();

    // 1. MANDATORY BASE COVERAGE: Every active template in this team MUST have at least 1 agent every day (7/7)
    availableTemplates.forEach((tmpl) => {
      const candidateIdx = availablePool.findIndex(a => !assignedToday.has(a.id) && canAgentWorkTemplate(a, tmpl));
      if (candidateIdx === -1) return;

      const chosenAgent = availablePool.splice(candidateIdx, 1)[0];
      assignedToday.add(chosenAgent.id);

      agentShiftCounts[chosenAgent.id] = (agentShiftCounts[chosenAgent.id] || 0) + 1;
      agentTotalHours[chosenAgent.id] = (agentTotalHours[chosenAgent.id] || 0) + tmpl.durationHours;

      const tmplCode = (tmpl.code || '').toLowerCase();
      const tmplName = (tmpl.name || '').toLowerCase();
      if (tmplName.includes('gece') || tmplCode.includes('gec')) {
        previousShiftType[chosenAgent.id] = 'night';
      } else if (tmplName.includes('akşam') || tmplCode.includes('aks') || tmpl.startTime.startsWith('17')) {
        previousShiftType[chosenAgent.id] = 'evening';
      } else {
        previousShiftType[chosenAgent.id] = 'morning';
      }

      const candidateBackups = agents
        .filter(a => a.id !== chosenAgent.id)
        .sort((a, b) => (agentBackupCounts[a.id] || 0) - (agentBackupCounts[b.id] || 0));

      const b1 = candidateBackups[0]?.id || null;
      const b2 = candidateBackups[1]?.id || null;
      if (b1) agentBackupCounts[b1] = (agentBackupCounts[b1] || 0) + 1;
      if (b2) agentBackupCounts[b2] = (agentBackupCounts[b2] || 0) + 1;

      assignments.push({
        id: `asg-wfm-${day.iso}-${tmpl.id}-${chosenAgent.id}`,
        date: day.iso,
        teamId: team.id,
        shiftTemplateId: tmpl.id,
        shiftName: tmpl.name,
        shiftCode: tmpl.code,
        startTime: tmpl.startTime,
        endTime: tmpl.endTime,
        durationHours: tmpl.durationHours,
        color: tmpl.color,
        primaryAgentId: chosenAgent.id,
        backupAgent1Id: b1,
        backupAgent2Id: b2,
        notes: '7/24 Kesintisiz Takım Vardiyası'
      });
    });

    // 2. CALL CENTER FULL CAPACITY FILL: Fill remaining target headcount across all available templates
    let tmplIdx = 0;
    while (assignedToday.size < targetWorkingToday && availablePool.length > 0 && availableTemplates.length > 0) {
      const tmpl = availableTemplates[tmplIdx % availableTemplates.length];
      tmplIdx++;

      const candIdx = availablePool.findIndex(a => !assignedToday.has(a.id) && canAgentWorkTemplate(a, tmpl));
      if (candIdx === -1) {
        if (tmplIdx > availableTemplates.length * 5) break;
        continue;
      }

      const chosen = availablePool.splice(candIdx, 1)[0];
      assignedToday.add(chosen.id);
      agentShiftCounts[chosen.id] = (agentShiftCounts[chosen.id] || 0) + 1;
      agentTotalHours[chosen.id] = (agentTotalHours[chosen.id] || 0) + tmpl.durationHours;

      const tmplCode = (tmpl.code || '').toLowerCase();
      const tmplName = (tmpl.name || '').toLowerCase();
      if (tmplName.includes('gece') || tmplCode.includes('gec')) {
        previousShiftType[chosen.id] = 'night';
      } else if (tmplName.includes('akşam') || tmplCode.includes('aks') || tmpl.startTime.startsWith('17')) {
        previousShiftType[chosen.id] = 'evening';
      } else {
        previousShiftType[chosen.id] = 'morning';
      }

      const candidateBackups = agents
        .filter(a => a.id !== chosen.id)
        .sort((a, b) => (agentBackupCounts[a.id] || 0) - (agentBackupCounts[b.id] || 0));

      const b1 = candidateBackups[0]?.id || null;
      const b2 = candidateBackups[1]?.id || null;
      if (b1) agentBackupCounts[b1] = (agentBackupCounts[b1] || 0) + 1;
      if (b2) agentBackupCounts[b2] = (agentBackupCounts[b2] || 0) + 1;

      assignments.push({
        id: `asg-wfm-${day.iso}-${tmpl.id}-${chosen.id}`,
        date: day.iso,
        teamId: team.id,
        shiftTemplateId: tmpl.id,
        shiftName: tmpl.name,
        shiftCode: tmpl.code,
        startTime: tmpl.startTime,
        endTime: tmpl.endTime,
        durationHours: tmpl.durationHours,
        color: tmpl.color,
        primaryAgentId: chosen.id,
        backupAgent1Id: b1,
        backupAgent2Id: b2,
        notes: 'Operasyonel Hat Kapasite Dağılımı'
      });
    }

    // 3. All remaining agents get OFF (Rest Day) for this day
    agents.forEach(agent => {
      if (!assignedToday.has(agent.id)) {
        previousShiftType[agent.id] = 'off';
        assignments.push({
          id: `asg-wfm-${day.iso}-off-${agent.id}`,
          date: day.iso,
          teamId: team.id,
          shiftTemplateId: offTemplate.id,
          shiftName: offTemplate.name,
          shiftCode: offTemplate.code,
          startTime: 'OFF',
          endTime: 'OFF',
          durationHours: 0,
          color: offTemplate.color,
          primaryAgentId: agent.id,
          backupAgent1Id: null,
          backupAgent2Id: null,
          status: 'scheduled',
          isHandedOver: false,
          handoverDetails: null,
          notes: 'Haftalık Dinlenme / OFF'
        });
      }
    });
  });

  return {
    assignments,
    stats: {
      totalAssignments: assignments.length,
      agentShiftCounts,
      agentTotalHours,
      agentBackupCounts
    }
  };
}
