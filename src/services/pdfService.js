// src/services/pdfService.js
// PDF Export Service using jsPDF for PioPlan Call Center Shift Schedules

import { jsPDF } from 'jspdf';
import { formatTurkishDisplay } from '../utils/dateUtils';

/**
 * Generates and downloads a personal employee shift schedule PDF
 */
export function exportEmployeeSchedulePdf({
  agent,
  team,
  assignments,
  monthName,
  year,
  totalHours,
  standbyCount
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Background Accent
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('PioPlan - Bireysel Vardiya Cizelgesi', 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text(`Pioneers AI Destekli Cagrı Merkezi Is Gucu Yonetimi`, 14, 26);
  doc.text(`Olusturulma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, 14, 33);

  // Employee Profile Card in PDF
  doc.setFillColor(241, 245, 249); // Slate 100
  doc.roundedRect(14, 46, pageWidth - 28, 30, 3, 3, 'F');

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`Temsilci: ${agent.name}`, 20, 56);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Takim: ${team.name} (${team.code})`, 20, 64);
  doc.text(`Unvan: ${agent.seniority} - ${agent.title || 'Musteri Temsilcisi'}`, 20, 71);

  doc.text(`Donem: ${monthName} ${year}`, 110, 56);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 118, 110); // Teal
  doc.text(`Toplam Calisma Saati: ${totalHours.toFixed(1)} Saat`, 110, 64);
  doc.setTextColor(180, 83, 9); // Amber
  doc.text(`Yedek/Nobetci Gorevleri: ${standbyCount} Gun`, 110, 71);

  // Table Headers
  let currentY = 86;
  doc.setFillColor(30, 41, 59);
  doc.rect(14, currentY, pageWidth - 28, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');

  doc.text('Tarih', 18, currentY + 6);
  doc.text('Vardiya Adi', 60, currentY + 6);
  doc.text('Mesai Saatleri', 115, currentY + 6);
  doc.text('Sure', 155, currentY + 6);
  doc.text('Rol / Durum', 170, currentY + 6);

  currentY += 9;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  assignments.forEach((asg, index) => {
    if (currentY > 265) {
      doc.addPage();
      currentY = 20;
      // Re-add header on new page
      doc.setFillColor(30, 41, 59);
      doc.rect(14, currentY, pageWidth - 28, 9, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('Tarih', 18, currentY + 6);
      doc.text('Vardiya Adi', 60, currentY + 6);
      doc.text('Mesai Saatleri', 115, currentY + 6);
      doc.text('Sure', 155, currentY + 6);
      doc.text('Rol / Durum', 170, currentY + 6);
      currentY += 9;
      doc.setFont('helvetica', 'normal');
    }

    const isEven = index % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(14, currentY, pageWidth - 28, 8, 'F');

    const isPrimary = asg.primaryAgentId === agent.id;
    const isBackup1 = asg.backupAgent1Id === agent.id;
    const isBackup2 = asg.backupAgent2Id === agent.id;
    const isOff = asg.startTime === 'OFF';

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(8.5);
    doc.text(asg.date, 18, currentY + 5.5);
    doc.text(asg.shiftName.slice(0, 24), 60, currentY + 5.5);

    if (isOff) {
      doc.setTextColor(148, 163, 184);
      doc.text('IZINLI / OFF', 115, currentY + 5.5);
      doc.text('0 saat', 155, currentY + 5.5);
      doc.text('Haftalik Izin', 170, currentY + 5.5);
    } else {
      doc.setTextColor(30, 41, 59);
      doc.text(`${asg.startTime} - ${asg.endTime}`, 115, currentY + 5.5);
      doc.text(`${asg.durationHours}s`, 155, currentY + 5.5);

      if (isPrimary) {
        doc.setTextColor(16, 185, 129); // Green
        doc.text('Asil Gorevli', 170, currentY + 5.5);
      } else if (isBackup1) {
        doc.setTextColor(245, 158, 11); // Amber
        doc.text('1. Yedek (Standby)', 170, currentY + 5.5);
      } else if (isBackup2) {
        doc.setTextColor(139, 92, 246); // Purple
        doc.text('2. Yedek', 170, currentY + 5.5);
      }
    }

    // Border line
    doc.setDrawColor(226, 232, 240);
    doc.line(14, currentY + 8, pageWidth - 14, currentY + 8);

    currentY += 8;
  });

  // Footer / Compliance Note
  currentY += 8;
  if (currentY > 260) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFillColor(240, 253, 244); // Green tint
  doc.roundedRect(14, currentY, pageWidth - 28, 18, 2, 2, 'F');
  doc.setTextColor(22, 101, 52);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Pioneers AI Kalite & Vardiya Onayi:', 18, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text('Bu cizelge sirket WFM kural seti ve yasal calisma saatleri cercevesinde otomatik denetlenmistir.', 18, currentY + 12);

  // Save PDF
  const filename = `PioPlan_${agent.name.replace(/\s+/g, '_')}_${monthName}_${year}.pdf`;
  doc.save(filename);
}

/**
 * Generates and downloads a complete Team Master Roster PDF
 */
export function exportTeamRosterPdf({
  team,
  agents,
  days,
  assignments,
  periodLabel = 'Haftalik Vardiya Plani'
}) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`PioPlan - ${team.name} Vardiya Programi`, 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Pioneers AI Operasyonel Cizelge | ${periodLabel} | Toplam Temsilci: ${agents.length}`, 14, 22);
  doc.text(`Duzenleme Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, pageWidth - 70, 22);

  let currentY = 38;

  // Grid Header (Days)
  doc.setFillColor(30, 41, 59);
  doc.rect(14, currentY, pageWidth - 28, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');

  doc.text('Temsilci / Unvan', 18, currentY + 6.5);

  const colWidth = (pageWidth - 28 - 50) / days.length;
  days.forEach((day, idx) => {
    const x = 64 + idx * colWidth;
    doc.text(`${day.dayShort} ${day.dayNumber}`, x, currentY + 6.5);
  });

  currentY += 10;

  // Agent Rows
  agents.forEach((ag, agIdx) => {
    if (currentY > 185) {
      doc.addPage();
      currentY = 20;
    }

    const isEven = agIdx % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(14, currentY, pageWidth - 28, 14, 'F');

    // Agent name and seniority
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(ag.name, 18, currentY + 6);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(ag.seniority, 18, currentY + 11);

    // Days slots
    days.forEach((day, dIdx) => {
      const x = 64 + dIdx * colWidth;
      const agentAsg = assignments.find(a => a.date === day.iso && a.primaryAgentId === ag.id);
      const isBackup = assignments.some(a => a.date === day.iso && (a.backupAgent1Id === ag.id || a.backupAgent2Id === ag.id));

      if (agentAsg) {
        if (agentAsg.startTime === 'OFF') {
          doc.setTextColor(148, 163, 184);
          doc.setFontSize(7.5);
          doc.text('OFF / Izin', x, currentY + 8);
        } else {
          doc.setTextColor(15, 23, 42);
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'bold');
          doc.text(agentAsg.shiftCode || agentAsg.shiftName.slice(0, 6), x, currentY + 6);
          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(71, 85, 105);
          doc.text(`${agentAsg.startTime}-${agentAsg.endTime}`, x, currentY + 11);
        }
      } else if (isBackup) {
        doc.setTextColor(217, 119, 6); // Amber
        doc.setFontSize(7.5);
        doc.text('Yedek Nobet', x, currentY + 8);
      } else {
        doc.setTextColor(203, 213, 225);
        doc.setFontSize(7.5);
        doc.text('-', x, currentY + 8);
      }
    });

    doc.setDrawColor(226, 232, 240);
    doc.line(14, currentY + 14, pageWidth - 14, currentY + 14);
    currentY += 14;
  });

  const filename = `PioPlan_${team.name.replace(/\s+/g, '_')}_Roster.pdf`;
  doc.save(filename);
}
