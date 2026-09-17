import { useState } from 'react';

/**
 * Tracks whether a remote image failed to load, clearing the flag whenever the
 * URL changes.
 *
 * The reset happens during render rather than in an effect. An effect resets
 * one commit too late, so a new URL paints a frame with the previous URL's
 * failure still latched -- a visible flash of the initials/placeholder before
 * the new image is given its chance. This is React's documented "adjusting
 * state when a prop changes" pattern.
 */
export function useImageFallback(imageUrl: string | null | undefined) {
  const [failed, setFailed] = useState(false);
  const [trackedUrl, setTrackedUrl] = useState(imageUrl);

  if (imageUrl !== trackedUrl) {
    setTrackedUrl(imageUrl);
    setFailed(false);
  }

  return {
    failed,
    onImageError: () => setFailed(true),
  };
}
