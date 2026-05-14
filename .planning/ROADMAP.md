# Roadmap: Rico Recipe

## Overview

Rico Recipe ships as a multi-surface recipe library whose **first user-facing surface is an MCP server consumed from Claude Desktop / ChatGPT**, with a CLI, tiny web admin, and native iPhone app (offline-capable) following. The app itself contains no LLM calls — all AI value lives in the user's external Claude/ChatGPT subscription via the MCP tool surface. v1 traverses five phases: (1) monorepo + infra foundations, (2) multi-tenant data layer with RLS from migration 0001, (3) MCP server as the primary v1 surface, (4) CLI + tiny web admin (utility surfaces), (5) native iPhone with PowerSync offline. Multi-tenancy (households + RLS) ships in Phase 2 even though v1 is single-user, because retrofitting tenancy is catastrophic. Offline iPhone sync ships WITH the iPhone phase, not after — offline is the dominant failure mode it prevents.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundations** - Monorepo + managed-service wiring + CI + first preview deploy
- [ ] **Phase 2: Data Layer & Tenancy** - Schema, RLS, Clerk-Org-as-Household, session-aware service layer
- [ ] **Phase 3: MCP Server (Primary v1 Surface)** - OAuth-secured remote MCP with 10 tools and a Claude Desktop round-trip
- [ ] **Phase 4: CLI + Tiny Web Admin** - `rico` CLI binary and minimal web for sign-in, view, tokens, account deletion
- [ ] **Phase 5: iPhone Foundation + Offline Sync** - Expo app with PowerSync, browse + offline, TestFlight, App Privacy

## Phase Details

### Phase 1: Foundations
**Goal**: Repository, hosting, CI, and a deployable MCP target exist end-to-end so all later phases plug into a working pipeline
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04
**Success Criteria** (what must be TRUE):
  1. Developer can clone the repo, run `pnpm install`, and `pnpm turbo build` succeeds across `apps/{mcp,mobile,cli,web}` and `packages/{db,core,auth,api,sync,ui}`
  2. A Neon Postgres project and a Vercel project are linked to the repo via `vercel link --repo`, with environment variables propagated to preview and production
  3. Every pull request triggers CI that runs typecheck (tsc), unit tests (Vitest), and lint (Biome) and blocks merge on failure
  4. A preview deploy of the MCP server URL responds 200 to a smoke health check from the public internet
**Plans**: 3 plans
  - [ ] 01-01-PLAN.md — Monorepo scaffold + 9 stub workspaces (root tooling, Turbo, Biome, Vitest, gitignore, env template, all stubs)
  - [ ] 01-02-PLAN.md — apps/mcp real Next.js 16 app (mcp-handler at /api/mcp/[transport], /api/health, Vitest sanity test)
  - [ ] 01-03-PLAN.md — CI + Vercel link + Neon link + Turbo remote cache + public preview smoke check

### Phase 2: Data Layer & Tenancy
**Goal**: A multi-tenant Postgres schema and authenticated service layer exist such that no surface — MCP, CLI, web, iPhone — can ever read or mutate another household's data
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, AUTH-01, AUTH-02, AUTH-03
**Success Criteria** (what must be TRUE):
  1. A user can sign up and sign in via Clerk (email/password + at least one OAuth provider) and is automatically placed into a Clerk Organization that represents their personal household
  2. Migration 0001 has shipped `households`, `household_members`, `recipes`, `recipe_tags`, `recipe_notes`, `recipe_photos`, and `outbox` tables — every tenant table carries `household_id`, `deleted_at`, `updated_at`, and `recipes.instructions` is `text[]`
  3. `FORCE ROW LEVEL SECURITY` is enabled on every tenant table and the service-layer context sets `app.household_id` per-request via `SET LOCAL` before any query
  4. An automated cross-household isolation test proves user A cannot read or mutate user B's recipes through the service layer (the test will be re-run against every future surface)
  5. A Clerk session persists across long-running clients (verified by a service-level test exercising token refresh), unblocking CLI and iPhone session reuse in later phases
**Plans**: TBD

