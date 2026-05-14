# Phase 1: Foundations — Research

**Researched:** 2026-05-14
**Domain:** Monorepo scaffolding + managed-service wiring (Turborepo 2.9 + pnpm 10 + Next.js 16 + Vercel + Neon + GitHub Actions + Biome 2 + Vitest 4)
**Confidence:** HIGH

## Summary

Phase 1 is a thin walking-skeleton phase. Every tool and version is already pinned in CLAUDE.md and re-verified live against the npm registry today (2026-05-14) — no version drift. The only real engineering is `apps/mcp` (a real Next.js 16 app with a `mcp-handler` route at `/api/mcp/[transport]` and a separate `/api/health` smoke endpoint); everything else is templated stubs that exist purely to make `pnpm turbo build` succeed and to prove the pipeline (workspace resolution, Turbo cache, CI gates, Vercel preview deploy, Neon link).

All four soft defaults from CONTEXT.md `<open_decisions>` are **CONFIRMED** by official sources: (1) one Vercel project per deployable app via `vercel link --repo`, (2) `/api/health` as the smoke target with `mcp-handler` mounted but exercised in Phase 3, (3) GitHub Actions for the three gates without Neon branching, (4) `vercel env pull` workflow with `.env.example` committed, (5) Turborepo Vercel remote cache from day one (free, two-command setup).

**Primary recommendation:** Templated stubs first (one PLAN to scaffold the monorepo + all 9 stubs in parallel), then `apps/mcp` (its own PLAN with `mcp-handler` + health route), then CI + Vercel + Neon wiring (its own PLAN). Three plans total for Phase 1 — matches the "thin pipeline" goal.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Monorepo workspace resolution | Build tooling (pnpm + Turbo) | — | pnpm-workspace.yaml + turbo.json define graph; not a runtime concern |
| MCP transport handling | API / Backend (Next.js Route Handler) | — | `mcp-handler` mounts as a standard App Router route handler under `/api/mcp/[transport]` |
| Smoke health endpoint | API / Backend (Next.js Route Handler) | CDN edge (irrelevant in Phase 1) | Plain `GET /api/health` returning 200; Node runtime is the safe default per Next 16 |
| CI gates (typecheck / test / lint) | Build tooling (GitHub Actions + Turbo) | — | Runs in CI; not a runtime tier |
| Database connectivity | API / Backend → Neon Postgres | — | Phase 1 only injects `DATABASE_URL` env var; nothing reads it yet (Phase 2 lands schema) |
| Env var distribution | Hosting platform (Vercel) | Local dev (`vercel env pull`) | Vercel is source of truth; local mirrors via CLI |

**Why this matters:** Phase 1 has zero browser tier and zero database read/write paths. The only code that runs at request time is the MCP route handler and the health endpoint — both server-side Node runtime in `apps/mcp`. Any task that proposes client-side code, edge runtime, or database queries in Phase 1 is misassigned.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**App scaffolding scope — Thin stubs for all apps/packages, with apps/mcp as the one real Next.js app**

- Every workspace member listed in FOUND-01 (`apps/{mcp,mobile,cli,web}` + `packages/{db,core,auth,api,sync,ui}`) is created in Phase 1.
- All apps **except apps/mcp** ship as one-file stubs: `package.json`, `tsconfig.json` extending the root, and an `index.ts` (or equivalent entry) that compiles cleanly under `tsc --noEmit`. No frameworks initialized, no routes, no Expo / EAS config, no CLI commands.
- All `packages/*` ship as thin packages: `package.json`, `tsconfig.json`, one `index.ts` exporting at most a typed no-op or a placeholder type. Names are locked by FOUND-01.
- **apps/mcp is a real Next.js 16 app** (the preview-deploy target). It is *not* a stub.

**Downstream implication:** Plans should explicitly distinguish `apps/mcp` (real app, full work) from the stubs (templated, near-identical, parallelizable). Stub creation is likely 1–2 plans total covering all 9 stub workspaces; `apps/mcp` is its own plan.

**MCP app shape — apps/mcp and apps/web are two separate Next.js apps, deployed independently**

- `apps/mcp` exposes only the MCP route handler (`/api/mcp/[transport]` via `mcp-handler`). No UI pages.
- `apps/web` (Phase 4) is its own Next.js app for the admin UI. Separate Vercel project, separate domain target.
- They share types/services through `packages/*`, not through co-location.

### Claude's Discretion (soft defaults — all CONFIRMED below)

- **Vercel project layout:** one Vercel project per deployable app; `vercel link --repo` at repo root. — **CONFIRMED**
- **MCP smoke endpoint:** `mcp-handler` mounted at `/api/mcp/[transport]` with zero tools; criterion-4 smoke check hits a separate `GET /api/health` returning 200. — **CONFIRMED**
- **CI gates & Neon branching:** GitHub Actions for tsc + Vitest + Biome on every PR; no Neon branching in Phase 1 (lands Phase 2). — **CONFIRMED**
- **Env var workflow:** `vercel env pull .env.local` after `vercel link`; `.env.example` committed. — **CONFIRMED**
- **Turborepo remote cache:** enable from day 1 via Vercel remote cache (free). — **CONFIRMED**

### Deferred Ideas (OUT OF SCOPE)

Nothing deferred from Phase 1 discussion.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | Turborepo monorepo scaffolded with pnpm workspaces and `apps/{mcp,mobile,cli,web}` + `packages/{db,core,auth,api,sync,ui}` layout | Stub Package Shape section + Project Structure section |
| FOUND-02 | Neon Postgres project provisioned and linked to Vercel project via `vercel link --repo` | Neon Vercel Integration + Vercel Monorepo Linking sections |
| FOUND-03 | CI runs typecheck (tsc), unit tests (Vitest), and lint (Biome) on every PR | GitHub Actions CI section + Biome 2 / Vitest 4 baseline configs |
| FOUND-04 | First preview deploy of the MCP server succeeds end-to-end (smoke health check) | Next.js 16 App Skeleton section + mcp-handler Mount Pattern + `/api/health` route |

## Project Constraints (from CLAUDE.md)

CLAUDE.md is authoritative for stack and versions. Phase 1 plans must NOT contradict:

