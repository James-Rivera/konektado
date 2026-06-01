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
- Bottom navigation with Home, Search, Post, Messages, and Profile.
- Search as a main destination for "Search nearby jobs or services".
- The Konektado wordmark/header belongs on Home only. Other bottom tabs use clear screen-specific titles where they improve orientation; Search uses the search field and mode control as its header module.
- Feed sections for jobs and services.
- Home feed uses one unified card shell for mixed job and service posts.
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

### Detail Info Grid

Usage:

- Short informational detail sections such as worker details and job summary.

Rules:

- Use a lightweight two-column text layout for simple values.
- Labels use the accent blue and Satoshi Bold.
- Values use muted gray and Satoshi Regular.
- Do not wrap tiny facts in separate cards unless the content has enough weight to justify a card.
- Keep dedicated image/photo sections separate from text summary sections.
- Keep tags in their own compact metadata section when they would visually interrupt a description or about section.

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

### Feedback

Use feedback with the lightest interaction cost that still protects the user:

- Use inline helper text or note cards before an action when the user needs guidance while deciding what to do.
- Use toast/snackbar feedback after routine success such as saving, posting, uploading, or completing a lightweight update.
- Use inline field errors beside the affected input when a value needs correction.
- Reserve modal alerts for destructive confirmation, legal/privacy acknowledgment, permission decisions, profile/verification gates, or serious errors that truly require interruption.

Examples:

- Inline: `Add a clear photo so neighbors can recognize you.`
- Toast/snackbar: `Profile saved`, `Credential added`, `Job posted`
- Modal: delete account, discard draft, logout confirmation, verification-required publish gate

Onboarding should feel guided rather than stop-start. Successful onboarding transitions should move the user forward visually; do not interrupt normal progress with success modals such as "Welcome" or "Onboarding complete".

Remediation prompts should deep-link to the part of the flow that resolves them. Profile prompts should point to identity, capabilities, service area, default availability, coordination style, or scheduling preference. Listing prompts should point to rates, budgets, dates, requirements, and message options.

### Bottom Sheet

Location: `components/BottomSheet.tsx`

A reusable bottom sheet component with smooth, independent animations:
- Backdrop fades in (500ms)
- Sheet slides up from the bottom (700ms)
- Both animations use cubic easing for natural feel

Usage:

- Multi-option selection (like "Choose post type")
- Filters or quick actions
- Secondary menus or modals

Props:

- `visible` (boolean): Show/hide the sheet
- `onClose` (function): Callback when backdrop is tapped
- `children` (ReactNode): Sheet content
- `maxHeight` (string, optional): Max height percentage (default: '82%')

Example:

```tsx
const [isOpen, setIsOpen] = useState(false);

<BottomSheet visible={isOpen} onClose={() => setIsOpen(false)}>
  <Text style={styles.title}>Choose an option</Text>
  {/* Your sheet content */}
</BottomSheet>
```

Rules:

- Always include a close affordance (backdrop tap, close button, or clear action)
- Keep content lightweight—avoid heavy forms or long scrolls
- Safe area padding is handled automatically
- Content should be self-contained within the sheet; screen below remains visible

### Skeleton

Location: `components/Skeleton.tsx`

Animated placeholder components for loading states. More performant and better UX than spinners—no layout shift, better perceived performance.

Components:

**Skeleton**
- Basic rectangular placeholder with pulse animation
- Props: `height`, `width`, `borderRadius`, `animated`

**SkeletonCircle**
- Circular placeholder for avatars/icons
- Props: `size`, `style`

**SkeletonAvatar**
- Avatar placeholder with optional presence dot
- Props: `size`, `dotSize`, `showPresence`, `style`

**SkeletonChip**
- Pill/chip/button placeholder for tags, filters, and compact CTAs
- Props: `height`, `width`, `style`

**SkeletonImage**
- Media placeholder for photos and other image blocks
- Props: `height`, `width`, `borderRadius`, `style`

**SkeletonText**
- Multiple stacked lines mimicking paragraph text
- Props: `lines`, `gap`, `lineHeight`, `lastLineWidth`

