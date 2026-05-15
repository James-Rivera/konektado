import type { ProfileCompletionAction } from '@/types/profile.types';

export type ProfileCompletionDestination =
  | {
      type: 'route';
      pathname: string;
      params?: Record<string, string>;
    }
  | {
      type: 'message';
      title: string;
      message: string;
    };

export function getProfileCompletionDestination(
  action: ProfileCompletionAction,
): ProfileCompletionDestination {
  switch (action.kind) {
    case 'edit_shared_profile':
      return {
        type: 'route',
        pathname: '/profile/complete',
        params: { mode: 'core', focus: 'shared-profile' },
      };
    case 'add_profile_photo':
      return {
        type: 'route',
        pathname: '/profile/complete',
        params: { mode: 'core', focus: 'profile-photo' },
      };
    case 'edit_contact_preference':
      return {
        type: 'route',
        pathname: '/profile/complete',
        params: { mode: 'core', focus: 'contact-preference' },
      };
    case 'create_service':
      return {
        type: 'route',
        pathname: '/create-service',
        params: { returnTo: 'profile' },
      };
    case 'edit_service_rate':
      return action.targetId
        ? {
            type: 'route',
            pathname: '/create-service',
            params: {
              serviceId: action.targetId,
              returnTo: 'profile',
              focus: 'rate-range',
            },
          }
        : {
            type: 'route',
            pathname: '/profile/complete',
            params: { mode: 'work', focus: 'rate-range' },
          };
    case 'edit_availability':
      return {
        type: 'route',
        pathname: '/profile/complete',
        params: { mode: 'work', focus: 'availability' },
      };
    case 'edit_service_area':
      return {
        type: 'route',
        pathname: '/profile/complete',
        params: { mode: 'work', focus: 'service-area' },
      };
    case 'open_verification':
      return {
        type: 'route',
        pathname: '/verification',
      };
    case 'add_credential':
      return {
        type: 'route',
        pathname: '/profile/credentials',
      };
    case 'edit_hiring_preferences':
      return {
        type: 'route',
        pathname: '/profile/complete',
        params: { mode: 'hiring', focus: action.id },
      };
    case 'create_job':
    case 'open_job_builder':
      return {
        type: 'route',
        pathname: '/create-job',
        params: action.id === 'post-ready-budget'
          ? { returnTo: 'profile', focus: 'budget-range' }
          : { returnTo: 'profile' },
      };
    default:
      return {
        type: 'message',
        title: 'Setup action unavailable',
        message: 'This setup step is not connected yet.',
      };
  }
}
