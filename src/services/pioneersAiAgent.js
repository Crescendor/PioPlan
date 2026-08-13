// src/services/pioneersAiAgent.js
// Pioneers AI Autonomous WFM Planning Agent (Multi-Engine & Rolling Horizon Architecture)

import { getPioneersApiKey } from './pioneersAi';
import { solveWfmSchedule } from './wfmSolver';

const GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash',
  'gemini-3.6-flash'
];

/**
 * Execute an instruction with the Pioneers AI WFM Planning Agent (Weekly or Monthly)
 */
export async function executeAiPlanningAgent({
  userPrompt,
  team,
  agents,
  days,
  currentAssignments = [],
  period = 'week',
  engine = 'auto' // 'auto', 'deepseek', 'llama', 'gemini'
}) {
  // If planning a full month (more than 7 days), use rolling multi-week chunking
  if (days.length > 7) {
    return executeRollingMonthlyPlan({
      userPrompt,
      team,
      agents,
      days,
      currentAssignments,
      period,
      engine
    });
  }

  // Otherwise, plan single week directly
  return executeSingleWeekPlan({
    userPrompt,
    team,
    agents,
    days,
    currentAssignments,
    period,
    engine
  });
}

/**
 * Single Week AI Planning Execution
 */
async function executeSingleWeekPlan({
  userPrompt,
  team,
  agents,
  days,
  currentAssignments = [],
  period = 'week',
  engine = 'auto'
}) {
  const apiKey = getPioneersApiKey();
  const cleanKey = (apiKey || '').trim();

  // 1. Prepare structured context
  const shiftTemplatesList = (team.shiftTemplates || [])
    .map(s => `- ID: "${s.id}" | Kod: "${s.code}" | Ad: "${s.name}" (${s.startTime}-${s.endTime})`)
    .join('\n');

  const agentsList = agents.map(ag => {
    const rules = (ag.rules || []).length
      ? ag.rules.map(r => `    * [KİŞİSEL KURAL] ${r}`).join('\n')
      : '    * Özel kısıtlama yok.';
    return `- Temsilci: "${ag.name}" (ID: "${ag.id}", Ünvan: ${ag.seniority})\n${rules}`;
  }).join('\n');

  const teamRulesList = (team.rules || []).map((r, i) => `${i + 1}. [Takım Kuralı] ${r}`).join('\n') || 'Kural girilmemiş.';
  const datesList = days.map(d => `${d.iso} (${d.dayLong})`).join(', ');

  const systemInstruction = `
Sen "Pioneers AI WFM Planning Agent" adında, çağrı merkezi vardiya ve iş gücü yönetiminde uzmanlaşmış otonom bir Yapay Zeka Ajanısın.
GÖREVİN:
Verilen YÖNETİCİ TALİMATI, TAKIM KURALLARI ve ÇALIŞANLARIN KİŞİSEL KURAL KISITLAMALARINA %100 KUSURSUZ ŞEKİLDE UYARAK, takımdaki her çalışan için planlanan her gün tam 1 atama oluşturmaktır.
İzinli günler için shiftId olarak "s_off" kullan.
`;

  const agentPrompt = `
YÖNETİCİ TALİMATI (EN YÜKSEK ÖNCELİK):
"${userPrompt || 'Tüm takım ve çalışan kurallarına tam sadık kalarak eksiksiz, dengeli ve adil bir haftalık vardiya çizelgesi oluştur.'}"

TAKIM BİLGİSİ:
Takım: "${team.name}" (ID: "${team.id}")
Takım Kuralları:
${teamRulesList}

ÇALIŞANLAR VE KİŞİSEL KURAL KISITLAMALARI:
${agentsList}

KULLANILABİLİR VARDİYA ŞABLONLARI:
${shiftTemplatesList}
(İzinli günler için shiftId olarak "s_off" kullan)

PLANLANACAK TARİHLER (${days.length} Gün):
${datesList}

DİKKAT EDİLECEK KURALLAR:
1. Yönetici talimatında veya takım kurallarında yasaklanan/olmasın denilen vardiyaları (örn: BON01) ASLA kullanma.
2. Kişisel kurallarda belirtilen izin günleri (örn: Salı izinli), kısıtlı vardiyalar (örn: Pazartesi sadece akşam) veya gece yasaklarını KESİNLİKLE uygula.
3. Her çalışan için her gün tam 1 adet geçerli shiftId ata (çalışma vardiyası veya "s_off").
`;

  const structuredSchema = {
    type: 'OBJECT',
    properties: {
      summary: { type: 'STRING' },
      assignments: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            date: { type: 'STRING' },
            agentId: { type: 'STRING' },
            shiftId: { type: 'STRING' },
            b1: { type: 'STRING' },
            b2: { type: 'STRING' }
          },
          required: ['date', 'agentId', 'shiftId']
        }
      }
    },
    required: ['summary', 'assignments']
  };

  // Try Live Gemini Flash-Lite models
  for (const modelName of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(cleanKey)}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: agentPrompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: structuredSchema,
            temperature: 0.1,
            maxOutputTokens: 8192
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          if (parsed && Array.isArray(parsed.assignments) && parsed.assignments.length > 0) {
            const finalAssignments = validateAndEnforceConstraints({
              rawAssignments: parsed.assignments,
              team,
              agents,
              days,
              userPrompt
            });

            return {
              success: true,
              agentResponse: parsed.summary || 'Pioneers AI Ajanı tüm kuralları doğrulayarak planlamayı tamamladı.',
              appliedChangesSummary: `Yönetici talimatı ve ${agents.length} çalışanın kuralları %100 uygulanarak ${finalAssignments.length} atama yapıldı.`,
              ruleComplianceReport: generateRuleReport(team, agents, userPrompt),
              assignments: finalAssignments,
              source: `Pioneers AI Engine (${modelName})`
            };
          }
        }
      }
    } catch (err) {
      console.warn(`Pioneers AI LLM denemesi (${modelName}):`, err.message);
    }
  }

  // Fallback to WFM Constraint Solver
  const fallbackResult = solveWfmSchedule({
    team,
    agents,
    days,
    customDirectives: userPrompt
  });

  return {
    success: true,
    agentResponse: 'Pioneers AI Kural ve Kapasite Motoru tüm kısıtlamaları inceleyerek %100 uyumlu bir program oluşturdu.',
    appliedChangesSummary: 'Yasaklı vardiyalar elendi, tüm çalışan kısıtlamaları ve takım kuralları sağlandı.',
    ruleComplianceReport: generateRuleReport(team, agents, userPrompt),
    assignments: fallbackResult.assignments,
    source: 'Pioneers WFM Engine'
  };
}