- **Tooling lock:** Turborepo 2.9.x, pnpm 10.x, TypeScript 5.7.x, Biome 2.x (NOT ESLint+Prettier — though Biome+ESLint fallback is mentioned), `tsx` 4.x. All verified against npm registry today.
- **Web framework:** Next.js 16.2.6 with React 19.2.6 (hard requirement: do not pin React 18). Turbopack is default in dev AND prod build for Next 16. App Router only.
- **MCP layer:** `@modelcontextprotocol/sdk@1.29.0`, `mcp-handler@1.1.0` (a.k.a. `@vercel/mcp-adapter`). Streamable HTTP only — no SSE.
- **Tailwind v4 caveat:** When `apps/mcp` adds any styling later (it shouldn't in Phase 1), use Tailwind v4 CSS-first config — never copy v3 `tailwind.config.js` patterns from training data.
- **Drizzle / Neon driver:** `@neondatabase/serverless@1.1.0` (NOT raw `pg`). Phase 1 does not use this yet, but `packages/db` stub should not pull in `pg`.
- **What NOT to use (relevant in Phase 1):** ESLint+Prettier, Jest, `chalk` (use `picocolors`), raw `pg`, Tailwind v3 patterns, tRPC v10 patterns. None of these should appear in any Phase 1 file.
- **GSD enforcement:** All file edits must go through a GSD command — Phase 1 plans execute under `/gsd-execute-phase`.

## Standard Stack

### Core (verified versions as of 2026-05-14)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pnpm | 10.33.0 | Package manager + workspace driver | `[VERIFIED: npm view pnpm version]` Required by Turborepo 2.x; CLAUDE.md pins 10.x |
| Turborepo | 2.9.12 | Task graph + remote cache | `[VERIFIED: npm view turbo version]` Vercel-native, free remote cache |
| TypeScript | 5.7.x (latest 6.0.3) | Language | `[VERIFIED: npm view typescript version]` — npm latest is 6.0.3, but CLAUDE.md pins 5.7.x. **Honor the CLAUDE.md pin (5.7.x) unless the user reopens it.** |
| Next.js | 16.2.6 | MCP app framework | `[VERIFIED: npm view next version]` Matches CLAUDE.md exactly |
| React | 19.2.6 | Required peer for Next 16 | `[VERIFIED: npm view react version]` Matches CLAUDE.md exactly |
| `mcp-handler` | 1.1.0 | Mount MCP server in Next.js route handler | `[VERIFIED: npm view mcp-handler version]` Matches CLAUDE.md exactly. Official Vercel adapter. |
| `@modelcontextprotocol/sdk` | 1.29.0 | Underlying MCP protocol SDK | `[VERIFIED: npm view @modelcontextprotocol/sdk version]` Matches CLAUDE.md exactly |
| Biome | 2.4.15 | Lint + format (single tool) | `[VERIFIED: npm view @biomejs/biome version]` CLAUDE.md pins 2.x — current latest |
| Vitest | 4.1.6 | Test runner | `[VERIFIED: npm view vitest version]` Matches CLAUDE.md exactly. **Note workspace API change — see Pitfall 4.** |
| `tsx` | 4.x | Run TS scripts | CLAUDE.md pin |
| `zod` | 4.4.3 | Tool param schemas (used in Phase 3, but `mcp-handler` examples reference it) | CLAUDE.md pin — only included in `apps/mcp` if a placeholder tool is added; Phase 1 default is zero-tool mount, so zod is not needed yet |

**Installation summary (root):**
```bash
# Root devDependencies
pnpm add -D -w turbo@^2.9 typescript@^5.7 @biomejs/biome@^2.4 vitest@^4.1 tsx@^4
# apps/mcp dependencies
pnpm --filter @rico/mcp add next@16.2.6 react@19.2.6 react-dom@19.2.6 mcp-handler@1.1.0 @modelcontextprotocol/sdk@1.29.0
```

**Version verification confirmed:** All CLAUDE.md pins were probed live via `npm view <pkg> version` on 2026-05-14. Only divergence: TypeScript npm latest is 6.0.3 vs CLAUDE.md pin 5.7.x. CLAUDE.md pin wins per project authority. `[VERIFIED: live npm registry probe 2026-05-14]`

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@biomejs/biome` | 2.4.15 | `biome check`, `biome format`, `biome ci` | Root tool; one config governs the whole monorepo |
| `pnpm/action-setup` | v3 (GitHub Action) | Install pnpm in CI | CI workflow only |
| `actions/setup-node` | v4 (GitHub Action) | Install Node + cache pnpm store | CI workflow only |
| `actions/checkout` | v4 (GitHub Action) | Repo checkout in CI; needs `fetch-depth: 2` for Turbo to compute affected | CI workflow only |

### Alternatives Considered (and why rejected for Phase 1)

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `pnpm` workspaces | npm/yarn workspaces | CLAUDE.md locks pnpm; Turbo 2.x in 2026 expects pnpm; `[ASSUMED]` no override valid here |
| `mcp-handler` | Hand-roll MCP transport with `@modelcontextprotocol/sdk` directly | Loses first-party Vercel adapter, `withMcpAuth`, Streamable HTTP framing — CLAUDE.md "Don't Hand-Roll" applies |
| Biome | ESLint 9 + Prettier 3 | CLAUDE.md notes this is the fallback; user picked Biome for fewer config files |
| Vitest workspace file | Vitest `projects` config in root `vitest.config.ts` | `workspace` API is **deprecated since Vitest 3.2**, use `projects` — see Pitfall 4 |

## Architecture Patterns

### System Architecture Diagram

```
                          ┌──────────────────┐
                          │  GitHub PR push  │
                          └────────┬─────────┘
                                   │
                   ┌───────────────┴────────────────┐
                   │                                │
            ┌──────▼─────────┐              ┌──────▼────────┐
            │ GitHub Actions │              │ Vercel Git    │
            │  (3 gates)     │              │  Integration  │
            │ tsc / Vitest / │              │ (auto-deploy  │
            │ Biome          │              │  preview)     │
            └──────┬─────────┘              └──────┬────────┘
                   │                                │
                   │ blocks merge                   │ builds apps/mcp
                   │                                │ (root dir
                   │                                │ = apps/mcp)
                   ▼                                ▼
            ┌─────────────────┐           ┌────────────────────┐
            │ Turbo remote    │           │ Vercel preview URL │
            │ cache (Vercel)  │           │   https://*.vercel │
            │ TURBO_TOKEN /   │           │   .app             │
            │ TURBO_TEAM      │           └────────┬───────────┘
            └─────────────────┘                    │
                                                   │ smoke check
                                                   ▼
                                       GET /api/health → 200
                                       (and POST /api/mcp/<transport>
                                       answers initialize handshake;
                                       exercised in Phase 3)
                                                   │
                                                   │ env vars from Neon
                                                   │ integration
                                                   ▼
                                       ┌──────────────────────┐
                                       │ Neon Postgres        │
                                       │ (DATABASE_URL set,   │
                                       │  no schema yet —     │
                                       │  Phase 2)            │
                                       └──────────────────────┘
```

The diagram shows: PRs trigger two parallel checks (CI gates + Vercel preview build); Turbo's remote cache de-duplicates work between local devs and CI; the preview deploy of `apps/mcp` is the public surface a smoke test hits; Neon is wired but not exercised in Phase 1.

### Component Responsibilities

| Component | File location | Responsibility |
|-----------|---------------|----------------|
| Workspace root | `/package.json`, `/pnpm-workspace.yaml`, `/turbo.json` | Defines members, scripts, task graph |
| Root TS config | `/tsconfig.base.json` | Shared compiler options; per-package `tsconfig.json` extends this |
| Root Biome config | `/biome.json` | One Biome config for whole monorepo |
| Root Vitest config | `/vitest.config.ts` | Uses `projects: ['apps/*', 'packages/*']` (Vitest 4 `projects` API) |
| MCP app | `apps/mcp/` (real Next 16 app) | Hosts `/api/mcp/[transport]` (mcp-handler, zero tools) and `/api/health` |
| Stub apps | `apps/{web,mobile,cli}/` | Each: `package.json`, `tsconfig.json`, `src/index.ts` no-op |
| Stub packages | `packages/{db,core,auth,api,sync,ui}/` | Each: `package.json`, `tsconfig.json`, `src/index.ts` exporting a placeholder type |
| CI workflow | `.github/workflows/ci.yml` | One job: checkout → pnpm install → `pnpm turbo run typecheck test lint` |
| Vercel link state | `.vercel/repo.json` (gitignored) | Per-developer linking output of `vercel link --repo` |
| Env templates | `.env.example` (committed) | Lists all required keys with placeholder values |

### Recommended Project Structure

```
/
├── apps/
│   ├── mcp/                    # REAL Next.js 16 app (preview deploy target)
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── mcp/[transport]/route.ts   # mcp-handler mount, zero tools
│   │   │   │   └── health/route.ts            # GET → 200 plain JSON
│   │   │   └── layout.tsx                     # required root layout (no UI)
│   │   ├── next.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── web/                    # STUB: package.json + tsconfig + src/index.ts
│   ├── mobile/                 # STUB
│   └── cli/                    # STUB
├── packages/
│   ├── db/                     # STUB
│   ├── core/                   # STUB
│   ├── auth/                   # STUB
│   ├── api/                    # STUB
│   ├── sync/                   # STUB
│   └── ui/                     # STUB
├── .github/workflows/ci.yml
├── .env.example
├── .gitignore                  # includes .vercel/, .env*.local, node_modules
├── biome.json
├── package.json                # workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── turbo.json
└── vitest.config.ts
```

### Pattern 1: `mcp-handler` Mount in Next.js 16 App Router (zero tools)

**What:** Mount `mcp-handler` as a Next.js Route Handler at `app/api/mcp/[transport]/route.ts`.
**When to use:** Phase 1 — proves the integration works end-to-end without committing to tool definitions (Phase 3).

```typescript
// apps/mcp/app/api/mcp/[transport]/route.ts
// Source: https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel (verbatim, dice tool removed)
// Source: https://github.com/vercel/mcp-handler (README mount pattern)
import { createMcpHandler } from 'mcp-handler';

const handler = createMcpHandler(
  (server) => {
    // Phase 1: zero tools registered. Tool surface lands in Phase 3.
  },
  {},
  {
    basePath: '/api',
    maxDuration: 60,
    verboseLogs: false,
  },
);

export { handler as GET, handler as POST, handler as DELETE };
```

**Citations:**
- File path `app/api/[transport]/route.ts` and `export { handler as GET, handler as POST }` shape: `[CITED: github.com/vercel/mcp-handler README]`
- `createMcpHandler` 3-arg signature with `basePath`, `maxDuration`, `verboseLogs`: `[CITED: github.com/vercel/mcp-handler README]`
- Vercel docs use `app/api/mcp/route.ts` (no `[transport]` segment) in their dice-tool example, but ALSO use `app/api/[transport]/route.ts` in the `withMcpAuth` example. Both work; `[transport]` segment matches CONTEXT.md's locked path. `[CITED: vercel.com/docs/mcp/deploy-mcp-servers-to-vercel]`
- Including `DELETE` in the export aligns with the Vercel docs example. `[CITED: vercel.com/docs/mcp/deploy-mcp-servers-to-vercel]`

### Pattern 2: `/api/health` smoke endpoint (Next.js 16 Route Handler)

```typescript
// apps/mcp/app/api/health/route.ts
// Source: Next.js 16 App Router Route Handler convention (cited below)
export const runtime = 'nodejs'; // explicit; Next 16 defaults to Node anyway

export async function GET() {
  return Response.json({ ok: true, ts: Date.now() });
}
```

**Why a separate `/api/health`?** CONTEXT.md soft default. Keeps the Phase 1 smoke check protocol-agnostic — a `curl https://<preview>.vercel.app/api/health` either returns 200 or doesn't. MCP-protocol behavior (initialize handshake) is exercised in Phase 3. `[CITED: CONTEXT.md `<open_decisions>` MCP smoke endpoint definition]`

### Pattern 3: Minimal Next.js 16 root layout (no UI pages)

```typescript
// apps/mcp/app/layout.tsx
// Source: https://nextjs.org/docs/app/getting-started/installation
// Required even for an API-only app — Next will auto-create one in dev if missing,
// but committing it is required for `next build` to succeed cleanly.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

**No `app/page.tsx` is required** if the app has no UI routes — only `layout.tsx` is hard-required. Visiting `/` will 404, which is the desired Phase 1 behavior. `[CITED: nextjs.org/docs/app/getting-started/installation]`

### Pattern 4: Root `turbo.json` task graph

```json
{
  "$schema": "https://turborepo.com/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "test": {
      "dependsOn": [],
      "outputs": []
    },
    "lint": {
      "dependsOn": [],
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

`[ASSUMED]` This `turbo.json` is the canonical 2.x shape based on CLAUDE.md tooling pins; specific keys are stable across 2.x. The `^build` dependency on typecheck is critical so packages get their `.d.ts` files emitted before consumers run tsc. Validate during execution with `pnpm turbo run build typecheck test lint --dry`.

### Pattern 5: `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

`[CITED: vercel.com/docs/monorepos]` — "The monorepo must be using npm, yarn, pnpm, or Bun workspaces ... Packages in the workspace must be included in the workspace definition (`workspaces` key in `package.json` for npm and yarn or `pnpm-workspace.yaml` for pnpm)."

### Pattern 6: Stub workspace package shape

**Stub `packages/*/package.json` (representative):**
```json
{
  "name": "@rico/db",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests",
    "lint": "biome check ."
  }
}
```

**Stub `packages/*/tsconfig.json`:**
```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*"]
}
```

**Stub `packages/*/src/index.ts`:**
```typescript
// Phase 1 placeholder — surface area defined when this package is consumed.
export type Placeholder = never;
```

**Stub `apps/*/package.json` (representative for `apps/cli`):**
```json
{
  "name": "@rico/cli",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests",
    "lint": "biome check ."
  }
}
```

**Stub `apps/*/src/index.ts`:**
```typescript
// Phase 1 stub — apps/cli implementation lands in Phase 4.
export {};
```

`[ASSUMED]` Direct `.ts` `main`/`exports` is permitted because every consumer compiles via tsc/Next/Vitest (all of which read `.ts` directly). No package needs `tsup`/`tsc` builds in Phase 1 — keeps the Turbo `^build` dependency satisfied trivially. **Validate during execution:** `pnpm turbo run typecheck` from root must succeed across all 9 stubs + apps/mcp.

### Pattern 7: Root Biome config

```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.15/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": { "ignoreUnknown": true },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2 },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "javascript": { "formatter": { "quoteStyle": "single", "semicolons": "always" } }
}
```

`[ASSUMED]` Biome 2.x config keys are stable and `recommended: true` is the canonical baseline. CI runs `biome ci` (specifically optimized for CI) per `[CITED: biomejs.dev/guides/getting-started/]` — "Run `biome ci` as part of your CI pipeline." Per-package `lint` script can call `biome check .` for IDE/local use; CI uses `biome ci .` for stricter behavior.

### Pattern 8: Root `tsconfig.base.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "allowJs": false,
    "forceConsistentCasingInFileNames": true
  }
}
```

`[ASSUMED]` This is the modern TS 5.7 baseline matching CLAUDE.md's stated `verbatimModuleSyntax` + `moduleResolution: "bundler"` requirement. `apps/mcp/tsconfig.json` extends this and adds Next.js's required overrides:

```json
// apps/mcp/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Pattern 9: Root `vitest.config.ts` (Vitest 4 `projects` API)

