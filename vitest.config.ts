import { defineConfig } from 'vitest/config';

// Root Vitest config. Per-workspace `vitest run --passWithNoTests` (invoked via
// `pnpm turbo run test`) discovers this config by climbing the tree; each
// workspace acts as its own test root.
//
// We do NOT use `projects: ['apps/*', 'packages/*']` here because Vitest 4
// requires each entry in `projects` to be either a vitest config file or a
// directory containing one. Phase 1 stubs have no test files and no per-
// workspace vitest configs, so the glob would resolve to zero projects and
// vitest exits with "No projects were found" — even with --passWithNoTests.
//
// When a workspace later adds real tests + its own vitest.config.ts, this
// root config still applies as the shared base.
export default defineConfig({
  test: {
    passWithNoTests: true,
  },
});
