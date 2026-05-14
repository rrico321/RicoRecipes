# Walking Skeleton — Rico Recipe

**Phase:** 1
**Generated:** 2026-05-14

## Capability Proven End-to-End

A request from any browser on the public internet to `https://<vercel-preview-url>/api/health` reaches the deployed `apps/mcp` Next.js 16 app on Vercel and returns HTTP 200 with `{ok: true, ts: <number>}` — proving the entire delivery pipeline (monorepo build → CI gates → Git-triggered Vercel deploy → live HTTPS endpoint) works end-to-end.

> Honest disclosure on the "DB read/write" leg: Phase 1 ships zero database read/write paths by design — Phase 2 owns the schema (per ROADMAP.md and CONTEXT.md). This skeleton's "Database" leg is therefore satisfied by **provisioning Neon via the Vercel-Managed integration and confirming `DATABASE_URL` is propagated to all three Vercel env scopes (Development, Preview, Production)**. No code reads it yet. Phase 2's first migration is the first real DB read/write and will land on this same wiring without renegotiating it.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Monorepo orchestrator | Turborepo 2.9.x + pnpm 10.x workspaces (`apps/*`, `packages/*`) | CLAUDE.md lock; Vercel-native; free remote cache; required for Next + Expo + CLI in one repo |
| Workspace layout | `apps/{mcp,web,mobile,cli}` + `packages/{db,core,auth,api,sync,ui}` (FOUND-01 verbatim) | Locked by REQUIREMENTS.md; matches the surface plan from ROADMAP (mcp now, web/cli Phase 4, mobile Phase 5) |
| Stub policy | Every workspace except `apps/mcp` ships as a 3-file stub (`package.json`, `tsconfig.json`, `src/index.ts`) | CONTEXT.md decision: Phase 1 proves the pipeline, not the products; thin stubs let `pnpm turbo build` pass honestly without committing to Phase 4/5 design choices |
| Web framework (mcp) | Next.js 16.2.6 + React 19.2.6, App Router only, Turbopack default for dev AND build | CLAUDE.md lock; required peers; Turbopack changes confirmed by RESEARCH.md against nextjs.org |
| MCP transport mount | `mcp-handler@1.1.0` at `app/api/mcp/[transport]/route.ts`, exporting GET/POST/DELETE, zero tools registered | CONTEXT.md soft default (confirmed): proves the Vercel adapter integration without committing to Phase 3's tool definitions; DELETE included per RESEARCH.md Pitfall 9 |
| Smoke endpoint | Separate `GET /api/health` returning `{ok: true, ts}` on Node runtime | CONTEXT.md soft default (confirmed): keeps FOUND-04 protocol-agnostic — a plain `curl` either returns 200 or doesn't; MCP-protocol behavior is Phase 3's eval |
| MCP/web split | `apps/mcp` and `apps/web` are two separate Next.js apps deployed to two separate Vercel projects | CONTEXT.md decision: independent blast radius (a bad web push must not take down MCP for Claude Desktop users — the v1 user base) |
| Auth | Deferred to Phase 2 (Clerk sign-in) and Phase 3 (`withMcpAuth` + Clerk MCP OAuth provider for the MCP route) | CONTEXT.md scope; safe because Phase 1 mounts ZERO MCP tools — there is nothing to authorize against |
| Data layer | Neon Postgres (Vercel-Managed integration); Drizzle ORM + `@neondatabase/serverless@1.1.0` driver — schema lands Phase 2 | CLAUDE.md lock; Phase 1 only confirms `DATABASE_URL` propagated; Phase 2 ships migration 0001 with RLS |
| Deployment target | Vercel — one project per deployable app, linked via `vercel link --repo` (creates `.vercel/repo.json`); Root Directory = `apps/mcp` | CONTEXT.md soft default (confirmed); RESEARCH.md Pattern 11/12; matches project Vercel-CLI skill guidance for monorepos |
| CI | GitHub Actions running `pnpm turbo run typecheck test lint` on every PR; Node 22 + pnpm 10; `actions/checkout@v4` with `fetch-depth: 2` | FOUND-03 + RESEARCH.md Pattern 10; `fetch-depth: 2` required for Turbo affected-graph (Pitfall 7) |
| Lint + format | Biome 2.4.x as the single tool (no ESLint, no Prettier) | CLAUDE.md lock; one config file; faster CI |
| Test runner | Vitest 4.1.x with `projects: ['apps/*', 'packages/*']` in root `vitest.config.ts` (NOT `vitest.workspace.ts`) | CLAUDE.md lock; RESEARCH.md Pitfall 1: workspace API is deprecated since v3.2 |
| TypeScript | 5.7.x with `verbatimModuleSyntax`, `moduleResolution: bundler`, `strict`, `noUncheckedIndexedAccess` in `tsconfig.base.json` | CLAUDE.md lock; modern baseline; per-package `tsconfig.json` extends |
| Env distribution | Vercel is the source of truth; `vercel env pull .env.local` in `apps/mcp/`; `.env.example` committed at root with placeholders; `.env*.local` and `.vercel/` gitignored | CONTEXT.md soft default (confirmed); zero extra tooling |
| Turbo remote cache | Enabled from day one via Vercel remote cache (free); CI uses `TURBO_TOKEN` secret + `TURBO_TEAM` repo variable | CONTEXT.md soft default (confirmed); RESEARCH.md Pattern 14 |
| Stub package shape | Direct `.ts` `main`/`exports` (no per-package build step in Phase 1); turbo `typecheck` task does NOT depend on `^build` | RESEARCH.md Pattern 6 + Pitfall 2; tsc/Next/Vitest all read .ts directly; avoids stub `build` script noise |
| Neon branching | Deferred to Phase 2 (lands alongside RLS isolation tests that will need branch-per-PR) | CONTEXT.md soft default (confirmed); branching has setup cost that pays off only with DB tests |

