import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

type Element = { type: any; props: any };
type Context = { Provider: unknown; value: unknown };

/** Minimal deterministic hook renderer for exercising the real app providers in Node. */
export function runtimeHook<T>(id: string, mocks: Record<string, unknown>) {
  const cache = new Map<string, { exports: Record<string, unknown> }>();
  const contexts: Context[] = [];
  const contextValues = new Map<Context, unknown>();
  const providerContexts = new Map<unknown, Context>();
  const instances = new Map<Function, { hooks: unknown[]; effects: Array<{ deps?: unknown[]; cleanup?: () => void }> }>();
  let current: { hooks: unknown[]; effects: Array<{ deps?: unknown[]; cleanup?: () => void }>; index: number; effectIndex: number } | null = null;
  let rerender = false;
  let output: unknown;
  const react = {
    createContext(value: unknown) { const context = { Provider: Symbol('provider'), value } as Context; contexts.push(context); providerContexts.set(context.Provider, context); contextValues.set(context, value); return context; },
    createElement(type: any, props: any, ...children: unknown[]) { return { type, props: { ...props, ...(children.length ? { children: children.length === 1 ? children[0] : children } : {}) } } as Element; },
    useContext(context: Context) { return contextValues.get(context) ?? context.value; },
    useState<S>(initial: S | (() => S)) {
      const slot = current!.index++;
      if (!(slot in current!.hooks)) current!.hooks[slot] = typeof initial === 'function' ? (initial as () => S)() : initial;
      const instance = current;
      return [instance!.hooks[slot], (next: any) => { const prior = instance!.hooks[slot] as any; instance!.hooks[slot] = typeof next === 'function' ? next(prior) : next; rerender = true; }] as const;
    },
    useRef<TValue>(initial: TValue) { const slot = current!.index++; if (!(slot in current!.hooks)) current!.hooks[slot] = { current: initial }; return current!.hooks[slot] as { current: TValue }; },
    useMemo<TValue>(factory: () => TValue, deps: unknown[]) { const slot = current!.index++; const prior = current!.hooks[slot] as { deps: unknown[]; value: TValue } | undefined; if (!prior || !same(prior.deps, deps)) current!.hooks[slot] = { deps, value: factory() }; return (current!.hooks[slot] as any).value; },
    useCallback<TValue extends Function>(fn: TValue, deps: unknown[]) { const slot = current!.index++; const prior = current!.hooks[slot] as { deps: unknown[]; value: TValue } | undefined; if (!prior || !same(prior.deps, deps)) current!.hooks[slot] = { deps, value: fn }; return (current!.hooks[slot] as any).value; },
    useEffect(effect: () => void | (() => void), deps?: unknown[]) { const i = current!.effectIndex++; const instance = current!; const old = instance.effects[i]; if (!old || !same(old.deps, deps)) pendingEffects.push(() => { old?.cleanup?.(); const cleanup = effect(); instance.effects[i] = { deps, cleanup: typeof cleanup === 'function' ? cleanup : undefined }; }); },
  };
  const pendingEffects: Array<() => void> = [];
  const load = (name: string): any => {
    if (name in mocks) return mocks[name];
    if (name === 'react') return react;
    if (cache.has(name)) return cache.get(name)!.exports;
    if (!name.startsWith('@/')) throw Error(`Unexpected hook dependency: ${name}`);
    const file = path.resolve(name.slice(2) + '.ts');
    const module = { exports: {} as Record<string, unknown> };
    cache.set(name, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const run = vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { console, Date, __DEV__: false, setInterval: () => 1, clearInterval: () => undefined });
    run(load, module, module.exports);
    return module.exports;
  };
  const api = load(id) as T;
  const renderElement = (element: any): any => {
    if (element == null || typeof element !== 'object' || !('type' in element)) return element;
    if (typeof element.type === 'symbol') { const context = providerContexts.get(element.type); if (!context) return element.props.children; const prev = contextValues.get(context); contextValues.set(context, element.props.value); const child = renderElement(element.props.children); contextValues.set(context, prev); return child; }
    if (typeof element.type !== 'function') return element;
    const instance = instances.get(element.type) ?? { hooks: [], effects: [] };
    instances.set(element.type, instance);
    current = { ...instance, index: 0, effectIndex: 0 };
    const result = element.type(element.props);
    instance.hooks = current.hooks; instance.effects = current.effects;
    current = null;
    return renderElement(result);
  };
  const drain = async () => {
    for (let pass = 0; pass < 30; pass++) {
      rerender = false; renderElement({ type: (load(id) as any).ProfileProvider, props: { children: { type: Consumer, props: {} } } });
      const effects = pendingEffects.splice(0); effects.forEach((run) => run());
      await Promise.resolve(); await Promise.resolve();
      if (!rerender && !pendingEffects.length) return;
    }
    throw Error('hook renderer exceeded rerender limit');
  };
  function Consumer() { output = { profile: (load('@/hooks/use-profile') as any).useProfile(), status: (load('@/hooks/use-profile-status') as any).useProfileStatus() }; return null; }
  load('@/hooks/use-profile');
  return { api, render: drain, get output() { return output; } };
}

function same(a?: unknown[], b?: unknown[]) { return Boolean(a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]))); }
