/**
 * TEMPORARY measurement helper. Delete this file and its call sites once the
 * search enrichment numbers have been captured.
 *
 * Reading the output:
 *   TOTAL           actual wall-clock time for the enrichment block
 *   SUM(sequential) what the same steps would have cost run one after another
 *   saved           the difference, i.e. what parallelising bought us
 *
 * Steps inside one `Promise.all` overlap, so TOTAL tracks the slowest branch
 * while SUM adds them up - that is the before/after comparison, from one run.
 */
export function createEnrichmentTimer(label: string) {
  const startedAt = Date.now();
  const stepDurations: number[] = [];

  return {
    async step<T>(name: string, promise: Promise<T>): Promise<T> {
      const start = Date.now();
      try {
        return await promise;
      } finally {
        const elapsed = Date.now() - start;
        stepDurations.push(elapsed);
        if (__DEV__) console.log(`[perf]   ${label}.${name}: ${elapsed}ms`);
      }
    },

    done(rowCount: number) {
      if (!__DEV__) return;

      const total = Date.now() - startedAt;
      const sequential = stepDurations.reduce((running, value) => running + value, 0);
      console.log(
        `[perf] ${label} rows=${rowCount} TOTAL=${total}ms ` +
          `SUM(sequential)=${sequential}ms saved~${Math.max(sequential - total, 0)}ms`,
      );
    },
  };
}
