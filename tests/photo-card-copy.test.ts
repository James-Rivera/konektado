/**
 * Feed-card photo copies (DEC-138).
 *
 * New job and service photos are stored as `<name>.full.jpg` with an 800px
 * `<name>.card.jpg` beside them, and Home cards load the card copy. Older
 * photos have no card copy, so any URL without the `.full.jpg` marker must be
 * left alone; otherwise every legacy card would point at a missing file.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getCardCopyLocation, getMarketplacePhotoFileNames } from '@/utils/photo-card-copy';

const BASE = 'https://example.supabase.co/storage/v1/object/public/job-photos/user-1/draft';

describe('getMarketplacePhotoFileNames', () => {
  it('names the full photo and its card copy from one stem', () => {
    assert.deepEqual(getMarketplacePhotoFileNames('1700000000000-0-kitchen.jpg'), {
      card: '1700000000000-0-kitchen.card.jpg',
      full: '1700000000000-0-kitchen.full.jpg',
    });
  });

  it('round-trips: the full name maps back to the card name', () => {
    const names = getMarketplacePhotoFileNames('photo-1.jpg');
    assert.equal(getCardCopyLocation(`${BASE}/${names.full}`), `${BASE}/${names.card}`);
  });
});

describe('getCardCopyLocation', () => {
  it('maps a full photo URL to its card copy', () => {
    assert.equal(getCardCopyLocation(`${BASE}/a.full.jpg`), `${BASE}/a.card.jpg`);
  });

  it('keeps a query string', () => {
    assert.equal(getCardCopyLocation(`${BASE}/a.full.jpg?t=1`), `${BASE}/a.card.jpg?t=1`);
  });

  it('maps a bare storage path, as used when deleting', () => {
    assert.equal(getCardCopyLocation('user-1/draft/a.full.jpg'), 'user-1/draft/a.card.jpg');
  });

  it('returns null for legacy photos without a card copy', () => {
    assert.equal(getCardCopyLocation(`${BASE}/1700000000000-0-kitchen.jpg`), null);
    assert.equal(getCardCopyLocation('file:///cache/picked-photo.jpg'), null);
    assert.equal(getCardCopyLocation(''), null);
  });

  it('only matches the marker at the end of the path', () => {
    assert.equal(getCardCopyLocation(`${BASE}/a.full.jpg.backup.jpg`), null);
  });
});
