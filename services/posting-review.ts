import { getCategoryForMvpService } from '@/constants/service-taxonomy';
import type { JobDraftSummary, ServiceDraftSummary } from '@/types/marketplace.types';

type Snapshot = { kind: 'job' | 'service'; value: object; expires: number };
const snapshots = new Map<string, Snapshot>();
let sequence = 0;

/** Unsaved edits stay in memory; route parameters carry only an opaque, short-lived token. */
export function putReviewSnapshot(kind: Snapshot['kind'], value: object) {
  for (const [key, snapshot] of snapshots) if (snapshot.expires < Date.now()) snapshots.delete(key);
  if (snapshots.size >= 8) snapshots.delete(snapshots.keys().next().value!);
  const key = `review-${Date.now()}-${++sequence}`;
  snapshots.set(key, { kind, value: JSON.parse(JSON.stringify(value)), expires: Date.now() + 30 * 60_000 });
  return key;
}
export function readReviewSnapshot<T>(key: string | undefined, kind: Snapshot['kind']): T | null {
  if (!key) return null;
  const snapshot = snapshots.get(key);
  return snapshot && snapshot.kind === kind && snapshot.expires > Date.now()
    ? JSON.parse(JSON.stringify(snapshot.value)) as T : null;
}
export function clearReviewSnapshots() { snapshots.clear(); }

export function jobDraftToReview(row: JobDraftSummary) {
  return { ...row, title: row.title ?? '', description: row.description ?? '', category: row.category ?? '',
    serviceNeeded: row.serviceNeeded ?? '', barangay: row.barangay ?? '', locationText: row.locationText ?? '',
    privateLocationNotes: row.privateLocationNotes ?? '', budgetMin: row.budgetMin === null ? '' : String(row.budgetMin),
    budgetMax: row.budgetMax === null ? '' : String(row.budgetMax), workersNeeded: String(row.workersNeeded ?? 1),
    scheduleText: row.scheduleText ?? '', certificationNote: row.certificationNote ?? '' };
}
export function serviceDraftToReview(row: ServiceDraftSummary) {
  return { ...row, title: row.title ?? '', description: row.description ?? '', category: row.category ?? '',
    customCategory: row.customCategory ?? '', availability: row.availabilityText ?? '',
    rate: row.rateText ?? '', rateMin: row.rateMin === null ? '' : String(row.rateMin),
    rateMax: row.rateMax === null ? '' : String(row.rateMax), locationText: row.locationText ?? '',
    certificationNote: row.certificationNote ?? '', serviceGroup: getCategoryForMvpService(row.category) };
}
