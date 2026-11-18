import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { componentElements, runtimeComponent, type TestElement } from './helpers/runtime-component';

describe('development onboarding preview', () => {
  for (const development of [true, false]) {
    it(development ? 'opens the isolated UI in development' : 'redirects away in production', () => {
      const app = runtimeComponent('@/app/internal/onboarding-preview', 'default', {
        'expo-router': { Redirect: 'Redirect' },
        '@/components/onboarding/OnboardingServicesPreview': { OnboardingServicesPreview: 'Preview' },
      }, { __DEV__: development });
      const tree = app.render();
      assert.equal(tree.type, development ? 'Preview' : 'Redirect');
      if (!development) assert.equal(tree.props.href, '/');
    });
  }

  it('uses a local draft, switches intent and reviews without a real save', async () => {
    const app = runtimeComponent('@/components/onboarding/OnboardingServicesPreview', 'OnboardingServicesPreview', {
      'react-native': { Pressable: 'Pressable', Text: 'Text', View: 'View', StyleSheet: { create: (value: unknown) => value } },
      '@/app/(onboarding)/job': { __esModule: true, default: 'ServicesStep' },
      '@/app/(onboarding)/onboarding-context': { OnboardingContext: { Provider: 'DraftProvider' } },
      '@/components/onboarding/FigmaOnboarding': { OnboardingButton: 'Button', OnboardingFormScaffold: 'Scaffold', ReviewField: 'Field', onboardingColors: {} },
      '@/services/onboarding.service': { emptyOnboardingDraft: { offeredDeliveryMode: null, offeredServices: [], customOfferedServices: [], neededServices: [], customNeededServices: [] } },
    });
    let tree = app.render();
    const find = (predicate: (node: TestElement) => boolean) => {
      const element = componentElements(tree).find(predicate); assert.ok(element); return element;
    };
    const context = () => find((node) => node.type === 'DraftProvider').props.value;
    assert.equal(context().role, 'provider');
    assert.equal(await context().saveProfile(), false);
    context().updateDraft({ offeredServices: ['Cleaning'], offeredDeliveryMode: 'on_site' }); tree = app.render();
    find((node) => node.type === 'ServicesStep').props.onNext(); tree = app.render();
    assert.equal(find((node) => node.type === 'Field' && node.props.label === 'Offered services').props.value, 'Cleaning');
    find((node) => node.type === 'Button').props.onPress(); tree = app.render();
    assert.equal(context().draft.offeredServices.join(','), 'Cleaning');
    const hire = find((node) => node.type === 'Pressable' && componentElements(node).some((child) => child.props?.children === 'Hire help'));
    hire.props.onPress(); tree = app.render();
    assert.equal(context().role, 'client');
    context().updateDraft({ neededServices: ['Laundry help'] }); tree = app.render();
    const reset = find((node) => node.type === 'Pressable' && componentElements(node).some((child) => child.props?.children === 'Reset'));
    reset.props.onPress(); tree = app.render();
    assert.equal(context().draft.offeredServices.length, 0);
    assert.equal(context().draft.neededServices.length, 0);
  });
});