**SkeletonCard**
- Full card placeholder with avatar, text lines, and metadata
- Props: `style`

Usage:

```tsx
// Simple placeholder
<Skeleton height={16} width="80%" />

// Avatar
<SkeletonCircle size={44} />

// Paragraph
<SkeletonText lines={3} />

// Complex layout
<View>
  <Skeleton height={44} width={44} borderRadius={22} />
  <Skeleton height={14} width="70%" style={{ marginTop: 8 }} />
</View>
```

Rules:

- Always match the actual content layout—use skeleton shapes that mirror the real UI
- Disable animation (`animated={false}`) for very fast loads (< 300ms)
- Use for any async data loading: feeds, details, forms
- Avoid overly complex skeletons; keep them lightweight

Pattern guidance:

- Prefer rendering the real component structure with `isLoading` and replacing content slots with skeleton primitives instead of building a second approximate layout.
- Preserve the same spacing, card shell, image area, chips, metadata rows, section dividers, and CTA footprint as the loaded state.
- If a component has variants, the loading state should support the same layout variants where practical.
- Use skeletons for initial loading only; for refreshes, keep the stale UI visible and show a lightweight refreshing indicator.

Current exceptions that remain separate for now:

- `app/conversation/[conversationId].tsx` and `app/conversation/[conversationId]/details.tsx`
  These thread screens derive layout from message grouping, sender direction, and context actions that do not safely exist before the conversation payload arrives.
- `app/create-job.tsx`, `app/create-job-preview.tsx`, and `app/create-service-preview.tsx`
  These flows assemble draft-dependent form sections and preview content where loading is still driven by screen-specific setup state rather than a reusable card/detail component.
- `app/(tabs)/post.tsx`, `app/post/active.tsx`, and `app/post/renew.tsx`
  These dashboards currently load mixed management panels and summary cards that still need a cleaner shared component layer before a safe `isLoading` conversion.
- `app/(tabs)/profile.tsx`
  The header and notice loading states are already layout-close, but the profile screen still mixes account, role-toggle, and activity sections that should be componentized first.
- `components/verification/FigmaVerificationFlow.tsx`
  The verification prefill skeleton remains separate because it protects partially known form state before the fields are ready to render with real values.

### Bottom Navigation

Tabs:

- Home
- Search
- Post
- Messages
- Profile

MVP note:

- Messages is part of the current MVP direction. Keep it simple: inbox, job/service context, text messages, quick prompts, and safety/report actions.

Header rule:

- Home uses the Konektado brand header because it is the landing/community feed.
- Messages, Post, and Profile should use task-specific screen titles instead of repeating the brand wordmark. This keeps bottom-tab destinations easier to identify and scales better as each tab gains its own tools and actions.
- Search is the exception: because the active bottom tab and search input already communicate the screen purpose, the Search tab should start with a safe-area-aware search module instead of a large repeated title.
- Notification access can appear on screens where it is contextually useful, but it should not force the Home brand header onto secondary tabs.

### Messages

Usage:

- Inbox, message requests, job/service conversation threads, and conversation support actions.

Rules:

- Use lightweight list rows for inbox conversations instead of heavy cards.
- Inbox filters are All, Jobs, Services, and Unread.
- Keep job and service context visible at the top of a conversation so users know what the chat is about.
- Keep the job/service context compact by default so messages remain the primary focus. It should sit with the fixed chat header, not inside the scrollable message thread. It may expand for quick actions, but it should not read like a large job card above every chat.
- Group consecutive message bubbles from the same sender tightly. Hide per-message timestamps by default and reveal the sent time when the user taps a bubble.
- Use quick-reply chips for common coordination questions.
- Conversation Details should be a full page, not a modal layered over chat. It must own the full white viewport, hide the chat composer, and use a normal app-bar plus scrollable page content.
- Chat composers must stay visible above the keyboard. The message list should resize and scroll to the latest message when the keyboard opens.
- Keep MVP messaging text-only. Attachment icons may appear as non-primary visual affordances, but image/file sending is deferred.
- Use conversation status for simple MVP safety actions: reported conversations are marked reported, and deleted chats are archived rather than hard-deleted.