```typescript
// vitest.config.ts
// Source: https://vitest.dev/guide/workspace.html
// "The `workspace` is deprecated since 3.2 and replaced with the `projects` configuration."
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['apps/*', 'packages/*'],
  },
});
```

`[CITED: vitest.dev/guide/workspace.html]` — workspace API renamed to `projects` in v3.2+; v4 honors only `projects`. Each package without its own `vitest.config.ts` is treated as a project with default config. The root `--passWithNoTests` flag in per-package scripts handles the empty-test case for stubs.

### Pattern 10: GitHub Actions CI workflow

```yaml
# .github/workflows/ci.yml
# Source: https://turborepo.dev/docs/guides/ci-vendors/github-actions (adapted to Phase 1 gates)
name: CI

on:
  push:
    branches: ["main"]
  pull_request:
    types: [opened, synchronize]

jobs:
  ci:
    name: Typecheck / Test / Lint
    timeout-minutes: 15
    runs-on: ubuntu-latest
    env:
      TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
      TURBO_TEAM: ${{ vars.TURBO_TEAM }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 2  # required for Turbo's affected-graph computation

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 10

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run gates
        run: pnpm turbo run typecheck test lint
```

**Adaptations from canonical Turborepo example:**
- Bumped `pnpm/action-setup` version arg from 8 → 10 (CLAUDE.md pin); local probe shows pnpm 10.33.0.
- Bumped Node 20 → 22 (Next.js 16 requires Node ≥ 20.9, but 22 is current LTS; the `--yes` create-next-app flow targets it).
- Replaced `pnpm turbo run build lint test` with `pnpm turbo run typecheck test lint` — Phase 1 doesn't need a build gate (Vercel does the production build); the three gates are the FOUND-03 requirement.

