import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatLocalDate, formatLocalTime, initialPickerValue, isPickerValueInRange, parseLocalDate, parseLocalTime } from '@/utils/date-time';

describe('local picker dates', () => {
  it('preserves calendar fields in positive and negative time zones', () => {
    const previous = process.env.TZ;
    try {
      for (const zone of ['Asia/Manila', 'America/Los_Angeles', 'UTC']) {
        process.env.TZ = zone;
        for (const value of ['2000-01-01', '2024-02-29', '2026-03-08', '2026-11-01']) {
          const date = parseLocalDate(value)!;
          assert.equal(formatLocalDate(date), value);
          assert.equal(date.getHours(), 0);
        }
      }
    } finally {
      if (previous === undefined) delete process.env.TZ;
      else process.env.TZ = previous;
    }
  });

  it('rejects invalid or rolled-over dates and empty input', () => {
    for (const value of ['', '2026-02-29', '2026-04-31', '2026-13-01', '2026-00-10', '2026-1-1', '2026-01-01T00:00:00Z']) {
      assert.equal(parseLocalDate(value), null, value);
    }
  });

  it('compares bounds by calendar day, including the entire maximum day', () => {
    const min = new Date(2026, 9, 26, 14);
    const max = new Date(2026, 9, 28, 0);
    assert.equal(isPickerValueInRange(new Date(2026, 9, 26), 'date', min, max), true);
    assert.equal(isPickerValueInRange(new Date(2026, 9, 28, 23), 'date', min, max), true);
    assert.equal(isPickerValueInRange(new Date(2026, 9, 25), 'date', min, max), false);
    assert.equal(isPickerValueInRange(new Date(2026, 9, 29), 'date', min, max), false);
    assert.equal(isPickerValueInRange(new Date(NaN), 'date'), false);
  });

  it('clamps an old draft when reopening without mutating the original', () => {
    const old = new Date(2026, 9, 20);
    const min = new Date(2026, 9, 26);
    assert.equal(formatLocalDate(initialPickerValue(old, 'date', min)), '2026-10-26');
    assert.equal(formatLocalDate(old), '2026-10-20');
    assert.equal(formatLocalDate(initialPickerValue(min, 'date', undefined, old)), '2026-10-20');
  });
});

describe('local picker times', () => {
  it('preserves midnight, noon, and the last minute without shifting the date', () => {
    const base = new Date(2026, 9, 26, 8);
    for (const time of ['00:00', '12:00', '23:59', '08:05']) {
      const selected = parseLocalTime(time, base)!;
      assert.equal(formatLocalTime(selected), time);
      assert.equal(formatLocalDate(selected), '2026-10-26');
    }
    assert.equal(base.getHours(), 8);
  });

  it('rejects invalid, incomplete and cleared times', () => {
    for (const time of ['', '24:00', '12:60', '1:00', '-1:00', '12:00:30']) {
      assert.equal(parseLocalTime(time, new Date()), null, time);
    }
  });
});
