# Design System

## Source of Truth

Figma is the visual source of truth for Konektado.

Established Konektado Figma file:

- `https://www.figma.com/design/v6jPKumENGxoQlWbwSFfo5/Konektado`

Implementation should follow the Figma file first, then translate the design into reusable React Native components. Do not invent a separate visual style unless the Figma design is missing a necessary state.

Before implementing or changing a user-facing screen/component:

- Check the established Konektado Figma file for the matching screen or component.
- If a matching design exists, implement from that node as closely as practical.
- If the exact design does not exist, use nearby Konektado Figma screens/components as visual reference.
- If Figma wording conflicts with accepted MVP product rules, keep the Figma layout but use the documented product language. For example, do not use "Apply" as the primary job flow; use messaging and job interest language.

Current Figma direction observed from the dashboard:

- Clean mobile feed.
- White content surfaces with light gray dividers.
- Blue primary actions used sparingly.
- Green verification badge only where trust state is central, not repeated on every feed card.
- Rounded pill filters and action buttons.
- Bottom navigation with Home, Post, Messages, and Profile.
- Search bar for "Search nearby jobs or workers".
- Feed sections for jobs and workers.
- Post dashboard for creating and managing job/service posts.
- Messages screens for job/service coordination.
- Profile with Work Profile and Hiring Profile tabs.

## Colors

Use these as implementation placeholders until exact Figma tokens are finalized.

| Token | Value | Usage |
| --- | --- | --- |
| `color.primary` | `#69A4EC` | Primary actions, active tab, links, selected pills. |
| `color.primarySoft` | `#EEF5FF` | Primary button/pill background. |
| `color.success` | `#7BBE7A` | Verification border/check state. |
| `color.successSoft` | `#EEF8EE` | Verification badge background. |
| `color.text` | `#111111` | Main text. |
| `color.textMuted` | `#46576C` | Secondary text. |
| `color.textSubtle` | `#738293` | Metadata and inactive navigation. |
| `color.border` | `#E5E7EB` | Dividers, card borders, inputs. |
| `color.background` | `#FFFFFF` | Main content surfaces. |
| `color.screenBackground` | `#F8FAFC` | Screen background where needed. |
| `color.danger` | `#B91C1C` | Destructive/error states. |

## Typography

Figma uses Satoshi and Albert Sans in the current dashboard. The repo already contains Satoshi font assets.

| Token | Font | Size | Weight | Usage |
| --- | --- | --- | --- | --- |
| `text.screenTitle` | Satoshi or Albert Sans | 20-24 | Bold | Screen titles. |
| `text.sectionTitle` | Satoshi or Albert Sans | 14-16 | Bold | Feed headers and section labels. |
| `text.body` | Satoshi | 13-14 | Regular | Main readable text. |
| `text.caption` | Satoshi | 11-12 | Regular/Medium | Metadata, tab labels, helper text. |
| `text.button` | Satoshi | 12-14 | Bold/Medium | Button labels. |

Rules:

- Keep text readable for low digital literacy users.
- Avoid very small body text except metadata.
- Use plain labels, not technical terms.
- Keep line length short on mobile.

## Spacing

Use a simple spacing scale:

| Token | Value |
| --- | --- |
| `space.2xs` | 4 |
| `space.xs` | 6 |
| `space.sm` | 8 |
| `space.md` | 12 |
| `space.lg` | 16 |
| `space.xl` | 20 |
| `space.2xl` | 24 |

Common layout rules:

- Screen horizontal padding: 18-24.
- Card padding: 14-16.
- Form field gap: 8-12.
- Feed item gap: 8-12.
- Bottom navigation height should account for safe area.

## Radius

| Token | Value | Usage |
| --- | --- | --- |
| `radius.sm` | 8 | Inputs, small controls. |
| `radius.md` | 10-12 | Buttons and cards. |
| `radius.lg` | 16 | Larger content cards or image containers. |
| `radius.pill` | 999 | Pills, badges, compact action buttons. |

## Shadows

Keep shadows minimal. The current Figma direction mostly uses borders and dividers.

