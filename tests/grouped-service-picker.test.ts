import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MVP_SERVICE_CATEGORIES, MVP_SERVICE_OPTIONS, MVP_SERVICES_BY_CATEGORY } from '@/constants/service-taxonomy';
import { searchSkillOptions } from '@/services/service-classification';
import { componentElements, runtimeComponent, type TestElement } from './helpers/runtime-component';

function content(node: unknown): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (!node || typeof node !== 'object') return '';
  if (Array.isArray(node)) return node.map(content).join('');
  return content((node as TestElement).props?.children);
}

function setup(overrides: Record<string, unknown> = {}) {
  const applied: any[] = [];
  let closed = 0;
  const app = runtimeComponent('@/components/GroupedServicePickerSheet', 'GroupedServicePickerSheet', {
    'react-native': { Pressable: 'Pressable', Text: 'Text', TextInput: 'Input', View: 'View', ScrollView: 'ScrollView', KeyboardAvoidingView: 'Keyboard', Platform: { OS: 'android', select: (values: Record<string, unknown>) => values.android ?? values.default }, StyleSheet: { create: (value: unknown) => value } },
    '@/components/BottomSheet': { BottomSheet: 'Sheet' },
    '@/components/PrimaryButton': { PrimaryButton: 'Apply' },
    '@expo/vector-icons/MaterialIcons': 'Icon',
  });
  const props: any = {
    categories: MVP_SERVICE_CATEGORIES, servicesByCategory: MVP_SERVICES_BY_CATEGORY,
    description: 'Choose services', title: 'Services', searchPlaceholder: 'Search services',
    mode: 'multi', visible: true, selectedServices: [], selectedCustomServices: [],
    onClose: () => { closed++; }, onApplyMulti: (value: unknown) => applied.push(value), ...overrides,
  };
  let tree: TestElement;
  const render = () => { tree = app.render(props); };
  const find = (predicate: (node: TestElement) => boolean) => {
    const node = componentElements(tree).find(predicate); assert.ok(node, 'expected matching picker element'); return node;
  };
  render();
  return {
    props, render, find, applied,
    get closed() { return closed; },
    query(value: string) { find((node) => node.type === 'Input').props.onChangeText(value); render(); },
    add(value: string) { find((node) => node.props?.accessibilityLabel === `Add ${value}`).props.onPress(); render(); },
    apply: () => find((node) => node.type === 'Apply').props.onPress(),
    button(label: string) { return find((node) => node.type === 'Pressable' && content(node) === label); },
  };
}

describe('shared service picker behavior', () => {
  it('searches local aliases across categories and only adds after a user action', async () => {
    const app = setup(); app.query('karpintero');
    const result = app.button('Carpentry');
    assert.equal(result.props.accessibilityState.checked, false);
    assert.equal(app.applied.length, 0);
    result.props.onPress(); app.render(); await app.apply();
    assert.equal(app.applied[0].selectedServices.join(','), 'Carpentry');
  });
  it('offers custom entry even when a partial search has suggestions', async () => {
    const app = setup(); app.query('party food'); app.button('Party food trays'); app.add('party food'); await app.apply();
    assert.equal(app.applied[0].customServices.join(','), 'party food');
  });
  it('does not implicitly cap typed entries when the caller omits a cap', async () => {
    const app = setup({ selectedServices: MVP_SERVICE_OPTIONS.slice(0, 16) });
    app.query('Pet sitting'); app.add('Pet sitting'); await app.apply();
    assert.equal(app.applied[0].selectedServices.length, 16);
    assert.equal(app.applied[0].customServices.join(','), 'Pet sitting');
  });
  it('preserves the explicit Work Profile cap for typed entries', async () => {
    const app = setup({ selectedServices: MVP_SERVICE_OPTIONS.slice(0, 15), maxSelections: 15 });
    app.query('Pet sitting'); app.add('Pet sitting'); await app.apply();
    assert.equal(app.applied[0].customServices.length, 0);
    app.find((node) => node.props?.accessibilityLiveRegion === 'polite' && content(node).includes('up to 15'));
  });
  it('filters allowed choices before applying the eight-result display limit', () => {
    const results = searchSkillOptions('a', Number.POSITIVE_INFINITY);
    assert.ok(results.length > 8, 'fixture needs a result beyond the first eight');
    const target = results[8].service;
    const app = setup({ categories: ['Allowed'], servicesByCategory: { Allowed: [target] } });
    app.query('a'); app.button(target);
  });
  it('does not add an alias outside a caller’s allowed services', async () => {
    const app = setup({ categories: ['Allowed'], servicesByCategory: { Allowed: ['Cleaning'] } });
    app.query('karpintero'); app.add('karpintero'); await app.apply();
    assert.equal(app.applied[0].selectedServices.length, 0);
    assert.equal(app.applied[0].customServices.length, 0);
  });
  it('Cancel discards temporary edits and reopening restores confirmed selections', async () => {
    const app = setup({ selectedServices: ['Cleaning'] });
    app.query('Laundry help'); app.button('Laundry help').props.onPress(); app.render();
    app.button('Cancel').props.onPress();
    assert.equal(app.applied.length, 0); assert.equal(app.closed, 1);
    app.props.visible = false; app.render(); app.props.visible = true; app.render();
    await app.apply(); assert.equal(app.applied[0].selectedServices.join(','), 'Cleaning');
  });
  it('keeps the picker open after an Apply failure', async () => {
    const app = setup({ onApplyMulti: async () => { throw Error('Save unavailable'); } });
    await app.apply(); app.render();
    assert.equal(app.closed, 0);
    app.find((node) => node.props?.accessibilityLiveRegion === 'polite' && content(node).includes('Please try again'));
  });
  it('rejects blocked custom work without modifying the selection', async () => {
    const app = setup(); app.query('licensed electrical work'); app.add('licensed electrical work'); await app.apply();
    assert.equal(app.applied[0].customServices.length, 0);
  });
});
