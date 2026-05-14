# Project Research Summary

**Project:** Rico Recipe
**Domain:** Multi-surface (MCP + Web + iPhone + CLI) personal/household recipe app with offline-first iPhone and conversational AI
**Researched:** 2026-05-13
**Confidence:** HIGH

## Executive Summary

Rico Recipe is a personal/household recipe library whose **first user-facing surface is an MCP server consumed from Claude Desktop**, then progressively grown into a native iPhone app, a minimal web admin, and a CLI — all sharing one typed TypeScript backend on Vercel + Neon + Clerk. Research across all four lenses (stack, features, architecture, pitfalls) confirms the MCP-first sequencing thesis: ~80% of the product's value features map cleanly to MCP tools, so shipping Claude Desktop as the v1 UI is genuinely viable.

The recommended approach is a Turborepo monorepo with a **shared `packages/core` domain layer** called in-process by both tRPC (web/iOS/CLI) and the MCP server — emphatically *not* MCP wrapping tRPC over HTTP. Multi-tenancy uses **Clerk Organizations as Households, enforced by Postgres Row-Level Security with `FORCE ROW LEVEL SECURITY`** at the data layer because MCP is a second backdoor that bypasses any tRPC-layer guards. Offline iPhone sync uses **PowerSync** (Postgres ↔ Expo SQLite, server-authoritative, last-writer-wins). URL imports use **JSON-LD first, Readability + Vercel AI SDK `generateObject` fallback** — no Python sidecar. MCP auth is **Streamable HTTP + OAuth 2.1 + PKCE + Dynamic Client Registration with Clerk as IdP**.

The principal risks must be designed in from migration 0001: (1) tenancy bypass via the MCP backdoor if RLS isn't enforced at the DB layer; (2) delete-resurrection on iPhone sync if tombstones aren't designed in from day one; (3) AI cost runaway in the first week unless per-user token budgets exist before the first LLM call; (4) iPhone rot — the second platform always trails the web unless EAS Update OTA + a tRPC parity gate ships with the first iPhone build; (5) App Store rejection under Guidelines 4.2 / 5.1 for AI apps lacking native polish, AI/privacy disclosure, and in-app account deletion. Each is preventable with phase-1 decisions; each is catastrophic to retrofit.

## Key Findings

### Recommended Stack

User's stated stack is correct; four push-backs:
- **PowerSync** for offline (not custom, not Turso, not WatermelonDB)
- MCP shares the **service layer**, NOT tRPC procedures
- **commander + @clack/prompts** for CLI (not Ink)
- **Node-side JSON-LD + Readability + AI SDK fallback** for URL extraction (no Python sidecar)

**Core technologies (verified against npm 2026-05-13):**
- Next.js 16.2.6 + React 19.2 (web)
- Expo SDK 55 + RN 0.85 + Expo Router 7 + NativeWind 4 (iPhone)
- tRPC 11.17 + Drizzle 0.45 + `@neondatabase/serverless@1.1`
- Clerk `@clerk/nextjs@6.37` — auth, **Organizations = Households**, first-party MCP OAuth
- `@modelcontextprotocol/sdk@1.29` + `mcp-handler@1.1` — **Streamable HTTP only** (SSE deprecated)
- Vercel AI SDK `ai@6.0.182` via AI Gateway; `generateObject` for structured extraction
- PowerSync (`@powersync/react-native@0.28`)
- JSON-LD via `cheerio` + `@mozilla/readability` + `jsdom`
- CLI: `commander@14` + `@clack/prompts@1` + `picocolors`
- Testing: Vitest 4, Playwright 1.60 (web), Maestro (iOS) — NOT Jest, NOT Detox, NOT Cypress

### Expected Features

**Table stakes (v1):** Manual add, URL import (JSON-LD + LLM fallback), search/list/get, edit/delete/notes, tags, photos, **`instructions: string[]` from migration 0001**, **parsed ingredients `{quantity, unit, name}`** (keystone capability), auth + household, minimal web admin.

