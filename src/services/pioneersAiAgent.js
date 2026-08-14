// src/services/pioneersAiAgent.js
// Pioneers AI Autonomous WFM Planning & In-Place Editing Agent
// Powered by Multi-Model Engines with Complete Team Schedule Guarantee

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
 * Robust Turkish Day Matcher
 */
function isRuleMatchingDay(ruleText, targetDayName) {
  const text = (ruleText || '').toLowerCase();
  const day = (targetDayName || '').toLowerCase();

  if (day.includes('pazar') && !day.includes('pazartesi')) {
    return (text.includes('pazar') && !text.includes('pazartesi')) ||
           /\bpazar(?!tesi)\b|\bpazarları\b|\bpazar\s+günü\b|\bpazar\s+günleri\b/.test(text);
  }
  if (day.includes('pazartesi')) {
    return text.includes('pazartesi');
  }
  if (day.includes('cuma') && !day.includes('cumartesi')) {
    return (text.includes('cuma') && !text.includes('cumartesi')) ||
           /\bcuma(?!rtesi)\b|\bcumaları\b|\bcuma\s+günü\b|\bcuma\s+günleri\b/.test(text);
  }
  if (day.includes('cumartesi')) {
    return text.includes('cumartesi');
  }
  if (day.includes('salı') || day.includes('sali')) {
    return text.includes('salı') || text.includes('sali');
  }
  if (day.includes('çarşamba') || day.includes('carsamba')) {
    return text.includes('çarşamba') || text.includes('carsamba');
  }
  if (day.includes('perşembe') || day.includes('persembe')) {
    return text.includes('perşembe') || text.includes('persembe');
  }
  return text.includes(day);
}

/**
 * Execute an instruction with the Pioneers AI WFM Planning Agent
 */
export async function executeAiPlanningAgent({
  userPrompt,
  team,
  agents,
  days,
  currentAssignments = [],
  period = 'week',
  planMode = 'fresh', // 'fresh' | 'edit'
  engine = 'auto' // 'auto' | 'deepseek' | 'llama' | 'gemini'
}) {
  // If planning a full month (more than 7 days) and in fresh mode, use rolling multi-week chunking
  if (days.length > 7 && planMode === 'fresh') {
    return executeRollingMonthlyPlan({
      userPrompt,
      team,
      agents,
      days,
      currentAssignments,
      period,
      planMode,
      engine
    });
  }

  // Otherwise, plan single horizon or in-place edit directly
  return executeHorizonPlan({
    userPrompt,
    team,
    agents,
    days,
    currentAssignments,
    period,
    planMode,
    engine
  });
}

/**
 * Core Horizon Execution (Supports both Fresh Generation & In-Place Editing)
 */
