import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

/** Execute actual service code with only external I/O boundaries replaced. */
export function runtimeService<T>(id: string, mocks: Record<string, unknown>): T {
  const cache = new Map<string, { exports: Record<string, unknown> }>();
  const load = (name: string): unknown => {
    if (name in mocks) return mocks[name];
    if (cache.has(name)) return cache.get(name)!.exports;
    if (!name.startsWith('@/')) throw Error(`Unexpected runtime dependency: ${name}`);
    const source = fs.readFileSync(path.resolve(name.slice(2) + '.ts'), 'utf8');
    const module = { exports: {} };
    cache.set(name, module);
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const run = vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { console, Date, __DEV__: false });
    run(load, module, module.exports);
    return module.exports;
  };
  return load(id) as T;
}
