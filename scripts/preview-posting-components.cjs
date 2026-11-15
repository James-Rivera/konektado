// Builds a static component harness. Does not start Expo or connect to Supabase.
const fs = require('node:fs');
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const Metro = require('@expo/metro/metro');
const root = path.resolve(__dirname, '..');
const flows = process.argv.includes('--flows');
const output = path.join(root, '.test-build', flows ? 'posting-flows' : 'posting-components');
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const config = getDefaultConfig(root);
  config.maxWorkers = 2;
  config.watchFolders = [root];
  config.resolver.unstable_conditionNames = ['require'];
  config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
  config.resolver.platforms = [...config.resolver.platforms, 'web'];
  config.resolver.useWatchman = false;
  const baseBundle = require('@expo/metro/metro/DeltaBundler/Serializers/baseJSBundle').default;
  const bundleToString = require('@expo/metro/metro/lib/bundleToString').default;
  config.serializer.getModulesRunBeforeMainModule = () => [];
  config.serializer.customSerializer = (entry, pre, graph, options) => ({ code: bundleToString(baseBundle(entry, pre, graph, options)).code, map: '{"version":3,"sources":[],"names":[],"mappings":""}' });
  config.resolver.resolveRequest = (context, name, platform) => {
    if (name.startsWith('node:')) return { type: 'empty' };
    if (flows) {
      if (name === 'expo-router') return { type:'sourceFile',filePath:path.join(root,'tests/fixtures/flow-router.tsx') };
      if (['@/utils/supabase','@/hooks/use-profile','@/services/profile-completion.service','@/services/job.service','@/services/service-profile.service','@/components/LocationMapPreview'].includes(name)) return { type:'sourceFile',filePath:path.join(root,'tests/fixtures/flow-data.tsx') };
    }
    if (name === '@/utils/supabase') return { type: 'sourceFile', filePath: path.join(root, 'tests/fixtures/no-network.ts') };
    if (name.startsWith('@/')) name = path.join(root, name.slice(2));
    if (name === 'react-native') name = 'react-native-web';
    return context.resolveRequest({ ...context, preferNativePlatform: false }, name, platform);
  };
  await Metro.runBuild(config, { entry: flows ? 'tests/fixtures/flow-preview.tsx' : 'tests/fixtures/interaction-preview.tsx', platform: 'web', dev: false, minify: false, out: path.join(output, 'bundle.js') });
  const fonts = ['Regular','Bold','Medium','Light','Black','Italic'].map(f => '@font-face{font-family:Satoshi-' + f + ';src:url(/Satoshi-' + f + '.otf)}').join('');
  fs.writeFileSync(path.join(output,'index.html'), '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Konektado component checks</title><style>' + fonts + 'html,body,#root{height:100%;margin:0}body{font-family:Arial,sans-serif}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
  console.log('Component bundle built. Run node scripts/serve-posting-preview.cjs to inspect it.');
})().catch(error => { console.error(error); process.exitCode=1; });
