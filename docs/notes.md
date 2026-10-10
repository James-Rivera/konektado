# deu notes

## Performance & Loading Issues
- [ ] **Mobile Lag:** Users are experiencing lag during the initial app load and screen transitions on mobile devices.
    * *Possible Cause:* Unoptimized assets or heavy initial data fetching from Supabase.

## Technical & Non-Functional Components
- [ ] **Bookmark/Save Button:** The bookmark icon is non-responsive; needs a `TouchableOpacity` or `Pressable` wrapper.
    * *Status (2026-10-05):* Looks fixed in code, not yet checked on a device. Feed cards now save through a `Pressable` (`components/home/HomeFeedCard.tsx`) backed by real saved posts (DEC-100).

## UI Issues
- [ ] **Header Overlapping:** The Settings (cog) icon in the top right is overlapping with the mobile status bar (battery/clock area). Needs `SafeAreaView` or additional top padding.
    * *Status (2026-10-05):* Looks fixed in code, not yet checked on a device. The Profile top bar pads by the safe-area top inset (`ProfileTopBar` in `components/profile/ProfilePrimitives.tsx`).

Checked and updated by: Aedrieu#

use drp downs avoid typing
use calendar when picking avalabilityvvv