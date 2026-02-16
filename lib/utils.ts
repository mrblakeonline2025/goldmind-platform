import { GroupInstance } from '../types';

/**
 * Parses time strings in formats like "17:00", "5:00pm", "05:00 PM"
 */
export const parseTimeString = (timeStr: string) => {
  if (!timeStr) return null;
  
  // Try matching 12-hour format (e.g., 5:00pm)
  const match12 = timeStr.match(/(\d+):(\d+)\s*(am|pm)/i);
  if (match12) {
    let h = parseInt(match12[1]);
    const m = parseInt(match12[2]);
    const ampm = match12[3].toLowerCase();
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    return { h, m };
  }

  // Try matching 24-hour format (e.g., 17:00)
  const match24 = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (match24) {
    const h = parseInt(match24[1]);
    const m = parseInt(match24[2]);
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      return { h, m };
    }
  }

  return null;
};

/**
 * Normalizes time strings to HH:MM format
 */
export const normalizeTime = (timeStr: string) => {
  const parsed = parseTimeString(timeStr);
  if (!parsed) return timeStr;
  const h = parsed.h.toString().padStart(2, '0');
  const m = parsed.m.toString().padStart(2, '0');
  return `${h}:${m}`;
};

/**
 * Main formatter for group instance schedules
 * Expected Output: "Mon 16 Feb 2026 • 19:00"
 */
export const formatInstanceSchedule = (inst: Partial<GroupInstance>) => {
  if (!inst.sessionDate || !/^\d{4}-\d{2}-\d{2}$/.test(inst.sessionDate)) {
    const time = inst.startTime ? normalizeTime(inst.startTime) : 'TBC';
    return `Schedule Pending • ${time}`;
  }

  const [year, month, day] = inst.sessionDate.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  
  // Options for specific parts to ensure correct localization
  const dayPart = dateObj.toLocaleDateString('en-GB', { weekday: 'short' }); 
  const dayNum = dateObj.toLocaleDateString('en-GB', { day: 'numeric' }); // 16
  const monthPart = dateObj.toLocaleDateString('en-GB', { month: 'short' }); // Feb
  const yearPart = dateObj.getFullYear();

  const timePart = inst.startTime ? normalizeTime(inst.startTime) : 'TBC';
  
  return `${dayPart} ${dayNum} ${monthPart} ${yearPart} • ${timePart}`;
};

export const getSessionDateObj = (inst: Partial<GroupInstance>): Date | null => {
  if (!inst.sessionDate || !inst.startTime) return null;
  const normalized = normalizeTime(inst.startTime);
  // Construct ISO string for local time parsing
  return new Date(`${inst.sessionDate}T${normalized}:00`);
};

export const getCountdownLabel = (ms: number): string => {
  const totalMins = Math.floor(ms / 60000);
  const days = Math.floor(totalMins / 1440);
  const hrs = Math.floor((totalMins % 1440) / 60);
  const mins = totalMins % 60;

  if (days > 0) return `Opens in ${days}d ${hrs}h`;
  if (hrs > 0) return `Opens in ${hrs}h ${mins}m`;
  return `Opens in ${mins}m`;
};

/**
 * Calculates the next occurrence of a specific day of the week
 */
export const getNextOccurrence = (dayName: string) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const targetDay = days.indexOf(dayName);
  if (targetDay === -1) return new Date().toISOString().split('T')[0];
  
  const now = new Date();
  const currentDay = now.getDay();
  let diff = targetDay - currentDay;
  if (diff <= 0) diff += 7; 
  
  const nextDate = new Date();
  nextDate.setDate(now.getDate() + diff);
  return nextDate.toISOString().split('T')[0];
};
