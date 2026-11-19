import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getReportPageRequest, prepareReportReview } from '../utils/report-review';

describe('report queue and operator decision inputs', () => {
  it('requests old open complaints from the server rather than filtering a global recent slice', () => {
    assert.deepEqual(getReportPageRequest('open', 4), { limit: 30, offset: 120, statuses: ['open'] });
    assert.deepEqual(getReportPageRequest('received', 0), { limit: 30, offset: 0, receivedOnly: true });
  });
  it('does not let internal notes substitute for the reporter outcome', () => {
    for (const status of ['resolved', 'dismissed'] as const) {
      const result = prepareReportReview({ status, adminNotes: 'Internal investigation', resolutionMessage: '  ', reviewAction: null });
      assert.ok(result.error); assert.equal(result.data, null);
    }
  });
  it('requires a rationale for both hiding and restoring a review', () => {
    for (const reviewAction of ['hide', 'restore'] as const) assert.ok(prepareReportReview({ status: 'reviewing', adminNotes: ' ', resolutionMessage: '', reviewAction }).error);
  });
  it('keeps internal evidence and public outcome distinct on a terminal decision', () => {
    assert.deepEqual(prepareReportReview({ status: 'resolved', adminNotes: ' Private evidence ', resolutionMessage: ' We removed the abusive review. ', reviewAction: 'hide' }), { error: null, data: { status: 'resolved', adminNotes: 'Private evidence', resolutionMessage: 'We removed the abusive review.', reviewAction: 'hide' } });
  });
  it('permits investigation progress without prematurely publishing an outcome', () => {
    assert.deepEqual(prepareReportReview({ status: 'reviewing', adminNotes: 'Gathering evidence', resolutionMessage: '', reviewAction: null }).data, { status: 'reviewing', adminNotes: 'Gathering evidence', resolutionMessage: null, reviewAction: null });
  });
});
