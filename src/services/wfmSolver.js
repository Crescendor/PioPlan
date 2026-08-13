// src/services/wfmSolver.js
// Industrial-Grade Operations Research WFM Schedule & Constraint Solver for Call Centers
// Dynamically parses all team and employee rules from natural language text.

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

  // Dynamically parse minimum days off requirement from team rules or user directives
  let minOffDaysPerWeek = 2; // default baseline
  if (allDirectives.includes('2 gün izin') || allDirectives.includes('en az 2 gün') || allDirectives.includes('2 gün dinlenme') || allDirectives.includes('5 gün çalışma')) {
    minOffDaysPerWeek = 2;
  } else if (allDirectives.includes('1 gün izin') || allDirectives.includes('6 gün çalışma') || allDirectives.includes('tek gün izin') || allDirectives.includes('1 gün dinlenme') || allDirectives.includes('haftada 1 gün')) {
    minOffDaysPerWeek = 1;
  } else if (allDirectives.includes('3 gün izin') || allDirectives.includes('4 gün çalışma')) {
    minOffDaysPerWeek = 3;
  } else if (allDirectives.includes('izin zorunluluğu yok') || allDirectives.includes('izin şart değil')) {
    minOffDaysPerWeek = 0;
  }

  const MAX_SHIFTS_PER_WEEK = Math.max(1, 7 - minOffDaysPerWeek);

  // Check if a day is globally OFF by explicit rule
  const isDayGloballyOff = (day) => {
    const dName = (day.dayLong || '').toLowerCase();
    if (dName.includes('pazar') && (allDirectives.includes('pazar günleri kapalı') || allDirectives.includes('pazar kapalı') || allDirectives.includes('pazar herkes izinli') || allDirectives.includes('pazar tatil'))) {
      return true;
    }
    if (day.isWeekend && (allDirectives.includes('hafta sonu kapalı') || allDirectives.includes('hafta sonu herkes izinli'))) {
      return true;
    }
    return false;
  };

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

  // Track previous day shift for each agent to prevent back-to-back night-then-morning clashing
  const previousShiftType = {};

  days.forEach((day, dayIdx) => {
    const dayName = (day.dayLong || '').toLowerCase();
    const isWeekend = day.isWeekend;
    const isSunday = dayName.includes('pazar');
    const dayGloballyOff = isDayGloballyOff(day);

    if (dayGloballyOff) {
      agents.forEach(agent => {
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
          notes: 'Genel Takım / Operasyon İzin Günü'
        });
      });
      return;
    }

    // Helper: Check if an agent is allowed to work a template on this day
    const canAgentWorkTemplate = (agent, tmpl) => {
      // Dynamic shift cap based on team rules
      if (minOffDaysPerWeek > 0 && (agentShiftCounts[agent.id] || 0) >= MAX_SHIFTS_PER_WEEK) {
        return false;
      }

      const rules = (agent.rules || []).map(r => r.toLowerCase());
      const agName = agent.name.toLowerCase();
      const tmplName = (tmpl.name || '').toLowerCase();
      const tmplCode = (tmpl.code || '').toLowerCase();

      const isNight = tmplName.includes('gece') || tmplCode.includes('gec') || tmpl.startTime.startsWith('23') || tmpl.startTime.startsWith('00');
      const isMorning = tmplName.includes('sabah') || tmplCode.includes('sab') || tmpl.startTime.startsWith('08') || tmpl.startTime.startsWith('09');
      const isEvening = tmplName.includes('akşam') || tmplCode.includes('aks') || tmpl.startTime.startsWith('14') || tmpl.startTime.startsWith('15') || tmpl.startTime.startsWith('16');

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

    // Fair Rotation of Candidate Pool based on week number and day index
    const rotationShift = (weekNumber * 2 + dayIdx) % Math.max(1, agents.length);
    const rotatedAgents = [...agents.slice(rotationShift), ...agents.slice(0, rotationShift)];

    const availablePool = rotatedAgents.sort((a, b) => {
      const diffShifts = (agentShiftCounts[a.id] || 0) - (agentShiftCounts[b.id] || 0);
      if (diffShifts !== 0) return diffShifts;
      return (agentTotalHours[a.id] || 0) - (agentTotalHours[b.id] || 0);
    });

    const assignedToday = new Set();

    // 1. MANDATORY 7/7 COVERAGE: Every active template in this team runs on every operating day
    availableTemplates.forEach((tmpl) => {
      const tmplName = (tmpl.name || '').toLowerCase();
      const tmplCode = (tmpl.code || '').toLowerCase();

      if (dayName && (allDirectives.includes(`${dayName} ${tmplCode} yok`) || allDirectives.includes(`${dayName} ${tmplName} yok`))) {
        return;
      }

      const needed = tmpl.minRequired || 1;
      for (let req = 0; req < needed; req++) {
        const candidateIdx = availablePool.findIndex(a => !assignedToday.has(a.id) && canAgentWorkTemplate(a, tmpl));
        if (candidateIdx === -1) continue;

        const chosenAgent = availablePool.splice(candidateIdx, 1)[0];
        assignedToday.add(chosenAgent.id);

        agentShiftCounts[chosenAgent.id] = (agentShiftCounts[chosenAgent.id] || 0) + 1;
        agentTotalHours[chosenAgent.id] = (agentTotalHours[chosenAgent.id] || 0) + tmpl.durationHours;

        if (tmplName.includes('gece') || tmplCode.includes('gec')) {
          previousShiftType[chosenAgent.id] = 'night';
        } else if (tmplName.includes('akşam') || tmplCode.includes('aks')) {
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
          status: 'scheduled',
          isHandedOver: false,
          handoverDetails: null,
          notes: '7/24 Kesintisiz Takım Vardiyası'
        });
      }
    });

    // 2. SCALE DAYTIME CAPACITY (Up to target weekly work shifts)
    const targetWorkingToday = Math.min(agents.length, Math.max(availableTemplates.length, Math.round((agents.length * MAX_SHIFTS_PER_WEEK) / 7)));
    const daytimeTemplates = availableTemplates.filter(t => !t.name.toLowerCase().includes('gece') && !t.code.toLowerCase().includes('gec'));

    let dayTmplIdx = 0;
    while (assignedToday.size < targetWorkingToday && availablePool.length > 0 && daytimeTemplates.length > 0) {
      const tmpl = daytimeTemplates[dayTmplIdx % daytimeTemplates.length];
      dayTmplIdx++;

      const candIdx = availablePool.findIndex(a => !assignedToday.has(a.id) && canAgentWorkTemplate(a, tmpl));
      if (candIdx === -1) {
        if (dayTmplIdx > daytimeTemplates.length * 3) break;
        continue;
      }

      const chosen = availablePool.splice(candIdx, 1)[0];
      assignedToday.add(chosen.id);
      agentShiftCounts[chosen.id] = (agentShiftCounts[chosen.id] || 0) + 1;
      agentTotalHours[chosen.id] = (agentTotalHours[chosen.id] || 0) + tmpl.durationHours;

      const tmplCode = (tmpl.code || '').toLowerCase();
      const tmplName = (tmpl.name || '').toLowerCase();
      previousShiftType[chosen.id] = tmplName.includes('akşam') || tmplCode.includes('aks') ? 'evening' : 'morning';

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
        status: 'scheduled',
        isHandedOver: false,
        handoverDetails: null,
        notes: 'Gündüz Kapasite Dengelemesi'
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
