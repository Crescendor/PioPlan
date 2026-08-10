// src/utils/dateUtils.js
// Date and Time Helper Functions for PioPlan Call Center Scheduler

export const TURKISH_DAYS_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
export const TURKISH_DAYS_LONG = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
export const TURKISH_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

/**
 * Format a Date object to YYYY-MM-DD
 */
export function formatDateISO(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD to a local Date object
 */
export function parseDateISO(isoStr) {
  if (!isoStr) return new Date();
  const [y, m, d] = isoStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Returns Monday of the week for given date
 */
export function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Get 7 days array for given week
 */
export function getDaysOfWeek(mondayDate) {
  const days = [];
  const start = new Date(mondayDate);
  for (let i = 0; i < 7; i++) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const iso = formatDateISO(current);
    days.push({
      date: current,
      iso,
      dayIndex: i, // 0 = Monday ... 6 = Sunday
      dayShort: TURKISH_DAYS_SHORT[i],
      dayLong: TURKISH_DAYS_LONG[i],
      dayNumber: current.getDate(),
      monthNumber: current.getMonth() + 1,
      monthName: TURKISH_MONTHS[current.getMonth()],
      isWeekend: i === 5 || i === 6,
      isToday: formatDateISO(new Date()) === iso,
    });
  }
  return days;
}

/**
 * Get all days for a given year and month (0-indexed month)
 */
export function getDaysInMonth(year, month) {
  const days = [];
  const numDays = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= numDays; day++) {
    const current = new Date(year, month, day);
    const dayOfWeek = current.getDay();
    const adjustedDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const iso = formatDateISO(current);
    days.push({
      date: current,
      iso,
      dayIndex: adjustedDayIndex,
      dayShort: TURKISH_DAYS_SHORT[adjustedDayIndex],
      dayLong: TURKISH_DAYS_LONG[adjustedDayIndex],
      dayNumber: day,
      monthNumber: month + 1,
      monthName: TURKISH_MONTHS[month],
      year,
      isWeekend: adjustedDayIndex === 5 || adjustedDayIndex === 6,
      isToday: formatDateISO(new Date()) === iso,
    });
  }
  return days;
}

/**
 * Format date display: "10 Ağustos 2026, Pazartesi"
 */
export function formatTurkishDisplay(isoStr) {
  if (!isoStr) return '';
  const d = parseDateISO(isoStr);
  const dayName = TURKISH_DAYS_LONG[d.getDay() === 0 ? 6 : d.getDay() - 1];
  return `${d.getDate()} ${TURKISH_MONTHS[d.getMonth()]} ${d.getFullYear()}, ${dayName}`;
}

/**
 * Calculate duration in hours between two HH:mm strings (supports overnight)
 */
export function calculateShiftDurationHours(startTime, endTime) {
  if (!startTime || !endTime || startTime === 'OFF' || endTime === 'OFF') return 0;
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  let startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;

  if (endMinutes < startMinutes) {
    // Overnight shift crossing midnight
    endMinutes += 24 * 60;
  }

  const durationMinutes = endMinutes - startMinutes;
  return Number((durationMinutes / 60).toFixed(1));
}

/**
 * Check if a shift is active at a specific hour on a date
 */
export function isShiftActiveAtHour(startTime, endTime, targetHour) {
  if (!startTime || !endTime || startTime === 'OFF') return false;
  const [startH] = startTime.split(':').map(Number);
  const [endH] = endTime.split(':').map(Number);

  if (startH <= endH) {
    return targetHour >= startH && targetHour < endH;
  } else {
    // Overnight (e.g. 22:00 - 06:00)
    return targetHour >= startH || targetHour < endH;
  }
}

/**
 * Generates 24-hour slots [0..23] with formatted labels
 */
export function get24HourSlots() {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: `${String(hour).padStart(2, '0')}:00`,
    timeWindow: `${String(hour).padStart(2, '0')}:00 - ${String((hour + 1) % 24).padStart(2, '0')}:00`,
  }));
}