### Phase 3: MCP Server (Primary v1 Surface)
**Goal**: A user driving Claude Desktop / ChatGPT can manage their entire recipe library end-to-end against production via a remote, OAuth-secured MCP server — this is the first time the product is *useful*
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: MCP-01, MCP-02, MCP-03, MCP-04, MCP-05, MCP-06, MCP-07, MCP-08, MCP-09, MCP-10, MCP-11, MCP-12
**Success Criteria** (what must be TRUE):
  1. The MCP server is reachable over Streamable HTTP at a public URL and can be added as a remote connector in Claude Desktop / Claude Code with no manual JSON editing
  2. Claude Desktop completes the OAuth 2.1 + PKCE + Dynamic Client Registration handshake against Clerk and the user lands in an authenticated session
  3. All ten tools — `add_recipe`, `update_recipe`, `delete_recipe`, `get_recipe`, `list_recipes`, `search_recipes`, `add_recipe_note`, `export_recipe`, plus implicit list+search variants — are callable from Claude with names, descriptions, and parameter schemas written for LLM consumption
  4. A 10+ prompt eval suite picks the right tool ≥ 90% of the time, blocking regressions on tool naming/description drift
  5. A user can complete a create → read → update → delete round-trip from Claude Desktop end-to-end against the production-equivalent environment, with deletes producing tombstones (not hard deletes)
**Plans**: TBD

### Phase 4: CLI + Tiny Web Admin
**Goal**: Terminal users / agents can manage recipes through a single `rico` binary, and humans have a minimal web surface to sign in, browse, manage personal access tokens, and delete their account
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: CLI-01, CLI-02, CLI-03, CLI-04, CLI-05, CLI-06, CLI-07, WEB-01, WEB-02, WEB-03, WEB-04, WEB-05
**Success Criteria** (what must be TRUE):
  1. `npm i -g @rico/cli` (or equivalent) installs a single `rico` binary that authenticates with a personal access token and exposes `add`, `list [--tag] [--json]`, `get <id> [--json]`, `search <query> [--json]`, `delete <id> [--yes]`, and `export <id> --format markdown|jsonld` — all agent-friendly with deterministic flags and parseable JSON output
  2. A signed-in user can visit the Next.js 16 web app, see Clerk sign-in / sign-up, view a list of their recipes, and open a single recipe read-only
  3. A signed-in user can generate and revoke a personal access token from the web admin, and the CLI authenticates with that token
  4. A signed-in user can manage their account (display name, email via Clerk components) and trigger account deletion that actually removes server-side data
  5. Both surfaces share the same household-scoped service layer as MCP — the Phase 2 cross-tenant isolation test passes against the CLI and web entry points as well
**Plans**: TBD
**UI hint**: yes

### Phase 5: iPhone Foundation + Offline Sync
**Goal**: A native iPhone app is in TestFlight that lets a household member browse and view their recipes entirely offline, sync changes when reconnected, ship JS-only updates via OTA, and be accepted by App Store review
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: PHONE-01, PHONE-02, PHONE-03, PHONE-04, PHONE-05, PHONE-06, PHONE-07, AUTH-04
**Success Criteria** (what must be TRUE):
  1. An Expo SDK 55 + Expo Router iPhone app, built via EAS Build, is available in TestFlight and a signed-in user can browse, search (local), and open recipe detail screens
  2. With the device in airplane mode from cold start, the user can still launch the app, browse, search, and view full recipe detail — PowerSync has replicated their household-scoped recipes from Neon to on-device SQLite
  3. When the device reconnects, any local mutations the v1 supports (e.g., personal notes, tag toggles) flow to the server through an outbox-backed sync without resurrecting tombstoned records
  4. The user can delete their account from inside the iPhone app and the deletion actually removes server-side data (App Store 5.1.1(v) requirement)
  5. EAS Update OTA is configured so JS-only fixes ship without a new App Store submission, and the App Privacy questionnaire + privacy policy disclose Clerk and Neon as processors and confirm no LLM provider is called by the app itself
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundations | 0/3 | Not started | - |
| 2. Data Layer & Tenancy | 0/TBD | Not started | - |
| 3. MCP Server (Primary v1 Surface) | 0/TBD | Not started | - |
| 4. CLI + Tiny Web Admin | 0/TBD | Not started | - |
| 5. iPhone Foundation + Offline Sync | 0/TBD | Not started | - |