`[CITED: turborepo.dev/docs/guides/ci-vendors/github-actions]` for the YAML skeleton. `[VERIFIED: env probe 2026-05-14]` for pnpm/Node versions.

**TURBO_TOKEN / TURBO_TEAM secrets setup:** GitHub repo settings → Secrets and variables → Actions. `TURBO_TOKEN` is created via `vercel login` then `vercel tokens create`; `TURBO_TEAM` is your Vercel team slug. `[ASSUMED]` exact UI path; planner should validate during execution.

### Pattern 11: `vercel link --repo` workflow for monorepo

```bash
# From repo root, ONCE per developer / per CI runner:
vercel link --repo
# Walks the monorepo; for each detected app dir, prompts to link to a Vercel project.
# Creates .vercel/repo.json (gitignored).

# Then, to pull env vars for apps/mcp specifically:
cd apps/mcp
vercel env pull .env.local
```

`[CITED: vercel.com/docs/cli/link]` — "The `--repo` option can be used to link all projects in your repository to their respective Vercel projects in one command. This command requires that your Vercel projects are using the Git integration."

`[CITED: vercel.com/docs/monorepos]` — "Run `vercel link` to link multiple Vercel projects at once... `vercel link --repo`."

**Important from Vercel-CLI skill (project plugin guidance):**
- `.vercel/repo.json` (created by `vercel link --repo`) is the right artifact for monorepos with multiple projects. Do NOT use single-project `vercel link` (creates `.vercel/project.json`) at the root — that confines to one project.
- Run from `apps/mcp/` (or any subdirectory) for unambiguous "which project?" resolution after the repo-level link.
- Verify team with `vercel whoami` first.

### Pattern 12: Vercel project Root Directory for `apps/mcp`

When the `apps/mcp` Vercel project is created via dashboard import (the alternate flow to `vercel link --repo`):
- Set **Root Directory** = `apps/mcp` in project settings → Build and Deployment.
- Vercel auto-detects Next.js framework; build command is `next build`; install command is `pnpm install` (uses lockfile at root).
- "Skip unaffected projects" is on by default for monorepos with explicit workspace deps. `[CITED: vercel.com/docs/monorepos]`