## Stack Touched in Phase 1

- [x] **Project scaffold** — Turborepo + pnpm + TS 5.7 + Biome 2 + Vitest 4 (Plan 01)
- [x] **Routing** — `apps/mcp` Next 16 App Router with two real routes: `/api/health` and `/api/mcp/[transport]` (Plan 02)
- [x] **Database** — Neon provisioned via Vercel integration; `DATABASE_URL` propagated to Development/Preview/Production env scopes (Plan 03). **No reads/writes in code yet — Phase 2's migration 0001 lands the first real DB I/O.** This is an honest deviation from the standard skeleton checklist, justified by ROADMAP scope and CONTEXT.md decisions.
- [x] **UI / interactive element** — Phase 1 has no browser UI by design (`apps/web` is a stub; `apps/mcp` has no `app/page.tsx`). The "interactive element wired to the API" is satisfied by **public-internet HTTPS interaction** with the deployed API: `curl https://<preview>/api/health → 200` (Plan 03 checkpoint). The first real GUI lands in Phase 4 (`apps/web`); the first MCP-client interaction (Claude Desktop calling tools) lands in Phase 3.
- [x] **Deployment** — `apps/mcp` deployed to Vercel preview via Git integration on every PR (Plan 03); CI gates run on every PR via GitHub Actions (Plan 03)

## Out of Scope (Deferred to Later Slices)

These are intentionally NOT in the Phase 1 skeleton. Future phases must NOT re-litigate them:

- **Database schema, migrations, RLS, multi-tenancy** — entire Phase 2 (`DATA-01` through `DATA-06`)
- **Authentication on the MCP route** (`withMcpAuth`, Clerk MCP OAuth provider) — Phase 3 (`MCP-02`); safe because Phase 1 mounts zero tools
- **Clerk sign-in / sign-up + Clerk Organizations as households** — Phase 2 (`AUTH-01`, `AUTH-02`, `AUTH-03`)
- **Any MCP tool definitions** (`add_recipe`, `list_recipes`, etc.) — Phase 3 (`MCP-03` through `MCP-12`)
- **Web admin UI** (sign-in pages, recipe list, token management) — Phase 4 (`WEB-01` through `WEB-05`)
- **CLI implementation** (`rico` binary, commander setup, `@clack/prompts`) — Phase 4 (`CLI-01` through `CLI-07`)
- **Expo / iPhone app + PowerSync offline sync + EAS Build/Update** — Phase 5 (`PHONE-01` through `PHONE-07`)
- **Tailwind CSS / shadcn/ui** — first appears in Phase 4 (`apps/web`); `apps/mcp` ships zero CSS for the entire project lifetime
- **Neon branch-per-Vercel-preview** — Phase 2 (lands alongside RLS isolation tests that need it)
- **`vercel.json` overrides** — not needed in Phase 1; Root Directory + framework auto-detection is sufficient
- **Production custom domain** — Phase 4 (when there's a user-facing surface to attach it to); preview URLs suffice for FOUND-04
- **Vercel Deployment Protection on previews** — Phase 3 concern (when MCP tools start handling real data)
- **In-app LLM calls** — out of scope for the entire product per PROJECT.md; AI lives in the user's external Claude/ChatGPT subscription

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- **Phase 2 — Data Layer & Tenancy:** Drizzle migration 0001 lands `households`, `household_members`, `recipes`, `recipe_tags`, `recipe_notes`, `recipe_photos`, `outbox`; `FORCE ROW LEVEL SECURITY` on every tenant table; service-layer `SET LOCAL app.household_id`; cross-tenant isolation test; Clerk sign-in + Clerk Organization auto-created per signup; Neon branch-per-PR wired into CI. All built on the Phase 1 Vercel project + `DATABASE_URL` env wiring.
- **Phase 3 — MCP Server (primary v1 surface):** `withMcpAuth` wraps the Phase 1 mcp-handler mount; Clerk MCP OAuth (DCR + PKCE) is configured; the ten MCP tools (`add_recipe`, `update_recipe`, `delete_recipe`, `get_recipe`, `list_recipes`, `search_recipes`, `add_recipe_note`, `export_recipe`, plus list/search variants) are registered against the Phase 2 service layer; 10+ prompt eval suite verifies tool selection ≥ 90%; Claude Desktop CRUD round-trip against production-equivalent. The `app/api/mcp/[transport]/route.ts` file from Phase 1 is the same file — only the tool-registration callback grows.
- **Phase 4 — CLI + Tiny Web Admin:** `apps/cli` becomes a real commander + `@clack/prompts` binary; `apps/web` becomes a real Next.js 16 app on its own Vercel project (separate from `apps/mcp`); both consume the Phase 2 service layer through `packages/api` (tRPC v11). Personal access tokens issued by web; CLI authenticates with them. Same Phase 1 monorepo + CI + Turbo cache.
- **Phase 5 — iPhone Foundation + Offline Sync:** `apps/mobile` becomes a real Expo SDK 55 + Expo Router app; PowerSync replicates household-scoped recipes from Neon to on-device SQLite; airplane-mode browse + view; EAS Build to TestFlight; EAS Update OTA. App Store account-deletion path. Same Phase 1 monorepo + Phase 2 schema + Phase 3 auth posture.
