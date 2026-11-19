import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the instant-navigation regression suite.
 *
 * These tests run against a PRODUCTION build, not `next dev`. The testing API
 * `instant()` needs is enabled automatically in dev, but dev does not do
 * Partial Prerendering the way a real build does — and the static shell is
 * precisely what is under test. Testing it in dev would assert on something
 * users never receive.
 *
 * `EXPOSE_TESTING_API=1` must be set for `next build`, not just `next start`:
 * it is baked into the build output. The `test:e2e` script does both in order.
 */

const PORT = 3999;

export default defineConfig({
  testDir: "./e2e",
  // A failing instant() assertion usually means a real regression, so a retry
  // would just hide it. Fail loudly instead.
  retries: 0,
  reporter: [["list"]],

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    // `next start` only — the build (with EXPOSE_TESTING_API=1) happens in the
    // npm script, because setting the flag here would be too late.
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    // Never silently attach to a stale server on this port; the build under
    // test must be the one just produced.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
