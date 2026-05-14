# Phase 1: Foundations — Context

**Date:** 2026-05-14
**Mode:** discuss (default)
**SPEC.md:** none
**Prior CONTEXT.md files:** none (first phase)

<domain>
Repo scaffolding, managed-service wiring, CI, and a deployable MCP target — proving the pipeline that all later phases plug into. Stack (Turborepo + pnpm, Next.js 16, Neon, Vercel, Biome, Vitest, mcp-handler) is locked upstream in PROJECT.md and CLAUDE.md. This phase decides HOW the monorepo is shaped, not WHAT tools to use.
</domain>

<canonical_refs>
- `/Users/robertrico/Desktop/rico_recipe/CLAUDE.md` — Authoritative stack table, version pins, and "what NOT to use" list. MUST read before planning.
- `.planning/PROJECT.md` — Core value, constraints, multi-tenancy posture (Phase 2 lands RLS, not here).
- `.planning/REQUIREMENTS.md` — FOUND-01..04 are the locked Phase 1 requirements.
- `.planning/ROADMAP.md` — Phase 1 success criteria (4 items).
- External: https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel — mcp-handler + Streamable HTTP guidance for the smoke endpoint.
- External: https://github.com/vercel/mcp-handler — `withMcpAuth`, Next.js route handler integration.

No project-local ADRs exist yet. Add this section as `.planning/adr/*` files appear.
</canonical_refs>

<code_context>
Codebase is empty — no existing files to scout, no `.planning/codebase/*` maps. Phase 1 is greenfield by definition. All structural choices are net-new.
</code_context>

<decisions>

### App scaffolding scope — **Thin stubs for all apps/packages, with apps/mcp as the one real Next.js app**

- Every workspace member listed in FOUND-01 (`apps/{mcp,mobile,cli,web}` + `packages/{db,core,auth,api,sync,ui}`) is created in Phase 1.
- All apps **except apps/mcp** ship as one-file stubs: `package.json`, `tsconfig.json` extending the root, and an `index.ts` (or equivalent entry) that compiles cleanly under `tsc --noEmit`. No frameworks initialized, no routes, no Expo / EAS config, no CLI commands. Their job in Phase 1 is to *exist as workspace members so future phases don't have to retrofit the monorepo*.
- All `packages/*` ship as thin packages: `package.json`, `tsconfig.json`, one `index.ts` exporting at most a typed no-op or a placeholder type. Names are locked by FOUND-01; surface area is deferred to the phase that consumes each package.
- **apps/mcp is a real Next.js 16 app** (the preview-deploy target). It is *not* a stub.

**Why:** Phase 1's goal is to prove the *pipeline* (workspace resolution, Turbo task graph, shared tsconfig, Biome, Vitest, CI gates, Vercel deploy) — not to design four products. Thin stubs let `pnpm turbo build` pass honestly against criterion #1 without committing to design decisions for `apps/web` (Phase 4) or `apps/mobile` (Phase 5) months early. Real shells would burn solo-dev time on app scaffolding that will rot or get redone. MCP-only (skipping the others) gives up the "monorepo plumbing is proven end-to-end" win and would require a roadmap amendment.

**Downstream implication for planner:** Plans should explicitly distinguish `apps/mcp` (real app, full work) from the stubs (templated, near-identical, parallelizable). Stub creation is likely 1–2 plans total covering all 9 stub workspaces; apps/mcp is its own plan.

### MCP app shape — **apps/mcp and apps/web are two separate Next.js apps, deployed independently**

- `apps/mcp` exposes only the MCP route handler (`/api/mcp/[transport]` via `mcp-handler`). No UI pages.
- `apps/web` (Phase 4) is its own Next.js app for the admin UI. Separate Vercel project, separate domain target.
- They share types/services through `packages/*`, not through co-location.

**Why:** (1) Roadmap dependency graph already separates them (Phase 3 vs Phase 4). (2) Independent blast radius — a bad web-admin push must not take down MCP for Claude Desktop users, who are the v1 user base. (3) `withMcpAuth` middleware is cleaner when MCP is the only routed concern in the app. (4) Maps to separate Vercel deployments and domains cleanly.

