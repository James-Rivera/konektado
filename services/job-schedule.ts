import type { JobSchedule } from '@/types/marketplace.types';
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const blocks = { morning:'Morning', afternoon:'Afternoon', evening:'Evening', anytime:'Anytime' } as const;
export function manilaDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Manila', year:'numeric', month:'2-digit', day:'2-digit' }).format(now);
}
export function getJobScheduleError(schedule: JobSchedule | null | undefined, now = new Date()) {
  if (!schedule || typeof schedule !== 'object') return 'Choose a job date and time preference.';
  if (schedule.timeZone !== 'Asia/Manila') return 'Use Philippine time for this job.';
  const match = schedule.date?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return 'Choose a valid job date.';
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y),Number(m)-1,Number(d)));
  if (date.getUTCFullYear() !== Number(y) || date.getUTCMonth() !== Number(m)-1 || date.getUTCDate() !== Number(d)) return 'Choose a valid job date.';
  if (schedule.date < manilaDate(now)) return 'Choose today or a future job date.';
  if (!['morning','afternoon','evening','anytime','exact'].includes(schedule.timePreference)) return 'Choose a time preference.';
  if (!['fixed','flexible'].includes(schedule.flexibility)) return 'Choose whether the time is flexible.';
  if (schedule.timePreference === 'exact' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.exactTime ?? '')) return 'Choose a valid exact time.';
  return null;
}
export function formatJobSchedule(schedule: JobSchedule | null | undefined) {
  if (!schedule) return '';
  const [year,month,day] = schedule.date.split('-').map(Number);
  if (!months[month-1] || !year || !day) return '';
  const [hours,minutes] = (schedule.exactTime ?? '').split(':').map(Number);
  const time = schedule.timePreference === 'exact'
    ? (hours % 12 || 12) + ':' + String(minutes).padStart(2,'0') + ' ' + (hours >= 12 ? 'PM' : 'AM') : blocks[schedule.timePreference];
  return months[month-1] + ' ' + day + ', ' + year + ' · ' + time + ' · ' + (schedule.flexibility === 'fixed' ? 'Must be this time' : 'Can coordinate');
}
/** Compatibility only: ambiguous free text is never guessed. */
export function parseLegacyJobSchedule(value: string | null | undefined): JobSchedule | null {
  const match = value?.trim().match(/^([A-Z][a-z]{2}) (\d{1,2}), (\d{4}) · (Morning|Afternoon|Evening|Anytime|(?:[1-9]|1[0-2]):[0-5]\d (?:AM|PM)) · (Must be this time|Can coordinate|Fixed|Flexible)$/);
  if (!match || !months.includes(match[1])) return null;
  const date = match[3] + '-' + String(months.indexOf(match[1])+1).padStart(2,'0') + '-' + match[2].padStart(2,'0');
  const timeMatch = match[4].match(/^(\d{1,2}):(\d{2}) (AM|PM)$/);
  const result: JobSchedule = { date, timePreference: timeMatch ? 'exact' : match[4].toLowerCase() as JobSchedule['timePreference'],
    exactTime: timeMatch ? String(Number(timeMatch[1]) % 12 + (timeMatch[3] === 'PM' ? 12 : 0)).padStart(2,'0') + ':' + timeMatch[2] : null,
    flexibility: ['Fixed','Must be this time'].includes(match[5]) ? 'fixed' : 'flexible', timeZone:'Asia/Manila' };
  return getJobScheduleError(result,new Date(date+'T00:00:00+08:00')) ? null : result;
}
export function scheduleToColumns(schedule?: JobSchedule | null) {
  return { scheduled_date:schedule?.date || null, time_preference:schedule?.timePreference || null,
    exact_time:schedule?.timePreference === 'exact' ? schedule.exactTime || null : null,
    schedule_flexibility:schedule?.flexibility || null, schedule_timezone:schedule?.timeZone || 'Asia/Manila' };
}
export type ScheduleColumns = { scheduled_date?: string | null; time_preference?: string | null; exact_time?: string | null; schedule_flexibility?: string | null; schedule_timezone?: string | null };
export function scheduleFromColumns(row: ScheduleColumns): JobSchedule | null {
  if (!row.scheduled_date) return null;
  return { date:row.scheduled_date, timePreference:row.time_preference as JobSchedule['timePreference'], exactTime:row.exact_time?.slice(0,5) ?? null,
    flexibility:row.schedule_flexibility as JobSchedule['flexibility'], timeZone:row.schedule_timezone as JobSchedule['timeZone'] };
}