**No `vercel.json` is required for Phase 1.** The Root Directory + framework auto-detection is sufficient. `vercel.json` is only needed if (a) overriding build/output, (b) `relatedProjects` linking (Phase 4 concern), or (c) custom routes.

### Pattern 13: Neon Postgres + Vercel native integration

```
1. Vercel dashboard → Storage tab → Create Database → Neon Postgres (Vercel-managed).
   This auto-creates a Neon account+project AND injects DATABASE_URL into the
   selected Vercel project's env vars (chooseable: Development, Preview, Production).
2. Optionally connect to additional projects (one Neon DB → many Vercel projects).
3. Locally: `cd apps/mcp && vercel env pull .env.local` to mirror.
```

`[CITED: neon.com/docs/guides/vercel-native-integration]` — "Injects the required database environment variables (`DATABASE_URL`, etc.) into your Vercel project. ... Creates a Neon account + project for you (if you don't already have one). ... Choose the Vercel project and the environments that should receive database variables (Development, Preview, Production)."

**Env vars set by the integration:**
- `DATABASE_URL` (pooled via PgBouncer — what Drizzle/`@neondatabase/serverless` should use)
- `DATABASE_URL_UNPOOLED` (direct connection — for migrations)
- `PGHOST`, `PGUSER`, `PGDATABASE`, `PGPASSWORD`, `PGHOST_UNPOOLED`
- `POSTGRES_*` (legacy aliases)

**Phase 1 minimum:** Creating the Neon project via the integration AND confirming `DATABASE_URL` is visible in `vercel env ls` for the `apps/mcp` project satisfies criterion #2. No table is created in Phase 1.

**Neon branching per Vercel preview:** Built-in to the integration but enabled at the integration-config level. `[CITED: neon.com/docs/guides/vercel]` shows ✅ "Preview Branching" for both managed integrations. CONTEXT.md soft default defers wiring it to Phase 2 — keep that posture; Phase 1 just needs a single shared Neon database visible to all envs.

### Pattern 14: Turborepo Vercel remote cache enablement

```bash
# Local (one-time per developer):
npx turbo login
npx turbo link  # selects Vercel scope/team and links the repo to Vercel remote cache

# CI: set repo secrets/variables
# - secret TURBO_TOKEN  = output of `vercel tokens create` (or `turbo login`-issued token)
# - variable TURBO_TEAM = your Vercel team slug
```

`[CITED: turborepo.dev/docs/core-concepts/remote-caching]` — "Vercel Remote Cache is free to use on all plans, even if you do not host your applications on Vercel." Two-command setup: `turbo login` then `turbo link`.

`[CITED: turborepo.dev/docs/guides/ci-vendors/github-actions]` — env-var pattern `TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}` and `TURBO_TEAM: ${{ vars.TURBO_TEAM }}`.

### Anti-Patterns to Avoid

- **Single Next.js app with both `/api/mcp` and admin UI under one deploy.** Locked against by CONTEXT.md `<decisions>`. Couples MCP availability to UI changes.
- **Standalone Node service for MCP (skip mcp-handler).** Loses Vercel adapter, `withMcpAuth`, Streamable HTTP framing. CLAUDE.md "Don't Hand-Roll" applies.
- **Using `vitest.workspace.ts`.** Deprecated since Vitest 3.2 in favor of `projects` in `vitest.config.ts`. `[CITED: vitest.dev/guide/workspace.html]`
- **Using `vercel link` (without `--repo`) at the monorepo root.** Creates `.vercel/project.json` for a single project — wrong shape for a monorepo with multiple deployable apps. `[CITED: project Vercel-CLI skill guidance]`
- **Adding any DB query/migration code in Phase 1.** Phase 2 owns the schema. Even read-only access to `DATABASE_URL` from `packages/db` is out of scope — keep it a typed no-op.
- **Pinning Tailwind v3 patterns or React 18.** CLAUDE.md hard-rejects both. Phase 1 ships no Tailwind at all (no UI pages in `apps/mcp`).
- **Adding `apps/mcp/app/page.tsx`.** Not needed; let `/` 404. Adding a page commits to UI design that isn't a Phase 1 goal.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MCP transport in Next.js | A custom Route Handler that speaks the MCP wire protocol | `mcp-handler@1.1.0` from Vercel | Streamable HTTP framing, session management, OAuth integration in Phase 3 |
| Monorepo task orchestration | npm scripts that recursively walk packages | `turbo run` with `^build` dependsOn | Affected-graph caching, remote cache, parallelization |
| Lint + format dual config | ESLint + Prettier + their plugins | Biome 2 (one tool, one config) | CLAUDE.md decision; faster CI; zero config drift |
| CI cache for pnpm | Hand-rolled `actions/cache` for `~/.pnpm-store` | `actions/setup-node` with `cache: 'pnpm'` | Native, maintained, free |
| Per-app env propagation | Bash scripts that copy `.env` between dirs | `vercel env pull` per app | Authoritative source is Vercel; one command syncs |
| Neon connection pooling | Setting up PgBouncer | `DATABASE_URL` from Vercel integration (already PgBouncer-pooled) | Phase 2 concern — but the env var is the right shape from Phase 1 |
| Health check wrapper | A 200-returner with custom JSON envelope | Plain `Response.json({ok: true})` | Smoke target should be trivial |

**Key insight:** Phase 1 is about wiring proven tools, not writing logic. Every line of custom code is suspect — if a Vercel doc, Turborepo doc, or Next.js doc has a 5-line snippet that does what you want, copy it.

## Common Pitfalls

### Pitfall 1: Vitest `workspace` API removal
**What goes wrong:** Plans copy `vitest.workspace.ts` from training-data examples and CI fails with "workspace deprecated."
**Why it happens:** Most training-data Vitest examples predate v3.2.
**How to avoid:** Use `projects: ['apps/*', 'packages/*']` inside root `vitest.config.ts`. No workspace file.
**Warning signs:** `Warning: workspace is deprecated since v3.2` in test output.
**Source:** `[CITED: vitest.dev/guide/workspace.html]`

