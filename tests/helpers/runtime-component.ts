import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

export type TestElement = { type: any; props: any };

/** Exercises real component handlers; native layout and platform I/O are replaced. */
export function runtimeComponent(id: string, exportName: string, mocks: Record<string, unknown>, globals: Record<string, unknown> = {}) {
  const cache = new Map<string, { exports: any }>();
  const slots: any[] = [];
  const effects: { deps?: unknown[]; cleanup?: () => void }[] = [];
  let cursor = 0;
  let effectCursor = 0;
  let dirty = false;
  let props: any = {};
  let tree: TestElement;
  const pending: (() => void)[] = [];
  const same = (a?: unknown[], b?: unknown[]) => Boolean(a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i])));
  const react = {
    createContext: (value: unknown) => ({ Provider: 'Provider', value }),
    useContext: (context: { value: unknown }) => context.value,
    useState(initial: any) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], (next: any) => {
        const value = typeof next === 'function' ? next(slots[index]) : next;
        if (!Object.is(value, slots[index])) { slots[index] = value; dirty = true; }
      }];
    },
    useRef(initial: unknown) { const index = cursor++; if (!(index in slots)) slots[index] = { current: initial }; return slots[index]; },
    useMemo(factory: () => unknown, deps?: unknown[]) {
      const index = cursor++;
      if (!slots[index] || !same(slots[index].deps, deps)) slots[index] = { deps, value: factory() };
      return slots[index].value;
    },
    useCallback(fn: Function, deps?: unknown[]) { return react.useMemo(() => fn, deps); },
    useEffect(effect: () => void | (() => void), deps?: unknown[]) {
      const index = effectCursor++;
      const old = effects[index];
      if (!old || !same(old.deps, deps)) pending.push(() => {
        old?.cleanup?.();
        const cleanup = effect();
        effects[index] = { deps, cleanup: typeof cleanup === 'function' ? cleanup : undefined };
      });
    },
  };
  const jsx = (type: unknown, elementProps: unknown) => ({ type, props: elementProps });
  function load(name: string, parent?: string): any {
    if (name in mocks) return mocks[name];
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
    const base = name.startsWith('@/') ? path.resolve(name.slice(2)) : name.startsWith('.') && parent ? path.resolve(path.dirname(parent), name) : null;
    if (!base) throw Error(`Unexpected component dependency: ${name}`);
    const file = ['.ts', '.tsx'].map((ext) => base + ext).find((candidate) => fs.existsSync(candidate));
    if (!file) throw Error(`Missing component dependency: ${name}`);
    if (cache.has(file)) return cache.get(file)!.exports;
    const module = { exports: {} };
    cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const run = vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { console, Date, requestAnimationFrame: (fn: () => void) => fn(), setTimeout: () => 1, clearTimeout: () => undefined, __DEV__: false, ...globals });
    run((dependency: string) => load(dependency, file), module, module.exports);
    return module.exports;
  }
  const component = load(id)[exportName];
  return {
    render(nextProps = props) {
      props = nextProps;
      for (let pass = 0; pass < 30; pass++) {
        cursor = 0; effectCursor = 0; dirty = false;
        tree = component(props);
        pending.splice(0).forEach((effect) => effect());
        if (!dirty) return tree;
      }
      throw Error('Component exceeded rerender limit');
    },
    unmount() { effects.forEach((effect) => effect.cleanup?.()); },
  };
}

export function componentElements(node: unknown): TestElement[] {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(componentElements);
  if (!('type' in node)) return [];
  const element = node as TestElement;
  return [element, ...Object.values(element.props ?? {}).flatMap(componentElements)];
}
