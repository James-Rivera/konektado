import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { runtimeService } from './helpers/runtime-service';

type PhotoSource = 'profile_photo' | 'job_photo' | 'service_photo';
type PhotoKeyInput = { imageUrl: string; sourceId: string; sourceType: PhotoSource };
type VisibilityService = {
  subscribePhotoVisibilityUnavailable(listener: () => void): () => void;
  loadPublicPhotoVisibility(keys: string[]): Promise<Map<string, unknown> & { available: boolean }>;
  getPublicPhotoKey(input: PhotoKeyInput): string;
  filterVisiblePhotoUrls(input: {
    photoUrls: string[]; sourceId: string; sourceType: PhotoSource;
  }): Promise<string[]>;
  getVisibleProfileAvatarUrl(input: { avatarUrl: string; profileId: string }): Promise<string | null>;
  applyPublicPhotoVisibilityToProfiles<T extends { id: string; avatarUrl: string | null }>(
    profiles: Map<string, T>,
  ): Promise<Map<string, T>>;
  applyPublicPhotoVisibilityToRows<T extends { id: string; photo_urls?: string[] | null }>(
    rows: T[], sourceType: 'job_photo' | 'service_photo',
  ): Promise<T[]>;
};

function fixture(response: unknown, rejects = false) {
  const requests: string[][] = [];
  const query = {
    select: () => query,
    in: async (_column: string, keys: string[]) => {
      requests.push(keys);
      if (rejects) throw new Error('Network unavailable');
      return response;
    },
  };
  const service = runtimeService<VisibilityService>('@/services/content-visibility.service', {
    '@/utils/supabase': { supabase: { from: () => query } },
  });
  return { service, requests };
}

const photo = 'https://example.test/photo.jpg';
const secondPhoto = 'https://example.test/second.jpg';
const sourceId = 'listing';
const sourceType = 'job_photo' as const;