**Differentiators (v1):** `generateRecipe`, `suggestSubstitution`, dietary/allergen inference on import, "What can I make tonight?" from pantry, Markdown + JSON-LD export.

**v1.x (with iPhone):** Offline-first sync via PowerSync (must ship WITH iPhone), cook mode (screen-awake, stepped instructions, auto-timers, ingredient checklist, in-mode scaling), pantry CRUD, recipe history.

**Defer to v2+:** Shopping list (needs battle-tested ingredient parser), conversational meal planning, voice control, semantic search, multiple concurrent timers, Android, OCR.

**Anti-features:** Public social/discovery, community ratings, ads, grocery integrations, self-hosting first-class, calorie tracking, collaborative editing, nested folders, native voice assistant.

### Architecture Approach

Shared-domain monorepo with thin protocol adapters. **Both tRPC procedures and MCP tools call `packages/core` directly (in-process), never over HTTP.**

**Components:**
1. `apps/web` — Next.js 16 admin + library + AI chat
2. `apps/mobile` — Expo iPhone; reads/writes via expo-sqlite through PowerSync
3. `apps/mcp` — MCP server on Streamable HTTP + OAuth 2.1 + PKCE + DCR (Clerk IdP)
4. `apps/cli` — commander + clack; tRPC client over HTTP with personal access tokens
5. `packages/core` — framework-free domain; called in-process by tRPC + MCP
6. `packages/api` — tRPC; ctx `{userId, householdId, db}` with `SET LOCAL app.household_id` per request
7. `packages/db` — Drizzle + Neon + RLS policies + `FORCE ROW LEVEL SECURITY`
8. `packages/ai` — Vercel AI SDK prompts/tools; mirrored to MCP SDK
9. `packages/auth` — Clerk wrappers + RLS session helper
10. `packages/sync` (mobile-only) — PowerSync SDK + outbox + LWW policy

**Multi-tenancy:** Shared schema, `household_id` on every tenant table, Clerk Orgs = Households, RLS uses `current_setting('app.household_id')`, **`FORCE ROW LEVEL SECURITY`** because owners bypass otherwise.

**MCP auth:** Remote (not stdio), Streamable HTTP, OAuth 2.1 + PKCE + DCR, Clerk as IdP, per-tool scopes. Static tokens only for CLI.

**Offline sync:** PowerSync, server-authoritative, LWW per-field for recipes; set-merge for tags/favorites; client-only for cook progress.

**Build order:** db → auth + core → api + ai → mcp + web + cli → sync + mobile → cook-along polish.

### Critical Pitfalls

1. **Tenancy bypass via MCP backdoor** — Enforce at DB layer with RLS + `FORCE ROW LEVEL SECURITY`; CI lint blocks direct DB imports outside service layer.
2. **Sync delete-resurrection** — Tombstones (`deleted_at`) from migration 0001; deletes are UPDATEs; outbox + idempotency keys.
3. **AI cost runaway** — Per-user daily token budget in DB; atomic decrement before each call; hard kill-switch; surface attribution. Ship with first LLM call.
4. **iPhone rot** — EAS Update OTA from day one; shared typed tRPC client; parity gate in roadmap; 1 day/week iPhone time-box.
5. **App Store rejection 4.2/5.1** — Native polish; App Privacy questionnaire discloses Anthropic/OpenAI/Clerk; in-app account deletion that actually deletes; AI content labeled.

Honorable mentions: MCP tool-name confusion (eval suite by 5th tool), Vercel cold starts (Fluid Compute + `maxDuration=300`), URL extraction degradation (two-tier + raw HTML stored), iPhone SQLite migration data loss (forward-only + backup + sync-recoverable), household retrofit pain, solo-dev burnout (WIP=1, tier surfaces).

## Implications for Roadmap

### Suggested Phases

