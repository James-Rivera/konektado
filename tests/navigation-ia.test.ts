/**
 * Navigation information architecture and Home discovery contracts.
 *
 * These are SOURCE-CONTRACT tests: they read the real screen and navigation
 * files and assert the decisions that cannot be observed from exported values
 * alone. `tests/home-discovery-stability.test.ts` checks that
 * `HOME_DISCOVERY_GROUPS` is a stable eight-item constant, but it maps that
 * constant itself, so it would still pass if `app/(tabs)/index.tsx` were
 * changed back to sorting tiles by preference or mode. The assertions here
 * close that gap by pinning the call site.
 *
 * The repository has no React test renderer and this feature does not justify
 * adding one, so the component contract is enforced statically instead.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { HOME_DISCOVERY_GROUPS, MORE_SERVICES_GROUP } from '@/constants/service-taxonomy';

/** npm scripts run from the repository root. */
const REPO_ROOT = process.cwd();

function readSource(relativePath: string) {
  const fullPath = path.join(REPO_ROOT, relativePath);
  assert.ok(fs.existsSync(fullPath), `expected ${relativePath} to exist at ${fullPath}`);
  return fs.readFileSync(fullPath, 'utf8');
}

/**
 * Strips comments so an assertion cannot be satisfied — or broken — by prose.
 * `_layout.tsx` explains in a comment why it does NOT use `href: null`, which
 * a naive search would read as the code doing exactly that.
 */
function stripComments(source: string) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const tabLayout = readSource('app/(tabs)/_layout.tsx');
const bottomNav = readSource('components/BottomNav.tsx');
const homeScreen = readSource('app/(tabs)/index.tsx');
const searchScreen = readSource('app/(tabs)/search.tsx');

/** The four approved bottom-navigation destinations (DEC-009 shape). */
const APPROVED_TABS = ['index', 'post', 'messages', 'profile'] as const;

