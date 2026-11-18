import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { runtimeComponent, componentElements, type TestElement } from './helpers/runtime-component';

function setup(role: string, initial: Record<string, unknown> = {}) {
  let draft = { offeredDeliveryMode: null, offeredServices: [], neededServices: [], customOfferedServices: [], customNeededServices: [], ...initial };
  const routes: unknown[] = [];
  const router = { push: (route: unknown) => routes.push(route), replace: (route: unknown) => routes.push(route), back: () => routes.push('back') };
  const context = { useOnboarding: () => ({ draft, role, updateDraft: (patch: object) => { draft = { ...draft, ...patch }; } }) };
  const mocks = {
    'react-native': { Pressable: 'Pressable', Text: 'Text', View: 'View', StyleSheet: { create: (value: unknown) => value } },
    'expo-router': { useRouter: () => router },
    'expo-status-bar': { StatusBar: 'StatusBar' },
    '@expo/vector-icons/MaterialIcons': 'Icon',
    '@/components/GroupedServicePickerSheet': { GroupedServicePickerSheet: 'Picker' },
    '@/components/onboarding/FigmaOnboarding': { OnboardingFormScaffold: 'Scaffold', OnboardingButton: 'Button', onboardingColors: {} },
    './onboarding-context': context,
  };
  const mount = () => runtimeComponent('@/app/(onboarding)/job', 'default', mocks);
  let app = mount();
  let tree: TestElement;
  const render = () => { tree = app.render(); };
  const find = (predicate: (node: TestElement) => boolean) => {
    const node = componentElements(tree).find(predicate);
    assert.ok(node, 'expected matching screen element');
    return node;
  };
  render();
  return {
    render, find, routes,
    get draft() { return draft; },
    remount() { app.unmount(); app = mount(); render(); },
    picker: () => find((node) => node.type === 'Picker').props,
    footer: () => find((node) => node.type === 'Button').props,
  };
}

describe('service-first onboarding screen handlers', () => {
  it('keeps conflicting services visible and blocks navigation instead of silently pruning', () => {
    const app = setup('provider');
    app.picker().onApplyMulti({ selectedServices: ['Canva layout'], customServices: [] }); app.render();
    app.find((node) => node.props?.accessibilityLabel === 'On-site').props.onPress(); app.render();
    assert.equal(app.draft.offeredServices.join(','), 'Canva layout');
    app.find((node) => node.props?.accessibilityLabel === 'Remove Canva layout');
    assert.equal(app.footer().disabled, true);
    app.footer().onPress(); assert.equal(app.routes.length, 0);
    app.find((node) => node.props?.accessibilityLabel === 'Online').props.onPress(); app.render();
    assert.equal(app.footer().disabled, false);
    app.footer().onPress(); assert.equal(app.routes[0], '/(onboarding)/review');
  });
  it('commits confirmed choices to context, preserves them across Back/remount, and supports removal', () => {
    const app = setup('provider');
    app.picker().onApplyMulti({ selectedServices: ['Cleaning'], customServices: ['Pet sitting'] }); app.render();
    app.find((node) => node.type === 'Scaffold').props.onBack(); app.remount();
    assert.equal(app.draft.offeredServices.join(','), 'Cleaning');
    assert.equal(app.draft.customOfferedServices.join(','), 'Pet sitting');
    app.find((node) => node.props?.accessibilityLabel === 'Remove Pet sitting').props.onPress(); app.render();
    assert.equal(app.draft.customOfferedServices.length, 0);
  });
  it('allows custom-only hiring selection without category or temporary mode prerequisites', () => {
    const app = setup('client');
    assert.equal(app.picker().categories.length, 4);
    app.picker().onApplyMulti({ selectedServices: [], customServices: ['Child pickup'] }); app.render();
    assert.equal(app.footer().disabled, false);
    assert.equal(app.draft.offeredDeliveryMode, null);
    assert.equal(componentElements(app.find((node) => node.type === 'Scaffold')).some((node) => node.props?.accessibilityRole === 'radio'), false);
    app.footer().onPress(); assert.equal(app.routes[0], '/(onboarding)/review');
  });
  it('always supplies the full taxonomy even after choosing a worker mode', () => {
    const app = setup('provider', { offeredDeliveryMode: 'on_site' });
    const all = Object.values(app.picker().servicesByCategory).flat() as string[];
    assert.ok(all.includes('Canva layout'));
    assert.ok(all.includes('Cleaning'));
    assert.equal(app.picker().maxSelections, undefined);
  });
  it('sheet dismissal does not modify confirmed selections', () => {
    const app = setup('client', { neededServices: ['Cleaning'] });
    app.picker().onClose(); app.render();
    assert.equal(app.draft.neededServices.join(','), 'Cleaning');
  });
});