### Search

Usage:

- Search nearby jobs or services.
- Search providers by service category.
- Search jobs by title/category/location.

Rules:

- Keep search input prominent.
- On the Search tab, start with the search input rather than a large "Search" title. Use top safe-area padding plus about 12-16px so the input feels intentional, not cramped.
- Align the search input and Find Jobs / Find Services segmented control to the same parent width so they read as one search module.
- Pair with filter controls for category, location, and verification status.
- Search belongs in the bottom navigation as its own intentional discovery destination.
- Home can use feed filter pills, but should not duplicate Search with a large persistent search bar.

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
- In Home, use the unified feed card instead of this specialized job card so For you, Jobs, and Services keep the same visual rhythm. Search and job-focused result lists may continue using this richer job-first card.

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
- In Home, use the unified feed card instead of this specialized worker card so service posts sit cleanly beside job posts. Search and worker-focused result lists may continue using this richer person-first card.

### Public Profile Photo Guidance

Usage:

- Core Profile public avatar upload.

Rules:

- Keep the Core Profile row lightweight: title, short reminder, current photo or fallback, and one add/replace action.
- Route add/replace through a focused bottom sheet before opening the existing photo picker.
- Use visual examples plus short labels so residents do not need to parse a long instruction block.
- Show one accepted clear-face example and a compact set of rejected examples for group photos, blurry or dark photos, covered faces, avatars, and ID/document photos.
- Keep the fuller accepted/rejected checklist inside the sheet.
- Public profile photos remain optional trust boosters. They must never be copied from verification selfies, IDs, certificates, or other private files.
- The picker, public-image optimization, upload service, and barangay moderation flow remain separate from the guidance UI.

### Home Feed Card

Usage:

- Mixed For you feed.
- Home Jobs filter.
- Home Services filter.

Rules:

- Use one shared card layout for job posts and service posts in Home.
- Always show avatar/name, the Konektado yellow online dot when presence is active, a short post-type label, relative time, a compact rate/budget line, post copy, tags, and trust/location metadata in the same positions.
- Home feed cards should feel like community posts, not CTA-heavy listing cards. The whole card opens the relevant detail screen; do not show a full-width "View Job" or "View Profile" button in Home.
- Use plain labels and post copy such as "Posted a job", "Posted a service", "Looking for cleaning", "Need help with laundry", and "I offer minor home fix help".
- Keep the type distinction in labels, metadata, copy, and destination rather than using separate card structures.
- Job posts open job detail; service posts open worker/service profile.
- Search can use specialized job and worker result cards because the user is already in a focused browsing mode.

### Verification Badge

States:

- Verified.
- Pending.
- Not verified.
- Rejected, shown privately to owner.

Rules:

- Normal public marketplace cards and detail identity cards should not repeat verification badges by default because posting, messaging, saving, and reviews are already verification-gated.
- Pending/rejected status should be shown mainly to the owner/admin.
- Use public verification labels only when the screen specifically explains trust or access rules. Prefer rating, review count, jobs done, jobs posted, availability, and location on normal marketplace surfaces.

### Profile Tabs

Own profile uses two tabs:

- Work Profile
- Hiring Profile

Work Profile should show:

- Worker rating.
- Jobs done/taken.
- Professional summary.
- Capabilities.
- Default service area and availability.
- Credentials.
- Marketplace Activity as a visually separate area for services, drafts, saved content, and completed work.

Hiring Profile should show:

- Client rating.
- Workers hired.
- Hiring summary.
- Common needs.
- Coordination style and general scheduling preference.
- Marketplace Activity as a visually separate area for job posts, drafts, saved content, and completed hires.
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
- Use familiar labels: Home, Search, Post, Messages, Profile.
- Avoid overwhelming filters; show the most useful filters first.
- Make verification badges visually clear and consistent.