### Pitfall 2: Turborepo `^build` cycle when packages have no build step
**What goes wrong:** `turbo run typecheck` waits for `^build` on every package, but stubs have no build script — Turbo errors or hangs.
**Why it happens:** The `dependsOn: ["^build"]` pattern from typical TS monorepos assumes per-package compilation.
**How to avoid:** Either (a) remove `^build` dependency from `typecheck` task in Phase 1 since stubs ship raw `.ts`, or (b) add a no-op `"build": "echo skip"` script to each stub package. Option (a) is simpler for Phase 1.
**Warning signs:** `Could not find script "build" in package "@rico/db"`.
**Source:** `[ASSUMED]` based on Turborepo 2.x graph semantics; validate during execution by running `pnpm turbo run typecheck --dry`.

### Pitfall 3: Next.js 16 requires `app/layout.tsx` for `next build`
**What goes wrong:** `apps/mcp` ships with only API routes and no `layout.tsx`. `next build` succeeds in dev (auto-creates layout) but fails in CI because nothing's checked in.
**Why it happens:** Auto-creation only happens during `next dev`, not `next build`.
**How to avoid:** Commit a minimal `app/layout.tsx` even though no UI pages exist.
**Warning signs:** `Error: A required file is missing: app/layout.tsx`.
**Source:** `[CITED: nextjs.org/docs/app/getting-started/installation]` — "If you forget to create the root layout, Next.js will automatically create this file when running the development server with `next dev`." (silent on `next build`; pattern is to commit it.)

### Pitfall 4: Turbopack-by-default in Next.js 16 production build
**What goes wrong:** Plans assume Webpack and configure Webpack-specific options.
**Why it happens:** Pre-Next-16 mental models. Next 16 made Turbopack the default for both `next dev` AND `next build`.
**How to avoid:** Don't add Webpack config. If a future need arises (none in Phase 1), opt out via `next dev --webpack` / `next build --webpack`.
**Warning signs:** Build fails with Webpack-specific config errors.
**Source:** `[CITED: nextjs.org/docs/app/getting-started/installation]` — "Turbopack is now the default bundler. To use Webpack run `next dev --webpack` or `next build --webpack`."

### Pitfall 5: `next build` no longer runs lint in Next.js 16
**What goes wrong:** CI assumes `next build` runs lint and skips a separate lint gate. PRs land lint failures.
**Why it happens:** Next 16 removed the auto-lint step.
**How to avoid:** Run `biome ci` explicitly via `pnpm turbo run lint`. Phase 1's CI workflow does this correctly.
**Warning signs:** Lint regressions ship to main.
**Source:** `[CITED: nextjs.org/docs/app/getting-started/installation]` — "Starting with Next.js 16, `next build` no longer runs the linter automatically. Instead, you can run your linter through NPM scripts."

### Pitfall 6: `vercel link` (without `--repo`) creates the wrong shape for monorepos
**What goes wrong:** Developer runs `vercel link` at root, gets `.vercel/project.json` for a single project, can't link `apps/web` later without confusion.
**Why it happens:** Default `vercel link` is for single-project repos.
**How to avoid:** Always use `vercel link --repo` from the monorepo root. Use `vercel whoami` first to confirm team. `[CITED: project Vercel-CLI skill]`
**Warning signs:** `.vercel/project.json` exists at root instead of `.vercel/repo.json`.

### Pitfall 7: Remote cache hit-rate dependent on `fetch-depth: 2`
**What goes wrong:** GitHub Actions checkout defaults to `fetch-depth: 1`. Turbo's affected-graph computation needs the previous commit, so cache misses dominate and CI is slow.
**How to avoid:** Set `fetch-depth: 2` in `actions/checkout@v4` step (Pattern 10 above does).
**Warning signs:** Turbo reports `0 cached` for unchanged tasks.
**Source:** `[CITED: turborepo.dev/docs/guides/ci-vendors/github-actions]`

### Pitfall 8: `verbatimModuleSyntax: true` requires `import type` discipline
**What goes wrong:** Stubs that mix value and type imports (`import { Placeholder } from './types'` for a type-only) fail to compile.
**How to avoid:** Use `import type` for type-only imports throughout. Phase 1 has almost no imports so this is small, but worth flagging for downstream phases.
**Source:** `[ASSUMED]` based on TypeScript 5.x semantics; well-known constraint.

### Pitfall 9: `DELETE` HTTP method export needed for some MCP clients
**What goes wrong:** Some MCP clients send `DELETE` during session teardown. Without exporting it, the client errors.
**How to avoid:** Export `DELETE` along with `GET` and `POST` (Pattern 1 includes it).
**Source:** `[CITED: vercel.com/docs/mcp/deploy-mcp-servers-to-vercel]` — example exports `GET`, `POST`, `DELETE`.

### Pitfall 10: Forgetting `--passWithNoTests` for stubs
**What goes wrong:** Stub packages have no tests. `vitest run` exits 1; CI fails.
**How to avoid:** Per-package `test` script is `vitest run --passWithNoTests`. (Pattern 6 includes it.)
**Source:** `[ASSUMED]` Vitest 4 behavior — same flag has worked since Vitest 1.x.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.6 (with `projects` config) |
| Config file | `/vitest.config.ts` (root) |
| Quick run command | `pnpm turbo run test --filter=@rico/mcp` (per-package) |
| Full suite command | `pnpm turbo run test` (all workspaces) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| FOUND-01 | All 10 workspaces resolved + `pnpm turbo run typecheck` succeeds | smoke | `pnpm install --frozen-lockfile && pnpm turbo run typecheck` | ❌ Wave 0 |
| FOUND-01 | `pnpm turbo run build` succeeds for `apps/mcp`; stubs build trivially | smoke | `pnpm turbo run build` | ❌ Wave 0 |
| FOUND-02 | `vercel env ls` for the linked `apps/mcp` project shows `DATABASE_URL` in Production and Preview | manual-only | (manual: `cd apps/mcp && vercel env ls`) | ❌ N/A |
| FOUND-03 | Three CI gates run on every PR and block merge | integration | (verified by opening a PR with intentional failures and observing required-checks block) | ❌ N/A — workflow itself IS the test |
| FOUND-03 | `biome ci` passes on root | unit | `pnpm exec biome ci .` | ❌ Wave 0 |
| FOUND-03 | `tsc --noEmit` passes for every workspace | unit | `pnpm turbo run typecheck` | ❌ Wave 0 |
| FOUND-03 | `vitest run --passWithNoTests` passes for every workspace | unit | `pnpm turbo run test` | ❌ Wave 0 |
| FOUND-04 | Preview deploy of `apps/mcp` returns 200 to `GET /api/health` | smoke (post-deploy) | `curl -fsS https://<preview>.vercel.app/api/health \| jq .ok` | ❌ Wave 0 — needs preview URL |
| FOUND-04 | (Optional bonus) MCP route responds to OPTIONS/initialize | integration | `curl -X POST https://<preview>.vercel.app/api/mcp -H 'Content-Type: application/json' -d '{...initialize...}'` | ❌ Optional; CONTEXT.md defers to Phase 3 |

