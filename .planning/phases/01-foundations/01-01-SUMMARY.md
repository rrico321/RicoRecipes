---
phase: 01-foundations
plan: 01
subsystem: monorepo-scaffold
tags: [monorepo, turborepo, pnpm, scaffolding, biome, vitest]
requirements: [FOUND-01]
dependency_graph:
  requires: []
  provides:
    - pnpm workspace (apps/* + packages/*)
    - Turbo task graph (build/typecheck/test/lint/dev)
    - Shared tsconfig.base.json (TS 5.7, verbatimModuleSyntax, bundler resolution)
    - Biome 2.4 single lint+format config
    - Vitest 4 root config (shared base)
    - 9 stub workspaces (apps/web, apps/mobile, apps/cli, packages/{db,core,auth,api,sync,ui})
    - pnpm-lock.yaml (frozen-install-ready)
  affects:
    - apps/mcp (Plan 01-02) — slots a real Next.js workspace into the same task graph
    - CI workflow (Plan 01-03) — runs the same four gates this plan proved locally
tech-stack:
  added:
    - pnpm 10.33.0 (workspace driver)
    - turbo 2.9.12 (task graph + remote cache hooks)
    - typescript 5.9.3 (CLAUDE.md pin ^5.7 satisfied; npm latest resolved)
    - "@biomejs/biome 2.4.15"
    - vitest 4.1.6
    - tsx 4.21.0
  patterns:
    - "Thin stubs everywhere except apps/mcp (CONTEXT.md locked decision)"
    - "@rico/* scope for every workspace"
    - "No-op `echo skip` build script per stub to keep Turbo's ^build graph resolvable"
    - "Direct .ts main/exports in packages (no per-package build step in Phase 1)"
key-files:
  created:
    - package.json
    - pnpm-workspace.yaml
    - .npmrc
    - turbo.json
    - tsconfig.base.json
    - biome.json
    - vitest.config.ts
    - .gitignore
    - .env.example
    - pnpm-lock.yaml
    - apps/web/{package.json,tsconfig.json,src/index.ts}
    - apps/mobile/{package.json,tsconfig.json,src/index.ts}
    - apps/cli/{package.json,tsconfig.json,src/index.ts}
    - packages/db/{package.json,tsconfig.json,src/index.ts}
    - packages/core/{package.json,tsconfig.json,src/index.ts}
    - packages/auth/{package.json,tsconfig.json,src/index.ts}
    - packages/api/{package.json,tsconfig.json,src/index.ts}
    - packages/sync/{package.json,tsconfig.json,src/index.ts}
    - packages/ui/{package.json,tsconfig.json,src/index.ts}
  modified: []
decisions:
  - "Kept `^build` dep on the `build` task; every stub provides `echo skip` so the graph resolves trivially (plan-locked Option A)"
  - "Dropped `projects: ['apps/*', 'packages/*']` from root vitest.config.ts — Vitest 4 requires real configs at each project path; stubs have none. Root config is now a shared base discovered via tree-climb."
  - "Disabled pnpm 10's `verify-deps-before-run` — zero-dep stubs have no local node_modules, which the new check race-flagged as 'missing' under Turbo parallel exec."
metrics:
  duration: ~10 minutes
  tasks_completed: 3
  files_created: 28
  files_modified: 0
completed: 2026-05-14
---

# Phase 01 Plan 01: Monorepo Scaffold Summary

One-liner: Scaffolds a 10-workspace pnpm + Turborepo 2.9 monorepo with 9 stub packages, shared TS 5.7 / Biome 2 / Vitest 4 tooling — all four Turbo gates (build, typecheck, test, lint) green locally against the 9-stub graph.

## What Was Built

**Root tooling (9 files):**
- `package.json` — workspace root, `packageManager: "pnpm@10.33.0"`, devDeps pin Turbo/TS/Biome/Vitest/tsx
- `pnpm-workspace.yaml` — globs `apps/*` and `packages/*`
- `.npmrc` — `engine-strict`, `auto-install-peers`, `verify-deps-before-run=false` (see Deviations)
- `turbo.json` — five tasks (build, typecheck, test, lint, dev), `^build` dependency preserved
- `tsconfig.base.json` — TS 5.7 baseline (verbatimModuleSyntax, bundler resolution, strict, noUncheckedIndexedAccess)
- `biome.json` — Biome 2.4 single config (recommended rules, single-quote / semicolons-always)
- `vitest.config.ts` — Vitest 4 shared base (no `projects` field — see Deviations)
- `.gitignore` — excludes `node_modules`, `.vercel/`, `.env*.local`, `.next/`, `dist/`, `.turbo`
- `.env.example` — template with `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `TURBO_TOKEN`, `TURBO_TEAM` placeholders

**9 stub workspaces** — each: `package.json` (uniform scripts `build`/`typecheck`/`test`/`lint`), `tsconfig.json` extending root, `src/index.ts` placeholder. Apps export `{}`; packages export `type Placeholder = never` and declare direct `.ts` `main`/`exports` for zero-build consumption.

**Lockfile:** `pnpm-lock.yaml` committed (resolved 55 root devDep packages; `pnpm install --frozen-lockfile` green).

## Local Gate Results

```
pnpm install --frozen-lockfile          # OK (~200ms with warm store)
pnpm turbo run build typecheck test lint  # 36/36 successful (all cache miss on first run, ~1.2s parallel)
pnpm exec biome ci .                      # OK — 33 files clean
```

Turbo cache miss/hit:
- First run after install: 36 cache miss
- Re-run unchanged: 36 cache hit (`<200ms`)

ROADMAP Phase 1 success criterion #1 (`pnpm install + pnpm turbo build` across all workspaces) is demonstrably green against the 9-stub graph. The criterion completes when Plan 01-02 lands the real `apps/mcp` and the same Turbo graph runs `next build` against it.

## Decisions Confirmed in Execution

1. **Option A on Turbo `^build`:** Kept `dependsOn: ["^build"]` on the build task and added a no-op `"build": "echo skip"` per stub (matches the plan's interfaces block; rejected Option B / removing the `^build` dep, since real builds land in Plans 01-02 / Phase 4+).
2. **Direct `.ts` main/exports for packages:** Confirmed Assumption A1 — `tsc --noEmit` passes for every workspace without a per-package compilation step.
3. **No per-stub vitest.config.ts:** Stubs share the root config; the root config no longer declares `projects` (see Deviations).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Vitest root `projects: ['apps/*', 'packages/*']` resolved to zero projects**
- **Found during:** Task 3 (`pnpm turbo run test` failed with `Error: No projects were found. Make sure your configuration is correct.`)
- **Issue:** Vitest 4's `projects` field requires each entry to point at a vitest config file or a directory containing one. Phase 1 stubs have no per-workspace vitest config, so the glob expanded to nine directories with nothing to load → vitest exits with code 1 even though `--passWithNoTests` is set (the error fires before test discovery).
- **Fix:** Removed the `projects` field from `vitest.config.ts`; root config now just sets `passWithNoTests: true`. Each workspace's `vitest run` discovers the root config via tree-climb. When a workspace later adds real tests, it can add its own `vitest.config.ts` and the root continues to function as the shared base.
- **Files modified:** `vitest.config.ts`
- **Commit:** `3964a11`
- **Doc impact:** RESEARCH.md Pattern 9 (Vitest 4 `projects` config) and Pitfall 1 should be updated for Plan 01-02+ to reflect this: use `projects` only when each listed entry has its own config.

**2. [Rule 3 — Blocking] pnpm 10 `verify-deps-before-run` race-flagged stubs under Turbo parallel exec**
- **Found during:** Task 3 (`pnpm turbo run ...` non-deterministically failed individual tasks with `WARN: Local package.json exists, but node_modules missing, did you mean to install?` followed by `ELIFECYCLE Command failed`)
- **Issue:** pnpm 10 introduced a pre-run dependency-state check. Stub workspaces declare zero dependencies, so pnpm never creates a per-workspace `node_modules` directory. Under Turbo's parallel `pnpm run <task>` invocations across 9 stubs, the check intermittently aborts a subset of tasks. The error message is misleading (`did you mean to install?` — install is fine; the check is the problem).
- **Fix:** Added `verify-deps-before-run=false` to `.npmrc`. Per-workspace integrity is guaranteed by the root lockfile + Turbo's own graph; this check is redundant for zero-dep stubs. Will revisit if any stub gains real dependencies in later phases.
- **Files modified:** `.npmrc`
- **Commit:** `3964a11`

No architectural changes; both deviations were configuration-level Phase-1 setup issues that the plan's interfaces block did not anticipate.

## Authentication Gates

None. This plan does not touch auth — Clerk lands in Phase 2.

## Known Stubs

All 9 workspaces are intentional Phase-1 stubs by CONTEXT.md lock. Each is documented in its `src/index.ts` with the owning phase:
- `apps/web` — Phase 4
- `apps/mobile` — Phase 5
- `apps/cli` — Phase 4
- `packages/{db,core,auth,api,sync,ui}` — surface area defined when consumed (Phase 2+)

These are not "stub bugs" — they are the planned Phase-1 shape.

## Notes for Plans 01-02 / 01-03

- **Plan 01-02 (`apps/mcp`):** Will introduce the 10th workspace. Should replace `echo skip` with `next build` and add `app/api/mcp/[transport]/route.ts` + `app/api/health/route.ts` + `app/layout.tsx`. The Turbo `^build` dependency is already in place; no `turbo.json` change required.
- **Plan 01-02 vitest sanity test:** When adding the optional `/api/health` test, the test should land **inside `apps/mcp/`** with a workspace-local `vitest.config.ts` if it needs project-specific overrides. Root config (`passWithNoTests: true`) will still apply as the base.
- **Plan 01-03 (CI):** The GitHub Actions workflow can call `pnpm turbo run build typecheck test lint` exactly as locally proven. `pnpm install --frozen-lockfile` is also proven against the committed `pnpm-lock.yaml`.
- **TypeScript version drift:** CLAUDE.md pins `^5.7`; pnpm resolved 5.9.3 (newer minor; satisfies the caret). Plan accepted this — `tsc --noEmit` passes cleanly under 5.9.3 with the shared `tsconfig.base.json`.

## Commit Trail

| Commit | Task | Description |
|--------|------|-------------|
| `12b29bf` | Task 1 | chore(01-01): scaffold monorepo root tooling |
| `881db9b` | Task 2 | feat(01-01): scaffold 9 stub workspaces (apps + packages) |
| `3964a11` | Task 3 | chore(01-01): install deps and prove four-gate Turbo pipeline |

## Self-Check: PASSED

- All 28 created files verified on disk.
- All 3 task commits present in `git log`.
- `pnpm install --frozen-lockfile && pnpm turbo run build typecheck test lint` green.
- `pnpm exec biome ci .` green.
- No `vitest.workspace.ts` file was created.
- `.gitignore` excludes `.vercel/` and `.env*.local` (verified via `grep`).
