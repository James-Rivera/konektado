import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { runtimeService } from './helpers/runtime-service';

type PhotoSource = 'job_photo' | 'service_photo' | 'profile_photo';
type VisibilityService = {
  getPublicPhotoKey(input: { imageUrl: string; sourceId: string; sourceType: PhotoSource }): string;
  filterVisiblePhotoUrls(input: { photoUrls: string[]; sourceId: string; sourceType: PhotoSource }): Promise<string[]>;
  getVisibleProfileAvatarUrl(input: { avatarUrl: string | null; profileId: string }): Promise<string | null>;
  applyPublicPhotoVisibilityToRows<T extends { id: string; photo_urls: string[] }>(rows: T[], sourceType: PhotoSource): Promise<T[]>;
  applyPublicPhotoVisibilityToProfiles<T extends { id: string; avatarUrl: string | null }>(profiles: Map<string, T>): Promise<Map<string, T>>;
};
type VisibilityResponse = { data: unknown[] | null; error: { message: string } | null };

function setup() {
  let response: VisibilityResponse = { data: [], error: null };
  let rejectRequest = false;
  let requests = 0;
  const service = runtimeService<VisibilityService>('@/services/content-visibility.service', {
    '@/utils/supabase': {
      supabase: {
        from() {
          return { select: () => ({ in: async () => {
            requests++;
            if (rejectRequest) throw new Error('Synthetic network interruption');
            return response;
          } }) };
        },
      },
    },
  });
  return {
    service,
    respond(next: VisibilityResponse) { response = next; rejectRequest = false; },
    interrupt() { rejectRequest = true; },
    requests: () => requests,
  };
}

const image = 'https://example.invalid/qa-photo.jpg';

describe('public-photo moderation failure handling', () => {
  it('withholds a hidden listing photo when its moderation lookup subsequently fails', async () => {
    const qa = setup();
    const input = { photoUrls: [image], sourceId: 'job-qa', sourceType: 'job_photo' as const };
    const key = qa.service.getPublicPhotoKey({ imageUrl: image, sourceId: input.sourceId, sourceType: input.sourceType });
    qa.respond({ data: [{ content_id: key, visibility: 'hidden' }], error: null });
    assert.deepEqual(Array.from(await qa.service.filterVisiblePhotoUrls(input)), []);
    qa.respond({ data: null, error: { message: 'Synthetic visibility failure' } });
    assert.deepEqual(Array.from(await qa.service.filterVisiblePhotoUrls(input)), []);
  });

  it('keeps successful empty moderation results distinct from failed reads and recovers', async () => {
    const qa = setup();
    const input = { photoUrls: [image, image], sourceId: 'service-qa', sourceType: 'service_photo' as const };
    qa.respond({ data: null, error: { message: 'Synthetic lookup failure' } });
    assert.equal((await qa.service.filterVisiblePhotoUrls(input)).length, 0);
    qa.respond({ data: [], error: null });
    assert.deepEqual(Array.from(await qa.service.filterVisiblePhotoUrls(input)), [image]);
    assert.equal(qa.requests(), 2, 'a temporary failure must not become a permanent cached hide');
  });

  it('withholds profile avatars on returned errors and rejected requests', async () => {
    const qa = setup();
    const input = { avatarUrl: image, profileId: 'profile-qa' };
    qa.respond({ data: null, error: { message: 'Synthetic permission error' } });
    assert.equal(await qa.service.getVisibleProfileAvatarUrl(input), null);
    qa.interrupt();
    assert.equal(await qa.service.getVisibleProfileAvatarUrl(input), null);
    qa.respond({ data: [], error: null });
    assert.equal(await qa.service.getVisibleProfileAvatarUrl(input), image);
  });

  it('preserves listing/profile content while withholding only unverified image visibility', async () => {
    const qa = setup();
    qa.respond({ data: null, error: { message: 'Synthetic moderation timeout' } });
    const originalRows = [{ id: 'job-qa', title: 'Keep this listing', photo_urls: [image] }];
    const rows = await qa.service.applyPublicPhotoVisibilityToRows(originalRows, 'job_photo');
    assert.equal(rows[0].title, 'Keep this listing');
    assert.equal(rows[0].photo_urls.length, 0);
    assert.equal(originalRows[0].photo_urls.length, 1, 'do not mutate source listing');
    const originalProfiles = new Map([['profile-qa', { id: 'profile-qa', name: 'Synthetic resident', avatarUrl: image }]]);
    const profiles = await qa.service.applyPublicPhotoVisibilityToProfiles(originalProfiles);
    assert.equal(profiles.get('profile-qa')?.name, 'Synthetic resident');
    assert.equal(profiles.get('profile-qa')?.avatarUrl, null);
    assert.equal(originalProfiles.get('profile-qa')?.avatarUrl, image, 'do not mutate source profile');
  });

  it('does not perform a lookup when there are no photos to display', async () => {
    const qa = setup();
    assert.equal((await qa.service.filterVisiblePhotoUrls({ photoUrls: [], sourceId: 'job-qa', sourceType: 'job_photo' })).length, 0);
    assert.equal(await qa.service.getVisibleProfileAvatarUrl({ avatarUrl: null, profileId: 'profile-qa' }), null);
    assert.equal(qa.requests(), 0);
  });
});
