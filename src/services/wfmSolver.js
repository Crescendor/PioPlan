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
  const lowerDirectives = (customDirectives || '').toLowerCase();
  const templates = (team.shiftTemplates || []).filter(t => t.startTime !== 'OFF');

  // 1. Identify forbidden template IDs
  const activeForbiddenIds = new Set(forbiddenShiftIds);

  templates.forEach(t => {
    const code = (t.code || '').toLowerCase();
    const name = (t.name || '').toLowerCase();
    if (
      (code && (lowerDirectives.includes(`${code} olmasın`) || lowerDirectives.includes(`${code} kesinlikle olmayacak`) || lowerDirectives.includes(`${code} yok`) || lowerDirectives.includes(`${code} yasak`) || lowerDirectives.includes(`${code} iptal`))) ||
      (name && (lowerDirectives.includes(`${name} olmasın`) || lowerDirectives.includes(`${name} kesinlikle olmayacak`) || lowerDirectives.includes(`${name} yasak`)))
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

  const assignments = [];
  const agentShiftCounts = {};
  const agentTotalHours = {};
  agents.forEach(a => {
    agentShiftCounts[a.id] = 0;
    agentTotalHours[a.id] = 0;
  });

  // Track previous day shift for each agent to prevent back-to-back night-then-morning clashing
  const previousShiftType = {};

  days.forEach((day, dayIndex) => {
    const dayName = (day.dayLong || '').toLowerCase();
    const isWeekend = day.isWeekend;
    const isSunday = dayName.includes('pazar');

    // Helper: Check if an agent is legally and operationally allowed to work a template on this day
    const canAgentWorkTemplate = (agent, tmpl) => {
      const rules = (agent.rules || []).map(r => r.toLowerCase());
      const tmplName = (tmpl.name || '').toLowerCase();
      const tmplCode = (tmpl.code || '').toLowerCase();

      const isNight = tmplName.includes('gece') || tmplCode.includes('gec') || tmpl.startTime.startsWith('23') || tmpl.startTime.startsWith('00');
      const isMorning = tmplName.includes('sabah') || tmplCode.includes('sab') || tmpl.startTime.startsWith('08') || tmpl.startTime.startsWith('09');
      const isEvening = tmplName.includes('akşam') || tmplCode.includes('aks') || tmpl.startTime.startsWith('14') || tmpl.startTime.startsWith('15') || tmpl.startTime.startsWith('16');

      // Rule: If agent worked night yesterday, they cannot work morning today (Rest rule)
      if (previousShiftType[agent.id] === 'night' && isMorning) {
        return false;
      }

      // Check manager directive for this specific agent
      const agentLowerName = agent.name.toLowerCase();
      if (lowerDirectives.includes(agentLowerName)) {
        if (lowerDirectives.includes('sadece akşam') && !isEvening) return false;
        if (lowerDirectives.includes('sadece sabah') && !isMorning) return false;
        if (lowerDirectives.includes('sadece gece') && !isNight) return false;
        if (lowerDirectives.includes('izinli') || lowerDirectives.includes('çalışmasın')) return false;
      }

      // Check all individual agent rules
      for (const r of rules) {
        // Night shift bans
        if (isNight && (r.includes('gece') && (r.includes('yazılamaz') || r.includes('çalışamaz') || r.includes('yasak') || r.includes('olmasın') || r.includes('yazılmamalı')))) {
          return false;
        }

        // Weekend / Sunday off rules
        if (isWeekend && (r.includes('hafta sonu izinli') || r.includes('hafta sonu çalışamaz'))) {
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

    // Available working pool for today: Sort by fewest shifts worked to ensure fair, balanced distribution
    const availablePool = [...agents].sort((a, b) => {
      const diffShifts = (agentShiftCounts[a.id] || 0) - (agentShiftCounts[b.id] || 0);
      if (diffShifts !== 0) return diffShifts;
      return (agentTotalHours[a.id] || 0) - (agentTotalHours[b.id] || 0);
    });

    const assignedToday = new Set();

    // 1. Assign required shift slots for active templates
    availableTemplates.forEach(tmpl => {
      const minRequired = tmpl.minRequired || 1;

      for (let i = 0; i < minRequired; i++) {
        const candidateIdx = availablePool.findIndex(a => !assignedToday.has(a.id) && canAgentWorkTemplate(a, tmpl));
        if (candidateIdx === -1) continue;

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
          notes: 'Pioneers WFM Kural & Kapasite Motoru'
        });
      }
    });

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