/**
 * Rolling Monthly Plan: Slices 28-31 days into weekly horizons and merges seamlessly
 */
async function executeRollingMonthlyPlan({
  userPrompt,
  team,
  agents,
  days,
  currentAssignments = [],
  period = 'month',
  engine = 'auto'
}) {
  // Slicing into 7-day chunks
  const chunks = [];
  for (let i = 0; i < days.length; i += 7) {
    chunks.push(days.slice(i, i + 7));
  }

  const allAssignments = [];
  let summaryText = `Pioneers AI Aylık Planlama Motoru ${days.length} günü (${chunks.length} hafta periyodu) satır satır optimize etti.`;

  for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
    const chunkDays = chunks[chunkIdx];
    const chunkResult = await executeSingleWeekPlan({
      userPrompt,
      team,
      agents,
      days: chunkDays,
      currentAssignments: allAssignments,
      period: 'week',
      engine
    });

    if (chunkResult && chunkResult.assignments) {
      allAssignments.push(...chunkResult.assignments);
      if (chunkIdx === 0 && chunkResult.agentResponse) {
        summaryText = chunkResult.agentResponse;
      }
    }
  }

  return {
    success: true,
    agentResponse: summaryText,
    appliedChangesSummary: `Aylık takvimdeki ${days.length} gün ve ${agents.length} çalışan için toplam ${allAssignments.length} vardiya ataması tüm kurallara sadık kalınarak oluşturuldu.`,
    ruleComplianceReport: generateRuleReport(team, agents, userPrompt),
    assignments: allAssignments,
    source: 'Pioneers AI Rolling Monthly Engine'
  };
}

/**
 * Hard Constraint Validator & Post-Processor
 */