describe('public photo visibility recovery', () => {
  it('notifies subscribers only on failure, supports unsubscribe and isolates feedback errors', async () => {
    const response: { data: unknown; error: unknown } = { data: [], error: null };
    const { service } = fixture(response);
    let notifications = 0;
    const unsubscribe = service.subscribePhotoVisibilityUnavailable(() => { notifications += 1; });
    service.subscribePhotoVisibilityUnavailable(() => { throw new Error('Feedback failed'); });
    await service.loadPublicPhotoVisibility(['key']);
    assert.equal(notifications, 0);
    response.data = null;
    const result = await service.loadPublicPhotoVisibility(['key']);
    assert.equal(result.available, false);
    assert.equal(notifications, 1);
    unsubscribe();
    await service.loadPublicPhotoVisibility(['key']);
    assert.equal(notifications, 1);
  });
  it('distinguishes a successful absent moderation row from an unavailable lookup', async () => {
    const { service } = fixture({ data: [], error: null });
    const result = await service.loadPublicPhotoVisibility(['key']);
    assert.equal(result.available, true);
    assert.equal(result.size, 0);
    assert.deepEqual(Array.from(await service.filterVisiblePhotoUrls({ photoUrls: [photo], sourceId, sourceType })), [photo]);
    assert.equal(await service.getVisibleProfileAvatarUrl({ avatarUrl: photo, profileId: 'person' }), photo);
  });

  for (const state of ['hidden', 'visible'] as const) {
    it(`honors a known ${state} row without suppressing unrelated photos`, async () => {
      const response = { data: [] as unknown[], error: null };
      const { service } = fixture(response);
      response.data.push({
        content_id: service.getPublicPhotoKey({ imageUrl: photo, sourceId, sourceType }),
        content_type: sourceType, image_url: photo, owner_id: null, source_id: sourceId, visibility: state,
      });
      const result = await service.filterVisiblePhotoUrls({ photoUrls: [photo, secondPhoto], sourceId, sourceType });
      assert.deepEqual(Array.from(result), state === 'hidden' ? [secondPhoto] : [photo, secondPhoto]);
    });
  }

  const failures = [
    ['denied read', { data: null, error: { code: '42501' } }, false],
    ['transport rejection', null, true],
    ['null data without error', { data: null, error: null }, false],
    ['malformed envelope', null, false],
    ['malformed row', { data: [{ visibility: 'hidden' }], error: null }, false],
    ['non-array data', { data: {}, error: null }, false],
  ] as const;

  it('filters hidden avatars and batch photos while retaining visible and unmoderated entries', async () => {
    const response = { data: [] as unknown[], error: null };
    const { service } = fixture(response);
    const hiddenRow = (id: string, type: 'profile_photo' | 'job_photo') => ({
      content_id: service.getPublicPhotoKey({ imageUrl: photo, sourceId: id, sourceType: type }),
      content_type: type, image_url: photo, owner_id: null, source_id: id, visibility: 'hidden',
    });
    response.data = [hiddenRow('person', 'profile_photo')];
    assert.equal(await service.getVisibleProfileAvatarUrl({ avatarUrl: photo, profileId: 'person' }), null);
    const profiles = await service.applyPublicPhotoVisibilityToProfiles(new Map([
      ['person', { id: 'person', avatarUrl: photo }],
      ['other', { id: 'other', avatarUrl: secondPhoto }],
    ]));
    assert.equal(profiles.get('person')?.avatarUrl, null);
    assert.equal(profiles.get('other')?.avatarUrl, secondPhoto);
    response.data = [hiddenRow(sourceId, sourceType)];
    const rows = await service.applyPublicPhotoVisibilityToRows([
      { id: sourceId, photo_urls: [photo, secondPhoto] },
      { id: 'other', photo_urls: [photo] },
    ], sourceType);
    assert.deepEqual(Array.from(rows[0].photo_urls ?? []), [secondPhoto]);
    assert.deepEqual(Array.from(rows[1].photo_urls ?? []), [photo]);
  });

  for (const [name, response, rejects] of failures) {
    it(`suppresses uncertain photos but preserves listing/profile text after ${name}`, async () => {
      const { service } = fixture(response, rejects);
      const result = await service.loadPublicPhotoVisibility(['key']);
      assert.equal(result.available, false);
      assert.equal(result.size, 0);
      assert.equal((await service.filterVisiblePhotoUrls({ photoUrls: [photo], sourceId, sourceType })).length, 0);
      assert.equal(await service.getVisibleProfileAvatarUrl({ avatarUrl: photo, profileId: 'person' }), null);

      const profiles = new Map([['person', { id: 'person', avatarUrl: photo, name: 'Resident' }]]);
      const safeProfiles = await service.applyPublicPhotoVisibilityToProfiles(profiles);
      assert.equal(safeProfiles.get('person')?.avatarUrl, null);
      assert.equal(safeProfiles.get('person')?.name, 'Resident');
      assert.equal(profiles.get('person')?.avatarUrl, photo, 'do not mutate the source profile');

      const rows = [{ id: sourceId, title: 'Help needed', photo_urls: [photo, secondPhoto] }];
      const safeRows = await service.applyPublicPhotoVisibilityToRows(rows, sourceType);
      assert.equal(safeRows[0].title, 'Help needed');
      assert.equal(safeRows[0].photo_urls?.length, 0);
      assert.equal(rows[0].photo_urls.length, 2, 'do not mutate source listings');
    });
  }

  it('does not request moderation for empty inputs', async () => {
    const { service, requests } = fixture(null, true);
    assert.equal((await service.loadPublicPhotoVisibility([])).available, true);
    assert.equal((await service.applyPublicPhotoVisibilityToRows([{ id: 'empty', photo_urls: [] }], sourceType))[0].photo_urls?.length, 0);
    assert.equal(requests.length, 0);
  });

  it('recovers on the next lookup instead of retaining an unavailable state', async () => {
    const response: { data: unknown; error: unknown } = { data: null, error: { message: 'Temporary outage' } };
    const { service } = fixture(response);
    assert.equal(await service.getVisibleProfileAvatarUrl({ avatarUrl: photo, profileId: 'person' }), null);
    response.data = [];
    response.error = null;
    assert.equal(await service.getVisibleProfileAvatarUrl({ avatarUrl: photo, profileId: 'person' }), photo);
  });
});