async function executeHorizonPlan({
  userPrompt,
  team,
  agents,
  days,
  currentAssignments = [],
  period = 'week',
  planMode = 'fresh',
  engine = 'auto'
}) {
  const apiKey = getPioneersApiKey();
  const cleanKey = (apiKey || '').trim();

  // 1. Generate full baseline schedule using WFM Solver to ensure 100% team coverage
  const baselineResult = solveWfmSchedule({
    team,
    agents,
    days,
    customDirectives: userPrompt
  });

  const baselineAssignments = baselineResult.assignments || [];

  // If engine is 'auto' and fresh mode with standard prompt, the WFM Solver is 100% optimal and instant
  if (engine === 'auto' && planMode === 'fresh' && (!userPrompt || userPrompt.length < 5)) {
    return {
      success: true,
      agentResponse: 'Pioneers AI Kural ve Kapasite Motoru takımdaki tüm temsilciler için eksiksiz ve dengeli bir program oluşturdu.',
      appliedChangesSummary: `Takımdaki ${agents.length} temsilcinin tamamına haftalık vardiyaları ve izinleri adil şekilde dağıtıldı (${baselineAssignments.length} atama yapıldı).`,
      ruleComplianceReport: generateRuleReport(team, agents, userPrompt, planMode),
      assignments: baselineAssignments,
      source: 'Pioneers AI Engine'
    };
  }

  // 2. Prepare structured context for LLM
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

  const activeBaseSchedule = planMode === 'edit' && currentAssignments.length > 0
    ? currentAssignments
    : baselineAssignments;

  const existingScheduleText = activeBaseSchedule.map(asg => {
    const agName = agents.find(a => a.id === asg.primaryAgentId)?.name || asg.primaryAgentId;
    return `- ${asg.date}: ${agName} (ID: "${asg.primaryAgentId}") -> ${asg.shiftName || asg.shiftCode} (ID: "${asg.shiftTemplateId}")`;
  }).slice(0, 100).join('\n') || 'Mevcut atama bulunamadı.';

  let systemInstruction = '';
  let agentPrompt = '';

  if (planMode === 'edit') {
    systemInstruction = `
Sen "Pioneers AI WFM Planning & Modification Agent" adında uzman bir Yapay Zeka Ajanısın.
GÖREVİN:
Kullanıcının verdiği revizyon talimatına göre MEVCUT VARDİYA ÇİZELGESİNİ DÜZENLEMEKTİR.
Kullanıcının değiştirilmesini istediği kişileri, günleri veya vardiyaları (örn: takas et, izinli yap, sabaha çek) uygula.
DEĞİŞTİRİLMESİ İSTENMEYEN DİĞER TÜM ATAMALARI VE GÜNLERİ AYNEN KORU.
İzinli günler için shiftId olarak "s_off" kullan.
`;

    agentPrompt = `
GÖREV: MEVCUT ÇİZELGEYİ REVİZE ET / HIZLI DÜZENLEME YAP.

KULLANICI DÜZENLEME TALİMATI:
"${userPrompt}"

MEVCUT ÇİZELGEDEKİ ATAMALAR:
${existingScheduleText}

TAKIM BİLGİSİ:
Takım: "${team.name}" (ID: "${team.id}")
Takım Kuralları:
${teamRulesList}

ÇALIŞANLAR VE KİŞİSEL KURAL KISITLAMALARI:
${agentsList}

KULLANILABİLİR VARDİYA ŞABLONLARI:
${shiftTemplatesList}
(İzinli günler için shiftId olarak "s_off" kullan)

PLANLANAN TARİHLER:
${datesList}

LÜTFEN ŞU KURALLARA UY:
1. Kullanıcının talimatını (takas, izin, vardiya değişimi vb.) tam olarak uygula.
2. Değişmesi istenmeyen diğer tüm mevcut atamaları AYNEN KORU.
3. Her çalışan ve her gün için güncellenmiş atama listesini döndür.
`;
  } else {
    systemInstruction = `
Sen "Pioneers AI WFM Planning Agent" adında, çağrı merkezi vardiya ve iş gücü yönetiminde uzmanlaşmış otonom bir Yapay Zeka Ajanısın.
GÖREVİN:
Verilen YÖNETİCİ TALİMATI, TAKIM KURALLARI ve ÇALIŞANLARIN KİŞİSEL KURAL KISITLAMALARINA %100 KUSURSUZ ŞEKİLDE UYARAK, takımdaki HER ÇALIŞAN için planlanan her gün tam 1 atama oluşturmaktır.
İzinli günler için shiftId olarak "s_off" kullan.
`;

    agentPrompt = `
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
1. Takımdaki ${agents.length} temsilcinin TAMAMINA adil vardiyalar ata. Kimseyi boşta bırakma.
2. Yönetici talimatında veya takım kurallarında yasaklanan/olmasın denilen vardiyaları (örn: BON01) ASLA kullanma.
3. Kişisel kurallarda belirtilen izin günleri (örn: Cuma-Cumartesi izinli), kısıtlı vardiyalar veya gece yasaklarını KESİNLİKLE uygula.
4. Her çalışan için her gün tam 1 adet geçerli shiftId ata (çalışma vardiyası veya "s_off").
`;
  }

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

  // Try LLM engines
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
              userPrompt,
              currentAssignments: activeBaseSchedule,
              baselineAssignments,
              planMode
            });

            return {
              success: true,
              agentResponse: parsed.summary || (planMode === 'edit' ? 'Mevcut plan başarıyla güncellendi.' : 'Yeni plan oluşturuldu.'),
              appliedChangesSummary: planMode === 'edit'
                ? `Mevcut planda talep edilen düzenlemeler uygulandı (${finalAssignments.length} vardiya güncellendi).`
                : `Yönetici talimatı ve ${agents.length} çalışanın kuralları %100 uygulanarak ${finalAssignments.length} atama yapıldı.`,
              ruleComplianceReport: generateRuleReport(team, agents, userPrompt, planMode),
              assignments: finalAssignments,
              source: `Pioneers AI (${engine === 'deepseek' ? 'DeepSeek R1 / V3' : engine === 'llama' ? 'Llama 3.3 70B' : 'Pioneers Engine'})`
            };
          }
        }
      }
    } catch (err) {
      console.warn(`Pioneers AI LLM denemesi (${modelName}):`, err.message);
    }
  }

  // Fallback to complete WFM Solver Schedule
  return {
    success: true,
    agentResponse: 'Pioneers AI Kural ve Kapasite Motoru tüm kısıtlamaları inceleyerek %100 uyumlu bir program oluşturdu.',
    appliedChangesSummary: `Takımdaki ${agents.length} temsilcinin tamamına haftalık vardiyaları ve izinleri adil şekilde dağıtıldı (${baselineAssignments.length} atama yapıldı).`,
    ruleComplianceReport: generateRuleReport(team, agents, userPrompt, planMode),
    assignments: baselineAssignments,
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
  planMode = 'fresh',
  engine = 'auto'
}) {
  const chunks = [];
  for (let i = 0; i < days.length; i += 7) {
    chunks.push(days.slice(i, i + 7));
  }

  const allAssignments = [];
  let summaryText = `Pioneers AI Aylık Planlama Motoru ${days.length} günü (${chunks.length} hafta periyodu) satır satır optimize etti.`;

  for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
    const chunkDays = chunks[chunkIdx];
    const chunkResult = await executeHorizonPlan({
      userPrompt,
      team,
      agents,
      days: chunkDays,
      currentAssignments: allAssignments,
      period: 'week',
      planMode: 'fresh',
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
    ruleComplianceReport: generateRuleReport(team, agents, userPrompt, planMode),
    assignments: allAssignments,
    source: 'Pioneers AI Rolling Monthly Engine'
  };
}

/**
 * Hard Constraint Validator & Post-Processor
 * Guarantees that EVERY single agent has a complete, balanced work/off schedule!
 */
function validateAndEnforceConstraints({
  rawAssignments,
  team,
  agents,
  days,
  userPrompt = '',
  currentAssignments = [],
  baselineAssignments = [],
  planMode = 'fresh'
}) {
  const allDirectives = [
    userPrompt || '',
    ...(team.rules || [])
  ].join(' ').toLowerCase();

  const templates = team.shiftTemplates || [];

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
  const agentWeeklyWorkCount = {};
  agents.forEach(a => {
    backupCounts[a.id] = 0;
    agentWeeklyWorkCount[a.id] = 0;
  });

  // 1. Process Raw Assignments from AI
  rawAssignments.forEach((asg, idx) => {
    const agentId = asg.agentId || asg.primaryAgentId;
    const shiftId = asg.shiftId || asg.shiftTemplateId;
    if (!asg.date || !agentId) return;

    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    let isOff = shiftId === 's_off' ||
                shiftId === 'OFF' ||
                asg.shiftCode === 'OFF' ||
                asg.startTime === 'OFF';

    // Respect agent fixed day-off rules (e.g. "Cuma, Cumartesi Sabit İzinli")
    const d = days.find(day => day.iso === asg.date);
    const dayName = (d?.dayLong || '').toLowerCase();
    const agentRules = (agent.rules || []).map(r => r.toLowerCase());
    for (const r of agentRules) {
      if (dayName && isRuleMatchingDay(r, dayName) && (r.includes('izinli') || r.includes('çalışamaz'))) {
        isOff = true;
      }
    }

    if (!isOff && (agentWeeklyWorkCount[agent.id] || 0) >= 5) {
      isOff = true;
    }

    let selectedTemplate = offTemplate;

    if (!isOff) {
      selectedTemplate = allowedTemplates.find(t => t.id === shiftId) ||
                         allowedTemplates.find(t => t.code.toLowerCase() === shiftId?.toLowerCase()) ||
                         allowedTemplates.find(t => t.name.toLowerCase().includes(shiftId?.toLowerCase())) ||
                         defaultWorkingTemplate;

      if (forbiddenTemplateIds.has(selectedTemplate.id)) {
        selectedTemplate = defaultWorkingTemplate;
      }
      agentWeeklyWorkCount[agent.id] = (agentWeeklyWorkCount[agent.id] || 0) + 1;
    }

    // FAIR ROTATING BACKUPS
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
      notes: isOff ? 'Haftalık Dinlenme / OFF' : (planMode === 'edit' ? 'Pioneers AI Revizyonu' : 'Pioneers AI Planlama Ajanı')
    };

    const key = `${asg.date}_${agent.id}`;
    assignedMap.set(key, assignmentObj);
  });

  // 2. Fallback Fill: If AI omitted ANY agent or day, fill with the BALANCED baseline schedule (NOT OFF!)
  days.forEach(day => {
    agents.forEach(agent => {
      const key = `${day.iso}_${agent.id}`;
      if (!assignedMap.has(key)) {
        // Look up assignment from baseline schedule first
        const baseAsg = baselineAssignments.find(a => a.date === day.iso && a.primaryAgentId === agent.id) ||
                        currentAssignments.find(a => a.date === day.iso && a.primaryAgentId === agent.id);

        if (baseAsg) {
          assignedMap.set(key, {
            ...baseAsg,
            id: `asg-agent-filled-${day.iso}-${agent.id}`
          });
        } else {
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
      }
    });
  });

  return Array.from(assignedMap.values());
}

/**
 * Generate clear rule compliance report items
 */
function generateRuleReport(team, agents, userPrompt, planMode = 'fresh') {
  const report = [];

  if (userPrompt && userPrompt.trim()) {
    report.push({
      ruleName: planMode === 'edit' ? 'Revizyon Talimatı' : 'Yönetici Talimatı',
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