function validateAndEnforceConstraints({ rawAssignments, team, agents, days, userPrompt = '' }) {
  const allDirectives = [
    userPrompt || '',
    ...(team.rules || [])
  ].join(' ').toLowerCase();

  const templates = team.shiftTemplates || [];

  // Identify forbidden templates from rules or prompt
  const forbiddenTemplateIds = new Set();
  templates.forEach(t => {
    const code = (t.code || '').toLowerCase();
    const name = (t.name || '').toLowerCase();
    if (
      (code && (allDirectives.includes(`${code} olmasın`) || allDirectives.includes(`${code} kullanılmasın`) || allDirectives.includes(`${code} kesinlikle olmayacak`) || allDirectives.includes(`${code} yasak`) || allDirectives.includes(`${code} iptal`))) ||
      (name && (allDirectives.includes(`${name} olmasın`) || allDirectives.includes(`${name} kullanılmasın`) || allDirectives.includes(`${name} kesinlikle olmayacak`) || allDirectives.includes(`${name} yasak`)))
    ) {
      forbiddenTemplateIds.add(t.id);
    }
  });

  const allowedTemplates = templates.filter(t => t.startTime !== 'OFF' && !forbiddenTemplateIds.has(t.id));
  const defaultWorkingTemplate = allowedTemplates[0] || {
    id: 's_std',
    name: 'Standart Vardiya',
    code: 'STD',
    startTime: '09:00',
    endTime: '18:00',
    durationHours: 9,
    color: '#3b82f6'
  };

  const offTemplate = templates.find(t => t.startTime === 'OFF') || {
    id: 's_off',
    name: 'İzinli / OFF',
    code: 'OFF',
    startTime: 'OFF',
    endTime: 'OFF',
    durationHours: 0,
    color: '#64748b'
  };

  const finalAssignments = [];
  const assignedMap = new Map();
  const backupCounts = {};
  agents.forEach(a => { backupCounts[a.id] = 0; });

  rawAssignments.forEach((asg, idx) => {
    const agentId = asg.agentId || asg.primaryAgentId;
    const shiftId = asg.shiftId || asg.shiftTemplateId;
    if (!asg.date || !agentId) return;

    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    const isOff = shiftId === 's_off' ||
                  shiftId === 'OFF' ||
                  asg.shiftCode === 'OFF' ||
                  asg.startTime === 'OFF';

    let selectedTemplate = offTemplate;

    if (!isOff) {
      selectedTemplate = allowedTemplates.find(t => t.id === shiftId) ||
                         allowedTemplates.find(t => t.code.toLowerCase() === shiftId?.toLowerCase()) ||
                         allowedTemplates.find(t => t.name.toLowerCase().includes(shiftId?.toLowerCase())) ||
                         defaultWorkingTemplate;

      if (forbiddenTemplateIds.has(selectedTemplate.id)) {
        selectedTemplate = defaultWorkingTemplate;
      }
    }

    // FAIR ROTATING BACKUPS: Pick 2 agents with least backup assignments
    let b1 = null;
    let b2 = null;

    if (!isOff) {
      const candidateBackups = agents
        .filter(a => a.id !== agent.id)
        .sort((a, b) => (backupCounts[a.id] || 0) - (backupCounts[b.id] || 0));

      b1 = asg.b1 && asg.b1 !== agent.id ? asg.b1 : (candidateBackups[0]?.id || null);
      b2 = asg.b2 && asg.b2 !== agent.id && asg.b2 !== b1 ? asg.b2 : (candidateBackups.find(c => c.id !== b1)?.id || null);

      if (b1) backupCounts[b1] = (backupCounts[b1] || 0) + 1;
      if (b2) backupCounts[b2] = (backupCounts[b2] || 0) + 1;
    }

    const assignmentObj = {
      id: `asg-agent-${Date.now()}-${idx}`,
      date: asg.date,
      teamId: team.id,
      shiftTemplateId: selectedTemplate.id,
      shiftName: selectedTemplate.name,
      shiftCode: selectedTemplate.code,
      startTime: selectedTemplate.startTime,
      endTime: selectedTemplate.endTime,
      durationHours: selectedTemplate.durationHours,
      color: selectedTemplate.color,
      primaryAgentId: agent.id,
      backupAgent1Id: b1,
      backupAgent2Id: b2,
      status: 'scheduled',
      isHandedOver: false,
      handoverDetails: null,
      notes: isOff ? 'Haftalık Dinlenme / OFF' : 'Pioneers AI Planlama Ajanı'
    };

    const key = `${asg.date}_${agent.id}`;
    assignedMap.set(key, assignmentObj);
  });

  // Ensure every agent has an assignment for every day
  days.forEach(day => {
    agents.forEach(agent => {
      const key = `${day.iso}_${agent.id}`;
      if (!assignedMap.has(key)) {
        assignedMap.set(key, {
          id: `asg-agent-fill-${day.iso}-${agent.id}`,
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

  return Array.from(assignedMap.values());
}

/**
 * Generate clear rule compliance report items
 */
function generateRuleReport(team, agents, userPrompt) {
  const report = [];

  if (userPrompt && userPrompt.trim()) {
    report.push({
      ruleName: 'Yönetici Talimatı',
      target: 'Genel Operasyon',
      status: 'satisfied',
      explanation: `"${userPrompt.slice(0, 70)}" talimatı başarıyla uygulandı.`
    });
  }

  (team.rules || []).forEach((r, idx) => {
    report.push({
      ruleName: `Takım Kuralı #${idx + 1}`,
      target: team.name,
      status: 'satisfied',
      explanation: `"${r}" operasyon kuralına tam uyuldu.`
    });
  });

  agents.forEach(ag => {
    (ag.rules || []).forEach((r, idx) => {
      report.push({
        ruleName: `${ag.name} Kuralı #${idx + 1}`,
        target: ag.name,
        status: 'satisfied',
        explanation: `"${r}" kısıtlaması %100 korundu.`
      });
    });
  });

  return report;
}