| Token | Usage |
| --- | --- |
| `shadow.none` | Default for most cards and feed items. |
| `shadow.modal` | Modals and sheets only. |
| `shadow.floatingAction` | Optional for prominent floating actions. |

## Reusable Components

### Button

Variants:

- `primary`
- `secondary`
- `outline`
- `ghost`
- `danger`

States:

- default
- pressed
- loading
- disabled

Rules:

- Use clear action labels like "Message", "View Job", "Post job", "Submit request", and "Mark Hired".
- For icon buttons, include accessibility labels.

### Input

Variants:

- text
- multiline
- search
- select-like pressable
- file picker

Rules:

- Show helper/error text below the field.
- Use simple placeholders.
- Keep validation messages human-readable.

### Card

Usage:

- Job card.
- Profile card.
- Admin review card.
- Empty state card.

Rules:

- Cards should not contain unnecessary nested cards.
- Feed cards can use borders/dividers instead of heavy shadows.

### Modal

Usage:

- Confirm destructive action.
- Filter options.
- Report form.
- Review submission.

Rules:

- Always include cancel/close.
- Use concise copy.
- Avoid long forms inside small modals.

### Bottom Navigation

Tabs:

- Home
- Post
- Messages
- Profile

MVP note:

- Messages is part of the current MVP direction. Keep it simple: inbox, job/service context, text messages, quick prompts, and safety/report actions.

### Search Bar

Usage:

- Search nearby jobs or workers.
- Search providers by service category.
- Search jobs by title/category/location.

Rules:

- Keep search input prominent.
- Pair with filter controls for category, location, and verification status.

### Job Card

Required content:

- Job title.
- Posted by.
- Location.
- Availability/schedule or time posted.
- Budget text, if provided.
- Short description.
- Tags such as category, urgent, near you.
- Primary action: View Job.
- Secondary action where appropriate: Message.

Rules:

- Job cards are task-first. Do not add large client avatars to feed job cards.
- Use title-first layout, like a marketplace listing.
- Use schedule language such as "Starts 3:00 PM" instead of worker availability language.
- Public job cards do not need a repeated verified badge if interaction is already verification-gated.

### Profile Card

Required content:

- Profile photo or placeholder.
- Provider name.
- Service title/category or short match reason.
- Barangay/city.
- Availability.
- Verification badge if verified.
- Rating summary when available.
- Primary action: View Profile.
- Secondary action where appropriate: Message.

Rules:

- Worker cards are person-first.
- Use "Services" for what a worker offers.
- Use muted pills in Home/feed; reserve blue for active filters and primary actions.

### Verification Badge

States:

- Verified.
- Pending.
- Not verified.
- Rejected, shown privately to owner.

Rules:

- Public cards should only show positive verified badge or no badge.
- Pending/rejected status should be shown mainly to the owner/admin.
- Since Konektado gates posting and messaging through verification, avoid putting the verified badge on every feed/search card unless the screen specifically needs a trust reminder.

### Profile Tabs

Own profile uses two tabs:

- Work Profile
- Hiring Profile

Work Profile should show:

- Worker rating.
- Jobs done/taken.
- Hours worked if available.
- Availability.
- Services.
- Work history.

Hiring Profile should show:

- Client rating.
- Workers hired.
- Jobs posted.
- Open jobs.
- Manage job posts CTA.
- Job history.
- Reviews from workers.

Saved workers/jobs should not live primarily in Profile. They belong closer to Home/Search or a future saved items surface.

### Admin Review Card

Required content:

- User name.
- Request type.
- Submitted date.
- Status.
- Uploaded file count.
- Short note.
- Actions: Review, Approve, Reject.

## UX Rules for Low Digital Literacy Users

- Use plain language: "Post a job" instead of "Create listing".
- Keep each screen focused on one main task.
- Use large tap targets.
- Avoid hidden gestures as required actions.
- Show confirmation after important actions.
- Explain pending/rejected verification in simple terms.
- Avoid technical database/auth error messages in UI.
- Make forms forgiving and show what is missing.
- Use familiar labels: Home, Post, Messages, Profile.
- Avoid overwhelming filters; show the most useful filters first.
- Make verification badges visually clear and consistent.