describe('bottom navigation IA', () => {
  it('1/2. the tab bar renders exactly the four approved destinations', () => {
    const metaBlock = bottomNav.match(/const TAB_META[\s\S]*?\n};/);
    assert.ok(metaBlock, 'TAB_META should be declared in components/BottomNav.tsx');

    const keys = [...metaBlock[0].matchAll(/^\s{2}(\w+):\s*\{/gm)].map((match) => match[1]);

    assert.deepEqual(keys, [...APPROVED_TABS]);
    assert.equal(keys.length, 4, 'Search was removed from the tab bar by the navigation rework');
  });

  it('2b. the tab bar only renders routes present in TAB_META', () => {
    assert.match(
      bottomNav,
      /state\.routes\.filter\(\(route\) => TAB_META\[route\.name\]\)/,
      'BottomNav must filter routes through TAB_META, which is what keeps Search off the tab bar',
    );
  });

  it('11/14. Search keeps its route so router.push still works, and is not hidden with href: null', () => {
    assert.match(tabLayout, /name="search"/, 'the Search route must stay registered');
    assert.doesNotMatch(
      stripComments(tabLayout),
      /href:\s*null/,
      'href: null can drop the screen from the navigator and break router.push',
    );
  });

  it('11b. exactly one tab bar is wired, and every registered tab route is unique', () => {
    const tabBarProps = [...tabLayout.matchAll(/tabBar=\{/g)];
    assert.equal(tabBarProps.length, 1, 'there should be a single tab bar implementation');

    const routes = [...tabLayout.matchAll(/name="([^"]+)"/g)].map((match) => match[1]);
    assert.deepEqual(
      routes,
      [...APPROVED_TABS, 'search'],
      'registered tab routes changed; update the IA decision log before changing this',
    );
    assert.equal(new Set(routes).size, routes.length, 'no duplicate tab routes');
  });
});

describe('Home discovery grid contract', () => {
  it('3/4. Home builds tiles from the fixed constant, not from a preference-aware sort', () => {
    assert.match(
      homeScreen,
      /HOME_DISCOVERY_GROUPS\.map\(/,
      'Home must map the fixed HOME_DISCOVERY_GROUPS order directly',
    );
    assert.doesNotMatch(
      homeScreen,
      /getOrderedDiscoveryGroupsForMode/,
      'Home must not sort discovery tiles by preference or mode (DEC-117). ' +
        'The navigation rework originally ordered them with the Search helper; ' +
        'DEC-117 superseded that because the grid reshuffled mid-session.',
    );
  });

  it('4b. the tile memo has no reactive dependencies', () => {
    const memoBlock = homeScreen.match(
      /const categoryTiles = useMemo<HomeCategoryTile\[\]>\([\s\S]*?\n {2}\);/,
    );
    assert.ok(memoBlock, 'categoryTiles should be a useMemo in app/(tabs)/index.tsx');
    assert.match(
      memoBlock[0],
      /\[\],\s*\);$/,
      'the dependency array must stay empty so the order cannot vary per render',
    );
  });

  it('9. Home and Search use different ordering logic on purpose', () => {
    assert.match(
      searchScreen,
      /getOrderedDiscoveryGroupsForMode/,
      'Search may still order its browse groups by preference',
    );
  });

  it('10/11c. Home renders eight tiles with no More services tile and no All services tile', () => {
    assert.equal(HOME_DISCOVERY_GROUPS.length, 8);
    assert.equal((HOME_DISCOVERY_GROUPS as readonly string[]).includes(MORE_SERVICES_GROUP), false);

    assert.doesNotMatch(
      homeScreen,
      /ALL_CATEGORIES_TILE_KEY|'All services'/,
      'the ninth "All services" tile was removed; the section header already offers "See all"',
    );
    assert.doesNotMatch(
      homeScreen,
      new RegExp(`'${MORE_SERVICES_GROUP}'`),
      'More services belongs to Search and See all only',
    );
  });
});

describe('Home to Search route parameters', () => {
  it('8. Home hands Search its mode, and optionally a group and the filter sheet', () => {
    const openSearch = homeScreen.match(/const openSearch = useCallback\([\s\S]*?\n {2}\);/);
    assert.ok(openSearch, 'openSearch should exist in app/(tabs)/index.tsx');

    assert.match(openSearch[0], /pathname: '\/\(tabs\)\/search'/);
    assert.match(openSearch[0], /filter: mapSearchModeToRouteFilter\(mode\)/);
    assert.match(openSearch[0], /group: options\.group/);
    assert.match(openSearch[0], /openFilters: '1'/);
  });

  it('8b. Search still reads every parameter Home can send', () => {
    const params = searchScreen.match(/useLocalSearchParams<\{[\s\S]*?\}>\(\)/);
    assert.ok(params, 'Search should declare its route params');

    ['filter', 'group', 'openFilters', 'q'].forEach((param) => {
      assert.match(params[0], new RegExp(`${param}\\?:`), `Search must accept the ${param} param`);
    });
  });

  it('13. Search offers a back affordance, since it is no longer a tab', () => {
    assert.match(searchScreen, /onBack=\{/, 'Search needs a back affordance when entered from Home');
  });

  it('11d. Home is the only screen that navigates into Search', () => {
    const files = ['app/(tabs)/index.tsx', 'app/(tabs)/search.tsx'];
    const offenders: string[] = [];

    const walk = (dir: string) => {
      fs.readdirSync(path.join(REPO_ROOT, dir), { withFileTypes: true }).forEach((entry) => {
        const relative = `${dir}/${entry.name}`;
        if (entry.isDirectory()) {
          walk(relative);
          return;
        }
        if (!entry.name.endsWith('.tsx') && !entry.name.endsWith('.ts')) return;
        if (files.includes(relative)) return;

        if (readSource(relative).includes('(tabs)/search')) offenders.push(relative);
      });
    };

    walk('app');
    walk('components');

    assert.deepEqual(
      offenders,
      [],
      'a second entry point into Search would duplicate the Home discovery workflow',
    );
  });
});
