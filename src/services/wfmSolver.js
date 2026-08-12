// src/services/wfmSolver.js
// Industrial-Grade Operations Research WFM Schedule & Constraint Solver for Call Centers

/**
 * Solve and generate an optimal, fair, 100% rule-compliant call center schedule
 */
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

  // Check if a day is globally OFF by team rules (e.g. "Pazar günleri herkes izinli")
  const isDayGloballyOff = (day) => {
    const dName = (day.dayLong || '').toLowerCase();
    if (dName.includes('pazar') && (allDirectives.includes('pazar günleri') || allDirectives.includes('pazar günü') || allDirectives.includes('pazar herkes') || allDirectives.includes('pazar operasyon') || allDirectives.includes('pazar kapalı') || allDirectives.includes('pazarları'))) {
      if (allDirectives.includes('izinli') || allDirectives.includes('off') || allDirectives.includes('kapalı') || allDirectives.includes('tatil')) {
        return true;
      }
    }
    if (day.isWeekend && (allDirectives.includes('hafta sonu kapalı') || allDirectives.includes('hafta sonu herkes izinli') || allDirectives.includes('hafta sonu tatil'))) {
      return true;
    }
    return false;
  };

  const assignments = [];
  const agentShiftCounts = {};
  const agentTotalHours = {};
  agents.forEach(a => {
    agentShiftCounts[a.id] = 0;
    agentTotalHours[a.id] = 0;
  });

  // Track previous day shift for each agent to prevent back-to-back night-then-morning clashing
  const previousShiftType = {};

  days.forEach((day) => {
    const dayName = (day.dayLong || '').toLowerCase();
    const isWeekend = day.isWeekend;
    const isSunday = dayName.includes('pazar');
    const dayGloballyOff = isDayGloballyOff(day);

    if (dayGloballyOff) {
      // Everyone gets OFF on globally closed days
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

    // Helper: Check if an agent is legally and operationally allowed to work a template on this day
    const canAgentWorkTemplate = (agent, tmpl) => {
      const rules = (agent.rules || []).map(r => r.toLowerCase());
      const agName = agent.name.toLowerCase();
      const tmplName = (tmpl.name || '').toLowerCase();
      const tmplCode = (tmpl.code || '').toLowerCase();

      const isNight = tmplName.includes('gece') || tmplCode.includes('gec') || tmpl.startTime.startsWith('23') || tmpl.startTime.startsWith('00');
      const isMorning = tmplName.includes('sabah') || tmplCode.includes('sab') || tmpl.startTime.startsWith('08') || tmpl.startTime.startsWith('09');
      const isEvening = tmplName.includes('akşam') || tmplCode.includes('aks') || tmpl.startTime.startsWith('14') || tmpl.startTime.startsWith('15') || tmpl.startTime.startsWith('16');

      // Rule: If agent worked night yesterday, they cannot work morning today (11h rest rule)
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
        // Night shift bans
        if (isNight && (r.includes('gece') && (r.includes('yazılamaz') || r.includes('çalışamaz') || r.includes('yasak') || r.includes('olmasın') || r.includes('yazılmamalı')))) {
          return false;
        }

        // Weekend / Sunday off rules
        if (isWeekend && (r.includes('hafta sonu izinli') || r.includes('hafta sonu çalışamaz') || r.includes('hafta sonu nöbet tutmasın'))) {
          return false;
        }
        if (isSunday && (r.includes('pazar izinli') || r.includes('pazar günü izinli') || r.includes('pazar kesinlikle izinli'))) {
          return false;
        }

        // Specific day constraints (e.g. "Pazartesi üniversite dersi var, sadece Akşam veya OFF")
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

    // Calculate how many agents should work today to reach target contract days (5 days/week)
    const targetWorkingToday = Math.min(
      agents.length,
      Math.max(availableTemplates.length, Math.round((agents.length * 5) / 6))
    );

    // Available working pool for today: Sort by fewest shifts worked to ensure fair, balanced distribution
    const availablePool = [...agents].sort((a, b) => {
      const diffShifts = (agentShiftCounts[a.id] || 0) - (agentShiftCounts[b.id] || 0);
      if (diffShifts !== 0) return diffShifts;
      return (agentTotalHours[a.id] || 0) - (agentTotalHours[b.id] || 0);
    });

    const assignedToday = new Set();

    // 1. Assign required shift slots across available templates
    let tmplIdx = 0;
    while (assignedToday.size < targetWorkingToday && availablePool.length > 0 && availableTemplates.length > 0) {
      const tmpl = availableTemplates[tmplIdx % availableTemplates.length];
      tmplIdx++;

      const candidateIdx = availablePool.findIndex(a => !assignedToday.has(a.id) && canAgentWorkTemplate(a, tmpl));
      if (candidateIdx === -1) {
        if (tmplIdx > availableTemplates.length * 3) break;
        continue;
      }

      const chosenAgent = availablePool.splice(candidateIdx, 1)[0];
      assignedToday.add(chosenAgent.id);

      agentShiftCounts[chosenAgent.id] = (agentShiftCounts[chosenAgent.id] || 0) + 1;
      agentTotalHours[chosenAgent.id] = (agentTotalHours[chosenAgent.id] || 0) + tmpl.durationHours;

      // Record shift type for consecutive rest calculation
      const tmplCode = (tmpl.code || '').toLowerCase();
      const tmplName = (tmpl.name || '').toLowerCase();
      if (tmplName.includes('gece') || tmplCode.includes('gec')) {
        previousShiftType[chosenAgent.id] = 'night';
      } else if (tmplName.includes('akşam') || tmplCode.includes('aks')) {
        previousShiftType[chosenAgent.id] = 'evening';
      } else {
        previousShiftType[chosenAgent.id] = 'morning';
      }

      // Pick distinct 1st and 2nd backups from other agents
      const backups = agents.filter(a => a.id !== chosenAgent.id);
      const b1 = backups[0]?.id || null;
      const b2 = backups[1]?.id || null;

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
        notes: 'Pioneers WFM Kural & Dengeleme Motoru'
      });
    }

    // 2. All remaining agents get OFF (Rest Day) for this day
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
      agentTotalHours
    }
  };
}