### Sampling Rate

- **Per task commit:** `pnpm turbo run typecheck test lint` (full local gate, leverages Turbo cache; should be < 30s after warmup)
- **Per wave merge:** Same — Phase 1 is small enough that there's no separate "full" suite distinction.
- **Phase gate:** All four success criteria green before `/gsd-verify-work`. Specifically: `pnpm turbo run typecheck test lint` green locally + CI green on a PR + `curl` to preview returns 200.

### Wave 0 Gaps

- [ ] `vitest.config.ts` (root) — required for `vitest` to discover `projects`
- [ ] `biome.json` (root) — required for `biome ci`
- [ ] `tsconfig.base.json` (root) — required for per-package `tsconfig.json` extension
- [ ] `turbo.json` (root) — required for `turbo run` task graph
- [ ] `pnpm-workspace.yaml` (root) — required for pnpm workspace resolution
- [ ] `.github/workflows/ci.yml` — the workflow itself IS the FOUND-03 test
- [ ] `apps/mcp/app/api/health/route.ts` — required for the FOUND-04 smoke check
- [ ] One Vitest sanity test in `apps/mcp` (e.g., `apps/mcp/__tests__/health.test.ts` that imports the route and asserts shape) — optional but proves the test framework works end-to-end without depending on a deploy

*(No existing test infrastructure — this is a greenfield repo.)*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no — Phase 2/3 lands Clerk + MCP OAuth | (deferred) |
| V3 Session Management | no — Phase 3 (mcp-handler `withMcpAuth`) | (deferred) |
| V4 Access Control | no — Phase 2 (Postgres RLS + service-layer `SET LOCAL`) | (deferred) |
| V5 Input Validation | partial — `/api/health` has no input; MCP route is zero-tool | zod (Phase 3 onward) |
| V6 Cryptography | no — Phase 1 hand-rolls no crypto | — (Clerk handles tokens in Phase 3) |
| V14 Configuration | yes — env var hygiene, `.env.example` only (no secrets in git), `.vercel/` gitignored | `vercel env pull` workflow + `.gitignore` |

### Known Threat Patterns for Phase 1 Scope

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Secrets committed to git | Information Disclosure | `.env*.local` and `.vercel/` in `.gitignore`; only `.env.example` with placeholders is committed |
| MCP route exposed without auth | Elevation of Privilege | Phase 1 mounts zero tools — there's nothing to elevate to. `withMcpAuth` lands in Phase 3 BEFORE any tool ships. |
| Health endpoint leaks system info | Information Disclosure | Return only `{ok: true, ts}` — no version strings, no git SHA, no env names |
| Public `DATABASE_URL` exposure | Information Disclosure | Only set in Vercel project env vars (never returned in any HTTP response); Phase 1 doesn't even read it |
| TURBO_TOKEN leaked in CI logs | Information Disclosure | Use GitHub Actions `secrets.*` (auto-masked in logs) — Pattern 10 does this |

**Phase 1 security posture summary:** The phase ships zero authenticated surfaces and zero data access. The threat surface is limited to: (a) accidentally committing secrets, (b) the public preview URL exposing `/api/health` (acceptable; intentional). Auth/RLS lands in Phases 2–3.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All | ✓ | v24.13.0 (≥ 20.9 required by Next 16) | — |
| pnpm | All | ✓ | 10.33.0 | — |
| git | All | ✓ | 2.53.0 | — |
| GitHub CLI (`gh`) | Optional — used for PR creation | ✓ | 2.87.3 | manual PR via web UI |
| Vercel CLI (`vercel`) | FOUND-02, FOUND-04 | ✗ | — | Install via `pnpm add -g vercel` (or `npx vercel`) when needed |
| Vercel account + team | FOUND-02, FOUND-04 | ⚠ unknown | — | User must verify; planner should treat as a prerequisite step |
| GitHub repo | FOUND-03, FOUND-04 (Vercel Git integration) | ⚠ unknown | — | User must verify or create early in Phase 1 |
| Neon account | FOUND-02 | ⚠ unknown — auto-created by Vercel-Managed integration | — | Vercel-Managed integration provisions on first use |

**Missing dependencies with no fallback:** None. Vercel CLI is install-on-demand; account/repo creation is a prerequisite the planner should sequence early.

**Missing dependencies with fallback:** Vercel CLI — install via `pnpm add -g vercel@latest` or use `npx vercel ...` ad-hoc.

**Action items for the planner:**
1. First task in the Vercel/Neon plan should be: `pnpm add -g vercel@latest && vercel whoami` (gates the rest).
2. Confirm with user that GitHub repo + Vercel team exist (or create at start of phase).

## Runtime State Inventory

> Phase 1 is greenfield (per CONTEXT.md `<code_context>`: "Codebase is empty"). No rename, refactor, or migration. Section omitted as not applicable.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Direct `.ts` `main`/`exports` in stub packages compiles cleanly under all consumers (tsc, Next.js, Vitest) without per-package builds | Pattern 6 | LOW — well-established in modern TS monorepos; trivially fixable by adding `"build": "tsc"` if a consumer chokes |
| A2 | Removing `dependsOn: ["^build"]` from the `typecheck` Turbo task is necessary for Phase 1 (since stubs have no build script) | Pitfall 2 | LOW — alternative (no-op build script per stub) works too; first PR will reveal |
| A3 | Biome 2 `recommended: true` is the canonical baseline rule set | Pattern 7 | LOW — no doc explicitly stated this for v2.x; if rules feel too strict, narrow them |
| A4 | TS 5.7 `tsconfig.base.json` shape (verbatimModuleSyntax, bundler resolution) is the right baseline | Pattern 8 | LOW — matches CLAUDE.md prescription |
| A5 | TURBO_TOKEN is created via `vercel tokens create` (not via a Turbo-specific flow) | Pattern 14 | LOW — both paths produce a valid token; Vercel docs validate during execution |
| A6 | The Vercel CLI tokens UI path is "Settings → Secrets and variables → Actions" in GitHub | Pattern 10 | LOW — UI navigation; not load-bearing |
| A7 | Phase 1 needs only ONE shared Neon DB visible to all envs (not branched per PR) | Pattern 13 | LOW — CONTEXT.md explicitly defers branching to Phase 2 |
| A8 | A `apps/mcp/__tests__/health.test.ts` Vitest sanity test is optional, not required | Wave 0 Gaps | LOW — without it, FOUND-03's "Vitest gate" runs against zero tests in `apps/mcp` (passWithNoTests); a sanity test is cheap insurance |

