import type { DateTimePickerMode } from '@/types/date-time-picker.types';

export function formatLocalDate(value: Date): string {
  return `${String(value.getFullYear()).padStart(4, '0')}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

export function formatLocalTime(value: Date): string {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

/** Parse calendar fields locally, never as UTC timestamps. Reject rollover dates. */
export function parseLocalDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(2000, 0, 1);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date : null;
}

export function parseLocalTime(value: string, base: Date): Date | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  const date = new Date(base);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function isPickerValueInRange(
  value: Date,
  mode: DateTimePickerMode,
  minimumDate?: Date,
  maximumDate?: Date,
): boolean {
  if (!Number.isFinite(value.getTime())) return false;
  if (mode === 'time') return true;
  const day = formatLocalDate(value);
  return (!minimumDate || day >= formatLocalDate(minimumDate))
    && (!maximumDate || day <= formatLocalDate(maximumDate));
}

export function initialPickerValue(
  value: Date,
  mode: DateTimePickerMode,
  minimumDate?: Date,
  maximumDate?: Date,
): Date {
  let result = Number.isFinite(value.getTime()) ? new Date(value) : new Date();
  if (mode === 'date') {
    if (minimumDate && formatLocalDate(result) < formatLocalDate(minimumDate)) result = new Date(minimumDate);
    if (maximumDate && formatLocalDate(result) > formatLocalDate(maximumDate)) result = new Date(maximumDate);
  }
  return result;
}
