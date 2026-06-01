# Marketplace Fixes Backlog

## Purpose

This document records marketplace UX and product issues that should be treated as active fixes, not as accepted MVP behavior.

It exists because some current Home/feed behavior and card metadata were seeded or AI-filled in ways that do not match the intended Konektado product direction.

Use this document when updating:

- Home / For you feed behavior
- Job and worker card metadata
- Messaging UI and message-entry flows
- Seed/mock data used for demos

## Current Problem Summary

The current marketplace surface is functional enough for browsing, but several parts feel placeholder-driven instead of product-driven:

- Verification exists, and the message flow now has a Figma-aligned MVP path for job and service coordination.
- Feed cards show weak or misleading metadata such as `Verified client`, `Posted in Konektado`, `New worker`, and `Jobs done pending`.
- The `For you` feed appears deterministically grouped by item type instead of feeling personalized or mixed.
- Some trust and relevance signals that should help users decide are missing from the cards.

These issues reduce trust, make the feed feel less intelligent, and weaken the core marketplace loop.

## Approved Direction

### 1. Messaging is a core MVP surface

Konektado uses Messages instead of Apply/Application as the main coordination flow.

That means verification is not enough on its own. The app also needs a usable in-app messaging experience:

- inbox list
- conversation thread
- message composer
- clear job context in conversations
- visible interested-worker flow for clients
- clear empty and locked states

SMS providers such as PHLSMS may later support OTP or notifications, but they do not replace in-app messaging.

### 2. Feed cards must show decision-making data

Feed metadata should help users answer:

- Can I trust this person or post?
- Is this relevant to me?
- Is this person or job active and credible?

Replace low-value placeholders with stronger trust and relevance signals.

## Card Metadata Fixes

### Job cards

Avoid or remove:

- `Posted in Konektado`
- decorative trust labels that do not affect decision-making

Prefer showing:

- client rating, if available
- jobs posted count
- hires completed count, if available
- barangay/location
- posted time
- schedule or urgency
- budget

If ratings or history are not yet live, use clearly seeded mock data that follows realistic marketplace semantics.

### Worker cards

Avoid or remove:

- `New worker`
- `Jobs done pending`
- weak placeholder metadata that sounds internal or unfinished

Prefer showing:

- average rating such as `4.8`
- review count if available
- jobs done count
- availability summary
- barangay/location
- starting rate

### Verification badge handling

Do not overload cards or detail identity sections with repeated verification copy.

Because Konektado gates public posting, messaging, saving, and reviews behind barangay verification, normal marketplace surfaces should imply the gate instead of repeating `Verified` or `Verified resident`.

Use verification status mainly for:

- unverified viewer prompts
- owner profile status
- admin review queues
- verification education or gate screens

Prefer rating, review count, jobs done, jobs posted, workers hired, availability, and location on public marketplace cards and details.

## Detail Page Fixes

### Job details

Job details should be task-first:

- title, posted time, budget, schedule, location, status, workers needed, and service needed at the top
- job description, photos, notes, and tags in the job scope sections
- `Posted by` limited to client identity and trust metrics
- no job category/service tags inside the `Posted by` card
- no repeated `Verified` or `Verified resident` badge in normal public detail state
- simple informational details should use lightweight two-column text rows, not card widgets, when each value is short
- photos should have a designated section instead of being visually buried inside the summary
- job tags should live in their own `Job tags` section, not inside the task description

### Worker/service details

Worker details should be person-first:

- worker name, service title, location, rating, jobs done, and availability at the top
- rate, services, experience, reviews, and tags below the hero
- service tags belong with services/about, not in identity trust rows
- no repeated `Verified` or `Verified resident` badge in normal public detail state
- worker details should use the Figma two-column text layout: blue labels, muted values, and clear row spacing
- service/work images should appear in a designated photo section when available
- service tags should live in their own `Service tags` section, not inside the about text

## `For You` Feed Fixes

## Problem

The current `For you` feed appears visibly grouped by type, such as jobs first and services second. That makes the feed feel artificial and redundant because dedicated Jobs and Services filters already exist.

## Required behavior

`For you` should not look like a type-grouped list. It should feel mixed and relevant.

Preferred ranking inputs:

- service/preference match
- barangay or nearby relevance
- budget/rate fit
- availability fit
- freshness
- light diversity mixing so the feed does not become repetitive

## Acceptable short-term implementation

If full recommendation logic is not yet ready, use a simple scored mix:

1. Score jobs and services based on the current user's onboarding intent and service preferences.
2. Sort by score and freshness.
3. Interleave result types so the list does not always show all jobs first and all services second.

Do not use pure random ordering as the main strategy. Random can be used only as a small diversity factor.

## Messaging UI Fixes

The app already treats Messages as a primary tab, so the UX should reflect that.

Minimum expected message UI behavior:

- users can clearly enter a conversation from a job or worker context
- inbox states are understandable
- conversations show the related job or worker context
- first-message flow feels intentional, not hidden
- unverified users get clear locked states and verification routing

Implemented MVP message behavior:

- Messages inbox supports All, Jobs, Services, and Unread filters.
- Worker profiles can start service conversations.
- Job and service conversations show context, quick prompts, and text composer.
- Conversation details support report and archive through existing conversation statuses.

Messaging should feel like a complete MVP loop, not just a partially wired backend feature.

## Seed and Mock Data Rules

When real database values are missing, seeded or mock data is acceptable for demo use, but it must follow the intended public meaning.

Allowed examples:

- `4.8 rating`
- `12 jobs done`
- `8 reviews`
- `Posted 2 days ago`
- `Near Barangay San Pedro`

Avoid seeded values that read like internal placeholders:

- `Posted in Konektado`
- `Jobs done pending`
- `New worker`

## Priority Backlog

### P0

- Complete the user-facing in-app messaging loop.
- Replace weak card metadata with ratings, jobs done, reviews, and useful location/time data.
- Rework `For you` so it is mixed and scored instead of visibly grouped by type.

### P1

- Add clear match reasons such as `Matches your cleaning services` or `Near your barangay`.
- Improve seeded demo data so cards look credible before all live metrics are available.
- Add better job-poster trust indicators for worker-facing cards and job details.

### P2

- Add richer recommendations once live usage data exists.
- Add advanced messaging features after the basic MVP chat flow is stable.

## Implementation Notes

- Preserve the established card layout where possible; update the meaning of the metadata first.
- Do not invent Upwork-style application flows. Keep Messages as the main coordination path.
- Use ratings, review counts, jobs done, and relevance reasons as the main card-supporting signals.
- Keep Home, Jobs, and Services distinct:
  - `For you` is mixed and relevance-driven.
  - `Jobs` is job-only.
  - `Services` is service-post-only.
