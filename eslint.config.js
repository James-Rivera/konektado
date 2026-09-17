// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      // Build output. The previous `dist/*` only matched direct children, so
      // anything nested was still being linted.
      'dist/**',
      // Expo's generated types (.expo/types/router.d.ts carries its own
      // eslint-disable directives, which this config then reports as unused).
      '.expo/**',
      // Claude Code worktrees are full checkouts of this repo living inside
      // it, so linting them reports every problem a second time.
      '.claude/**',
      // Deno edge functions. They use `npm:` import specifiers that Node
      // resolution cannot follow, and they are already `@ts-nocheck`. They
      // need a Deno-aware config, not this one.
      'supabase/functions/**',
    ],
  },
]);