1. **Phase 0 — Monorepo Scaffolding + Foundations** — Turborepo, pnpm, empty apps/packages, Clerk org, Neon project, Vercel link, CI (tsc + Vitest + Biome), first preview deploy. Declares surface tiers + WIP=1.
2. **Phase 1 — Data Layer + Tenancy + Core Domain** — Migration 0001 with `households`, `recipes`, `pantry`, etc.; every tenant table has `household_id`, `deleted_at`, `updated_at`; `instructions: string[]`; RLS + FORCE; `packages/auth` builds tRPC context; `packages/core` exposes pure CRUD; cross-tenant isolation test passes.
3. **Phase 2 — MCP Server + URL Import + AI Foundations (v1 user surface)** — `apps/mcp` via `mcp-handler` mounted in Next.js; OAuth 2.1 + PKCE + DCR with Clerk; tools: add/import_url/search/list/get/update/delete/add_note/generate/suggest_substitution/export; two-tier URL extractor; **per-user token budget table + kill-switch with first LLM call**; MCP eval suite (20 prompts).
4. **Phase 3 — Minimal Web Admin + CLI (v1 complete)** — `packages/api` tRPC; `apps/web` (Clerk middleware, shadcn/ui, sign-in, library, manual add/edit, URL import, in-app AI chat); `apps/cli` with `rico add|import|search|get|export`; Markdown + JSON-LD export; production deploy.
5. **Phase 4 — iPhone Foundation + Offline Sync** — PowerSync connected to Neon with household-scoped sync rules; `packages/sync` wraps PowerSync + outbox + tombstone-aware mutations; `apps/mobile` Expo SDK 55 with Clerk Expo; browse + view + edit + delete recipes offline; bundled Drizzle migrations with backup; EAS Build + Submit + EAS Update OTA from CI; in-app account deletion; App Privacy questionnaire; first TestFlight build.
6. **Phase 5 — Cook-Along + Pantry + "What Can I Make Tonight?"** — Cook mode (screen-awake, stepped, auto-timers, ingredient checklist, in-mode scaling); pantry CRUD on iPhone + MCP; `suggest_from_pantry` tool; recipe history; web AI chat refinements.
7. **(v2 deferred)** — Shopping list, conversational meal planning, semantic search, voice, Android, OCR.

### Phase Ordering Rationale

- Data layer before any client — schema retrofit cost dominates.
- MCP before web — project thesis; same `packages/core` powers both.
- AI metering with first LLM call — cheapest to prevent, hardest to fix retroactively.
- Web admin + CLI in one phase — both utility-tier, same `packages/api`.
- Sync ships WITH iPhone — dominant offline-app failure mode.
- Cook-along after iPhone shell — depends on stepped instructions + sync + parity gate.
- Shopping list + meal planning deferred — need proven ingredient parser.

### Research Flags

**Deeper research at phase planning:**
- Phase 2: Clerk MCP OAuth + DCR (new mid-2025), AI SDK v6 `useChat`, MCP tool description prompt-engineering
- Phase 4: PowerSync sync rules + Expo SDK 55 new arch combinations, EAS Update versioning, App Store AI policy specifics, Expo SQLite migration patterns

**Standard patterns (skip research):**
- Phase 0, 1, 3, 5 — well-trodden 2026 patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions verified against npm 2026-05-13 |
| Features | HIGH | Recipe-app domain mature; MCP patterns consistent |
| Architecture | HIGH | Multi-tenancy + RLS + shared-domain are canonical 2026 SaaS |
| Pitfalls | HIGH | Stack-specific pitfalls verified against current docs |

**Overall confidence:** HIGH

### Gaps

- PowerSync cost trajectory at scale (revisit phase 4)
- AI Gateway pricing vs direct provider (monitor from phase 2)
- App Store AI policy enforcement at submission time
- MCP spec drift (pin SDK versions; revisit each phase)
- iOS new-architecture edge cases (spike early in phase 4)
- Ingredient parser accuracy (track confidence from day one)

## Sources

Full source lists in `STACK.md`, `FEATURES.md`, `ARCHITECTURE.md`, `PITFALLS.md`.

Primary (HIGH): npm registry, MCP spec (Streamable HTTP March 2025), Vercel MCP deployment docs, Clerk MCP changelog, PowerSync RN/Expo docs, Drizzle RLS, schema.org Recipe, OWASP MCP Top 10, App Store Review Guidelines 2025 AI rules.