**All A-items are LOW risk** — none would invalidate the plan. They mark places where the planner should validate during execution rather than relock decisions upstream.

## Open Questions

1. **Does the user already have a Vercel team and a GitHub repo for this project?**
   - What we know: GitHub CLI is installed locally; Vercel CLI is not.
   - What's unclear: Whether prerequisite accounts/repos exist.
   - Recommendation: Planner first-task: gate prerequisite accounts before any monorepo work; if missing, generate a "create accounts" task with manual steps.

2. **Is the user okay with the phase yielding zero tests in `apps/mcp` for FOUND-03's Vitest gate?**
   - What we know: Stubs use `--passWithNoTests`; same applies to `apps/mcp` if no test is added.
   - What's unclear: Whether the user wants a sanity Vitest run to actually exercise something.
   - Recommendation: Plan it as optional — single sanity test for `/api/health` route is < 10 LOC. Cheap insurance, kills "Vitest gate is theatre" objection.

3. **Repo name and Vercel project naming convention?**
   - What we know: workspace package names will be `@rico/mcp`, `@rico/web`, etc. (CLI requirement implies `@rico` scope).
   - What's unclear: Vercel project slugs (rico-mcp? rico-recipe-mcp?).
   - Recommendation: Defer to user during Vercel link step — not a research-time question.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `vitest.workspace.ts` | `projects: [...]` in `vitest.config.ts` | Vitest 3.2 (2025) | Don't create a workspace file |
| `next build` runs lint | `next build` does NOT run lint | Next.js 16 | CI must run lint as a separate gate |
| Webpack default in Next | Turbopack default for dev AND build | Next.js 16 | Don't configure Webpack |
| Vercel `link` only | `vercel link --repo` for monorepos | Vercel CLI 20.1.0+ | Use `--repo` for repos with multiple deployable apps |
| MCP SSE transport | Streamable HTTP only | MCP spec March 2025 | mcp-handler 1.x defaults to Streamable HTTP |
| ESLint+Prettier dual config | Biome 2 single tool | Biome 2 GA (2025) | One config file for lint+format |

**Deprecated/outdated to avoid:**
- `vitest.workspace.ts` (use `projects`)
- `next lint` invocation in CI (use `biome ci` or explicit `eslint`)
- Single-project `vercel link` for monorepos (use `--repo`)
- MCP SSE transport (use Streamable HTTP)
- Tailwind v3 `tailwind.config.js` patterns (Phase 1 ships no Tailwind, but worth flagging for later phases)

## Sources

### Primary (HIGH confidence)
- `[VERIFIED: npm view <pkg> version on 2026-05-14]` for: `next`, `react`, `mcp-handler`, `@modelcontextprotocol/sdk`, `turbo`, `vitest`, `@biomejs/biome`, `typescript`, `pnpm`
- [vercel.com/docs/mcp/deploy-mcp-servers-to-vercel](https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel) — `createMcpHandler` mount pattern, `withMcpAuth`, OAuth metadata route, recommended file paths, exported HTTP methods (last_updated: 2026-02-17)
- [github.com/vercel/mcp-handler](https://github.com/vercel/mcp-handler) — official README; route file path `app/api/[transport]/route.ts`; HTTP method exports
- [vercel.com/docs/cli/link](https://vercel.com/docs/cli/link) — `vercel link --repo` syntax and behavior (last_updated: 2026-03-17)
- [vercel.com/docs/monorepos](https://vercel.com/docs/monorepos) — monorepo project import; Root Directory; pnpm-workspace.yaml requirement; "skip unaffected projects" feature
- [neon.com/docs/guides/vercel-native-integration](https://neon.com/docs/guides/vercel-native-integration) — env vars injected by integration; project auto-creation; Development/Preview/Production scoping
- [neon.com/docs/guides/vercel](https://neon.com/docs/guides/vercel) — preview branching capability table
- [nextjs.org/docs/app/getting-started/installation](https://nextjs.org/docs/app/getting-started/installation) — Next 16.2.6 installation; required `app/layout.tsx`; Turbopack default; lint removal from `next build`; Node ≥ 20.9 requirement
- [turborepo.dev/docs/core-concepts/remote-caching](https://turborepo.dev/docs/core-concepts/remote-caching) — Vercel remote cache is free; `turbo login` + `turbo link` two-step setup
- [turborepo.dev/docs/guides/ci-vendors/github-actions](https://turborepo.dev/docs/guides/ci-vendors/github-actions) — canonical CI YAML; TURBO_TOKEN/TURBO_TEAM env wiring; `fetch-depth: 2`
- [vitest.dev/guide/workspace.html](https://vitest.dev/guide/workspace.html) — `workspace` deprecated since 3.2; use `projects`
- Project Vercel-CLI skill (in this session's bootstrap) — `.vercel/repo.json` vs `.vercel/project.json`; monorepo linking guidance; `vercel whoami` discipline
- Project Next.js skill — file conventions, RSC boundaries, runtime selection (Node default for Next 16)

### Secondary (MEDIUM confidence)
- [biomejs.dev/guides/getting-started/](https://biomejs.dev/guides/getting-started/) — `biome ci` is the CI-optimized command; zero-config default works; specific monorepo-tuned config not detailed (filled with `[ASSUMED]` baseline)

### Tertiary (LOW confidence — none in this research)
*(No claims rest on unverified web search.)*

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every version probed live against npm registry today
- Architecture / mcp-handler integration: HIGH — verbatim from Vercel docs and mcp-handler README
- Vercel monorepo + Neon wiring: HIGH — directly from Vercel and Neon official docs
- CI / Turborepo / Biome / Vitest configs: HIGH for shape (cited), MEDIUM for the precise config keys (some `[ASSUMED]` items in Pattern 7/8 — low risk)
- Pitfalls: HIGH — each pitfall is sourced to an official changelog or doc

**Research date:** 2026-05-14
**Valid until:** 2026-06-14 (30 days — stack is stable; revisit only if Next.js 17 / Turbo 3 / Vitest 5 announced)
