import { Alert, Platform } from 'react-native';

/**
 * Cross-platform replacement for `Alert.alert`.
 *
 * `react-native-web` ships `class Alert { static alert() {} }` -- a no-op. Any
 * screen that puts an action behind an `Alert` confirmation is therefore dead
 * on web: the dialog never renders, so the button's `onPress` never runs and
 * the action is unreachable (this is what broke logout). Informational alerts
 * are swallowed the same way, so failures look like nothing happened.
 *
 * Native keeps the real `Alert`. Web falls back to the browser dialogs, which
 * are plain but reachable. Replace with a themed in-app dialog when there is
 * time; the call signature is meant to survive that swap.
 */
export type AlertButton = {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
};

function run(button: AlertButton | undefined) {
  void button?.onPress?.();
}

function joinBody(title: string, message?: string) {
  return message ? `${title}\n\n${message}` : title;
}

export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  if (typeof window === 'undefined') return;

  const body = joinBody(title, message);
  const cancelButton = buttons?.find((button) => button.style === 'cancel');
  const actions = (buttons ?? []).filter((button) => button.style !== 'cancel');

  // Informational alert: no choice to make.
  if (actions.length === 0) {
    window.alert(body);
    run(cancelButton);
    return;
  }

  // Single action (the common confirm case): OK runs it, Cancel runs the cancel button.
  if (actions.length === 1) {
    if (window.confirm(body)) {
      run(actions[0]);
    } else {
      run(cancelButton);
    }
    return;
  }

  // Several actions: offer each in turn so none becomes unreachable.
  for (const action of actions) {
    if (window.confirm(`${body}\n\n${action.text ?? 'OK'}?`)) {
      run(action);
      return;
    }
  }

  run(cancelButton);
}
