import { addMinutes, format, isValid, parseISO } from 'date-fns';

/**
 * Parses flexible date string (YYYY-MM-DD, YYYY-MM-DD HH:mm, YYYY-MM-DDTHH:mm, YYYY/MM/DD HH:mm).
 */
export function parseFlexibleDate(dateStr: string): Date {
  if (!dateStr) return new Date(2023, 0, 1, 0, 0);
  const normalized = dateStr.trim().replace(' ', 'T').replace(/\//g, '-');
  let parsed = parseISO(normalized);
  if (!isValid(parsed)) {
    parsed = new Date(dateStr);
  }
  if (!isValid(parsed)) {
    parsed = new Date(2023, 0, 1, 0, 0);
  }
  return parsed;
}

/**
 * Calculates the scaled date string based on the initial start date, frame step index, and time multiplier.
 * Accurate down to minutes when time is provided or when fractional scaling is used.
 * @param startDateStr Start date in YYYY-MM-DD or YYYY-MM-DD HH:mm format
 * @param stepIndex The current frame index (0-based)
 * @param multiplier The time multiplier k (can be fractional)
 */
export function getScaledDateString(startDateStr: string, stepIndex: number, multiplier: number = 1): string {
  if (!startDateStr) return '2023-01-01 00:00';
  try {
    const baseDate = parseFlexibleDate(startDateStr);
    const totalMinutes = Math.max(0, Math.round(stepIndex * multiplier * 1440));
    const scaled = addMinutes(baseDate, totalMinutes);

    const hasTimeInput = startDateStr.includes(':') || startDateStr.includes('T');
    const hasFractionalMinutes = totalMinutes % 1440 !== 0;

    if (hasTimeInput || hasFractionalMinutes) {
      return format(scaled, 'yyyy-MM-dd HH:mm');
    }
    return format(scaled, 'yyyy-MM-dd');
  } catch (e) {
    return startDateStr;
  }
}

/**
 * Calculates scaled date-time string detailed down to minutes based on continuous progress.
 * @param startDateStr Start date in YYYY-MM-DD or YYYY-MM-DD HH:mm format
 * @param totalDaysScaled Total days simulated (including multiplier)
 * @param progressVal Progress fraction from 0.0 to 1.0
 */
export function getScaledDateTimeString(startDateStr: string, totalDaysScaled: number, progressVal: number): string {
  if (!startDateStr) return '2023/01/01 00:00';
  const totalMinutes = Math.max(0, Math.round(progressVal * totalDaysScaled * 1440));
  try {
    const baseDate = parseFlexibleDate(startDateStr);
    const scaled = addMinutes(baseDate, totalMinutes);
    return format(scaled, 'yyyy/MM/dd HH:mm');
  } catch (e) {
    return `${startDateStr.replace(/-/g, '/')} 00:00`;
  }
}