**Rejected:** Single Next.js app with `/api/mcp` + web admin under one deploy — couples MCP availability to unrelated UI changes and complicates the Phase 1 preview (web admin has no routes yet, so the preview "is" the MCP). Standalone Node service for MCP — loses mcp-handler's first-party Vercel adapter and `withMcpAuth` integration with Clerk's MCP OAuth provider, both load-bearing for Phase 3.

</decisions>

<open_decisions>

These gray areas were surfaced but the user chose not to discuss them in this session. Defaults below are Claude's recommendation grounded in CLAUDE.md and the stack constraints. Planner and researcher should treat these as **soft defaults — revisit if Phase 1 planning surfaces a reason to choose otherwise**, and explicitly call out the choice in PLAN.md.

### Vercel project layout — *default: separate Vercel project per deployable app*

- One Vercel project per deployable app (Phase 1: only `apps/mcp`). `apps/web` gets its own Vercel project in Phase 4.
- Use `vercel link --repo` at the repo root (monorepo-aware linking) so each app maps to its own project by directory.
- Reason: matches the "two separate Next.js apps" decision above; avoids Vercel Services complexity in Phase 1.

### MCP smoke endpoint definition — *default: mcp-handler mounted with zero tools, returns proper Streamable HTTP handshake*

- The Phase 1 "smoke health check" target is a `mcp-handler`-mounted route at `/api/mcp/[transport]` that responds to a Streamable HTTP initialize handshake successfully but exposes zero tools. The smoke test hits a simple `GET /api/health` (returns 200) for the criterion-4 check; MCP-protocol behavior is exercised in Phase 3.
- Reason: Proves the mcp-handler integration works at the framework level without committing to tool definitions (Phase 3 work). The separate `/api/health` route keeps the criterion-4 smoke check trivial and protocol-agnostic.

### CI gates & Neon branching — *default: GitHub Actions for tsc + Vitest + Biome; no Neon branching in Phase 1*

- GitHub Actions runs the three required gates (FOUND-03) on every PR. Vercel's built-in checks layer on top for deploy previews but are not the gating mechanism.
- No Neon branching in Phase 1 CI — tests are pure-unit until Phase 2 introduces the data layer. Neon-branch-per-PR wiring lands in Phase 2 alongside RLS isolation tests.
- Reason: Standard portable CI; Neon branching has setup cost that pays off only once there are DB tests to run.

### Env var workflow — *default: `vercel env pull` to `.env.local`, with `.env.example` committed*

- Local dev: `vercel env pull .env.local` after `vercel link`. `.env.example` is committed and lists every required key with placeholder values.
- Production/preview secrets live only in Vercel project settings.
- Reason: zero-extra-tooling, matches Vercel's intended workflow, solo-dev friendly.

### Turborepo remote cache — *default: enable from day 1 via Vercel remote cache*

- Turborepo's Vercel remote cache is free and enabling it costs nothing beyond `turbo login`.
- Reason: Cheap insurance for CI runtime; no reason to defer.

</open_decisions>

<deferred_ideas>

Nothing deferred from this session — discussion stayed inside Phase 1 scope.

</deferred_ideas>

<success_criteria_reminder>
From ROADMAP.md, Phase 1 is done when:
1. `pnpm install` + `pnpm turbo build` succeeds across all four apps and six packages.
2. Neon Postgres + Vercel are linked via `vercel link --repo` with env vars propagated to preview and prod.
3. Every PR triggers CI gates (tsc, Vitest, Biome) and blocks on failure.
4. A preview deploy of the MCP server URL responds 200 to a public smoke health check.

Decisions above ensure (1) is honest (thin stubs build), (4) is achievable in Phase 1 without overlapping Phase 3's MCP-tool work, and the structural choices (two Next apps, separate Vercel projects) match the roadmap's dependency graph.
</success_criteria_reminder>
