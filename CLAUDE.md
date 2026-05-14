<!-- GSD:project-start source:PROJECT.md -->
## Project

**Rico Recipe**

A recipe app for individuals and households, whose first surface is an AI cooking assistant driven from Claude Desktop via MCP. Over time it grows into a native iPhone app, a web app, an in-app AI chat, and a CLI — all sharing one typed backend. The end-state is a polished, possibly monetized product where users can capture their recipe library, get AI help (meal planning, "what can I make tonight?", recipe generation), and cook hands-free on their phone — including offline in the kitchen.

**Core Value:** A user can talk to an AI agent about their recipe library — adding, finding, planning, and generating recipes — and that same library and intelligence is available natively on iPhone and web.

### Constraints

- **Tech stack**: Turborepo monorepo; Next.js 16 (web) on Vercel; Expo / React Native (iPhone); Neon Postgres; Drizzle ORM; tRPC for the typed API; Vercel AI SDK for LLM calls; `@modelcontextprotocol/sdk` (TypeScript) for the MCP server; Clerk for auth; shadcn/ui + Tailwind for web UI — chosen for managed-services velocity and shared types across surfaces
- **Hosting**: Managed services on Vercel + Neon + Clerk + EAS — user explicitly accepted paid hosting in exchange for shipping speed
- **Platforms**: Web + native iPhone (App Store via EAS). Android is a free bonus later, not a v1 goal.
- **Offline**: iPhone app must work without network for browsing and cook-along; sync layer (Expo SQLite + custom or Turso embedded replicas) is required, not optional
- **Multi-tenancy**: Auth and data isolation present from v1 even if there's only one user — schema and API designed for households from day one
- **Budget**: Comfortable with ~$0–30/month while building; cost scales with real users
- **Solo developer**: Single builder — scope and sequencing must respect that one person is shipping all of this
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Verdict on the User's Proposed Stack
## Recommended Stack
### Monorepo & Tooling
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Turborepo | `2.9.x` | Monorepo task orchestrator, remote cache | Vercel-native, zero-config remote cache when deployed on Vercel, well-tested with Next.js + Expo combo |
| pnpm | `10.x` | Package manager | Required for Turborepo workspaces in 2026; faster, stricter than npm; Expo + Next.js both support it cleanly |
| TypeScript | `5.7.x` | Language | `verbatimModuleSyntax`, `moduleResolution: "bundler"` is the modern default |
| Biome | `2.x` | Lint + format (replaces ESLint + Prettier) | Single tool, ~10x faster, native TS — saves config sprawl in a 4-package monorepo. (If you want ecosystem familiarity, fall back to ESLint 9 flat config + Prettier 3.) |
| `tsx` | `4.x` | Run TS scripts (CLI dev, migrations) | Faster than `ts-node`, ESM-native |
| Changesets | `2.x` | Versioning shared packages | Optional but useful if you ever publish `@rico/api-client` for external integrations |
### Web (Next.js)
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | `16.2.6` | Web app framework | Current stable; App Router only; Turbopack is default in dev and prod build |
| React | `19.2.6` | UI library | React 19 is the only supported version for Next 16; required for `useFormStatus`, Actions, `use()` hook |
| Tailwind CSS | `4.3.0` | Styling | v4 uses Lightning CSS engine, CSS-first config (`@theme` blocks). Major shift from v3 — read the migration guide; do not copy old `tailwind.config.js` patterns |
| shadcn/ui | latest CLI (`shadcn@2.x`) | Copy-paste component library | Owned components, not a dependency. Pin to the React 19 / Tailwind 4 variants |
| Radix UI primitives | latest peer | Accessibility primitives under shadcn | Comes via shadcn; no direct install |
| Zod | `4.4.3` | Runtime schema validation | tRPC + AI SDK structured outputs + form validation share one schema language |
| `@tanstack/react-query` | `5.100.x` | Client cache for tRPC | Required by tRPC v11; also used directly for non-tRPC fetches |
| Vercel AI SDK | `6.0.182` (`ai`) | LLM calls, streaming, structured outputs | v6 is current; uses Gateway by default — see "AI Provider" below |
| `@ai-sdk/react` | `3.0.184` | `useChat` hook for AI chat UI | **Note:** `useChat` API was overhauled in AI SDK v5/v6. Do not rely on training-data API; check `node_modules/ai/docs/` |
### iOS / React Native
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Expo SDK | `55.0.24` | RN framework + native modules + EAS pipeline | SDK 55 is current (2026); ships with new architecture (Fabric/TurboModules) enabled by default |
| React Native | `0.85.3` | Native runtime under Expo SDK 55 | Don't install standalone — Expo pins it |
| Expo Router | bundled with SDK 55 (`~7.x`) | File-based routing, deep links, web parity | Lets you share route conventions with Next.js mental model |
| NativeWind | `4.x` | Tailwind classes in RN | Best way to share design tokens with the web; works with Tailwind v4 |
| `@tanstack/react-query` | `5.100.x` | Cache for tRPC + PowerSync watched queries | Same version as web |
| `react-native-mmkv` | `3.x` | Fast key-value store (auth tokens, prefs) | Don't use AsyncStorage — slow, async, JSON-only |
| `expo-sqlite` | `16.x` (bundled with SDK 55) | Local SQLite | **Used by PowerSync under the hood**; you don't write raw queries against it directly |
| EAS CLI | `18.12.x` | Builds + submissions to App Store | Required; the OTA update path (`eas update`) handles JS-only bugfixes without resubmission |
### Backend / API
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| tRPC | `11.17.0` | Typed RPC between web/iOS/CLI and Next.js API | v11 is the stable line in 2026; v10 patterns are deprecated; supports React Server Components |
| Drizzle ORM | `0.45.2` | SQL query builder + schema | Best Postgres TS story in 2026; zero runtime overhead; types feed straight into tRPC + Zod |
| `drizzle-kit` | `0.31.x` | Migration generator | Pair with Drizzle |
| `@neondatabase/serverless` | `1.1.0` | Neon HTTP/WebSocket driver | Required for Vercel Functions (edge-friendly, no pooling daemon needed); use over `pg` |
| Neon Postgres | managed | Database | Branching per Vercel preview deploy is the killer feature; pgvector available for future "semantic search of my recipes" |
| Clerk | `@clerk/nextjs@6.37.x` | Auth + orgs (households) | Clerk **Organizations** map cleanly to "households"; users can belong to multiple. Ships first-party MCP OAuth provider — important. |
| Zod | `4.4.3` | Input/output schemas | Same schema used for tRPC, AI SDK structured outputs, MCP tool params |
### MCP Server
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@modelcontextprotocol/sdk` | `1.29.0` | MCP TS SDK | Official; `1.x` line; supports Streamable HTTP and stdio |
| `mcp-handler` (a.k.a. `@vercel/mcp-adapter`) | `1.1.0` | Mount an MCP server as a Next.js route handler | Official Vercel adapter; supports Streamable HTTP + (deprecated) SSE; bundles `withMcpAuth` for OAuth |
| Clerk MCP OAuth provider | bundled in `@clerk/nextjs` 6.37+ | OAuth 2.1 for MCP clients | Clerk shipped MCP-spec OAuth in mid-2025; this means Claude Desktop can do the dynamic-client-registration handshake against Clerk directly. Eliminates the biggest pain point. |
| Upstash Redis | optional | Only needed if you keep SSE transport for older clients | Skip if you go Streamable-HTTP-only |
### CLI
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `commander` | `14.0.3` | Argument parsing, subcommands, `--help` | Industry standard; agent-friendly (deterministic flags, parseable `--help`, exit codes); pairs with `--json` output mode |
| `@clack/prompts` | `1.4.0` | Interactive prompts for the human path | Modern replacement for `inquirer`; gorgeous output; only used when `process.stdout.isTTY` |
| `picocolors` | `1.x` | Tiny color lib | Avoid `chalk` (heavier, ESM-only headaches) |
| `tsx` | `4.x` | Dev-time TS execution | |
| `pkg` or `bun build --compile` | — | Optional single-binary distribution | Only if you want `brew install rico-recipe`; not required for v1 |
### AI Provider
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vercel AI SDK core | `ai@6.0.182` | LLM streaming, tool calls, structured outputs | v6 is the current line |
| AI Gateway (via AI SDK) | built-in | Route to Anthropic/OpenAI/Google through one endpoint | Default in v6; avoids per-provider SDK installs; consolidated billing; per-model fetch via `https://ai-gateway.vercel.sh/v1/models` |
| `@ai-sdk/anthropic` | `3.0.77` | Only if you bypass Gateway | Skip unless you have a reason |
| `@ai-sdk/openai` | `3.0.63` | Only if you bypass Gateway | Skip unless you have a reason |
### Offline Sync (iOS) — Recommendation: **PowerSync**
| Option | Verdict | Reason |
|--------|---------|--------|
| **PowerSync** | **RECOMMENDED** | Bi-directional sync between local SQLite (on-device, via PowerSync's wrapper around `expo-sqlite`) and your Neon Postgres. Sync Rules let you sync just the current user's household, not the whole table. Free tier exists. Drizzle-compatible. Has a first-class React Native / Expo SDK. |
| Turso embedded replicas | Viable alternative | Multi-master, simple mental model, but: (a) it replaces Postgres with libSQL — you'd be giving up Neon, pgvector, Postgres-native Drizzle, and Postgres branching; (b) you can't natively scope replication to a single household without a per-tenant DB strategy. Worth reconsidering only if Postgres is wrong for the *whole* product, which it isn't. |
| WatermelonDB | Not recommended | Mature, but you write the sync server yourself ("pull/push endpoints"). For a solo builder, this is a lot of code that PowerSync gives you for free. Last-write-wins conflict resolution is also a footgun for "I edited a recipe on web while phone was offline." |
| Hand-rolled `expo-sqlite` + custom sync | Not recommended | You'd reinvent half of WatermelonDB plus all of PowerSync. Real talk: this kills the project's velocity. |
| Replicache / Zero | Not recommended (yet) | Zero (the Replicache successor) is exciting but still maturing for RN as of 2026; not the right bet for a solo product trying to ship. |
- `@powersync/react-native` `0.28.x`
- `@powersync/web` `0.17.x` (so the web app can also be offline-capable — bonus for free)
- PowerSync Cloud (free tier to start, ~$35/mo Scale when you have real users)
### Recipe URL Extraction — Recommendation: **JSON-LD first, LLM fallback**
| Strategy | Verdict | Reason |
|----------|---------|--------|
| **JSON-LD/Microdata extraction + LLM fallback** | **RECOMMENDED** | ~85% of recipe sites (NYT, Serious Eats, Bon Appétit, AllRecipes, food blogs running WP Recipe Maker / Tasty / Mediavine) emit `schema.org/Recipe` JSON-LD. Parse it deterministically — free, fast, accurate. For the long tail, fall back to LLM extraction via the AI SDK with a Zod schema. |
| Python `recipe-scrapers` | **Do not use** | It's the gold standard for Python, but pulling it in means deploying a Python sidecar service. Massive infra cost for a feature one Node library + LLM fallback handles fine. |
| LLM-only extraction | Not recommended as primary | Slow, costs per import, occasional hallucination. Fine as fallback. |
| Library | Version | Purpose |
|---------|---------|---------|
| `undici` | bundled with Node 22 | Fetch the HTML |
| `cheerio` | `1.x` | Parse HTML, locate `<script type="application/ld+json">` |
| `@mozilla/readability` | `0.6.0` | Strip boilerplate when falling through to LLM extraction (saves tokens) |
| `jsdom` | `26.x` | Required by Readability |
| Vercel AI SDK `generateObject` | via `ai@6.x` | Structured extraction with a Zod `Recipe` schema as fallback |
### Testing
| Layer | Tool | Version | Notes |
|-------|------|---------|-------|
| Unit (all packages) | Vitest | `4.1.6` | Single test runner across the monorepo; native ESM + TS; faster than Jest |
| Web component | Vitest + Testing Library | — | `@testing-library/react@16.x` for React 19 |
| Web E2E | Playwright | `1.60.x` | Multi-browser; works against `next dev` and preview deploys |
| API integration | Vitest + tRPC test client | — | Spin up the router in-process; hit it with the typed client; use a Neon branch as the test DB |
| iOS unit | Vitest | — | Logic packages test the same way |
| iOS component | `@testing-library/react-native` | `13.3.x` | React 19 RN compatible |
| iOS E2E | Maestro | latest CLI | Easier than Detox for solo devs; YAML flows; runs on simulator and device farms |
| MCP server | Vitest + MCP test client | — | The `@modelcontextprotocol/sdk` ships an in-process client you can call tools with directly |
| Type tests | `tsc --noEmit` in CI | — | Catches tRPC type regressions across surfaces |
## Installation (initial scaffold)
# Monorepo bootstrap
# Root tooling
# Web app (apps/web)
# iOS app (apps/mobile)
# CLI (apps/cli)
# Shared packages
# packages/db        → drizzle schema + client
# packages/services  → pure domain functions (addRecipe, etc.)
# packages/api       → tRPC router (calls services)
# packages/mcp       → MCP tool definitions (calls services)
# packages/schemas   → Zod schemas shared across all of the above
# packages/ui        → shadcn components (web only, but lives in monorepo)
## Push-Backs on User's Stated Stack
| User said | Recommendation | Why |
|-----------|----------------|-----|
| "Expo SQLite + custom sync vs Turso embedded replicas" | **Use PowerSync** | PowerSync wasn't in the user's options and is the best fit. Postgres-source-of-truth + per-household sync rules + first-class Expo SDK. |
| "tRPC consumed by ... MCP" | tRPC consumed by web/iOS/CLI; **MCP shares the service layer, not tRPC procedures** | MCP has its own wire protocol; calling tRPC over HTTP from the MCP handler would be silly. Both adapters call the same pure functions. |
| "CLI framework: clack, commander, ink" | **commander + @clack/prompts**, not Ink | Ink is for rich TUIs; your CLI must be agent-friendly (parseable, pipeable, deterministic). |
| "Recipe URL extraction: recipe-scrapers Python" | **Node-side JSON-LD + Readability + LLM fallback** | Avoid running a Python sidecar; JSON-LD covers the long head; LLM covers the tail. |
| "Next.js 16" | Confirmed: `16.2.6` | Current. |
| "Drizzle + Neon" | Confirmed with `@neondatabase/serverless@1.x` | Don't use plain `pg` on Vercel. |
| "Clerk auth" | Confirmed; use **Clerk Organizations for households** and **Clerk's MCP OAuth provider** | Both shipped in 2025 and are exactly what you need. |
| "AI SDK" | Confirmed `ai@6`, default to **AI Gateway** | Per Vercel plugin guidance. |
| "shadcn/ui + Tailwind" | Confirmed; **Tailwind v4 has a new config model** | Don't copy v3 patterns from training data. |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Prisma | Heavier runtime, slower types-on-large-schemas, weaker raw SQL story than Drizzle for Postgres-native features (pgvector, JSONB, RLS) | Drizzle |
| Supabase | You picked Neon + Clerk explicitly; mixing Supabase auth/db now adds complexity for zero gain | Neon + Clerk |
| AsyncStorage (RN) | Slow, async-only, JSON-only | `react-native-mmkv` |
| Jest | ESM friction, slower, dual-config in TS monorepos | Vitest |
| Detox | Heavy setup for solo dev | Maestro |
| Ink | Wrong axis for agent-friendly CLI | commander + @clack/prompts |
| `chalk` | ESM headaches in CommonJS contexts | `picocolors` |
| `pg` (raw) on Vercel | Connection pooling issues in serverless | `@neondatabase/serverless` |
| Python `recipe-scrapers` (as a sidecar) | Infra tax for a feature Node can handle | JSON-LD + AI SDK fallback |
| WatermelonDB | You write the sync server yourself | PowerSync |
| SSE-only MCP transport | Deprecated in MCP spec since March 2025 | Streamable HTTP via `mcp-handler` |
| tRPC v10 patterns | Deprecated `createRouter` style | tRPC v11 `t.router({...})` patterns |
| Tailwind v3 `tailwind.config.js` patterns | v4 uses CSS-first `@theme` | Tailwind v4 CSS config |
## Version Compatibility Notes
| Pair | Notes |
|------|-------|
| Next.js 16 + React 19 | Hard requirement; do not pin React 18 |
| Expo SDK 55 + React 19 | Yes — Expo 55 ships React 19; new architecture is on by default |
| Tailwind 4 + shadcn | Use shadcn's React 19 / Tailwind 4 registry; old registry is React 18 |
| tRPC 11 + React Query 5 | Hard requirement; React Query 4 not supported |
| Drizzle 0.45 + drizzle-kit 0.31 | Major version of the kit lags the ORM; pair these |
| AI SDK v6 + `@ai-sdk/react` v3 | The `useChat` API changed significantly between v4 and v5/v6; read `node_modules/ai/docs/` |
| mcp-handler 1.x + MCP SDK 1.29+ | Streamable HTTP only |
| PowerSync RN SDK + Expo SDK 55 | Compatible; uses Expo's new-architecture path |
## Stack Patterns by Variant
## Sources
- npm registry queries (2026-05-13) — version pins for every package above (HIGH confidence)
- [Vercel — Deploy MCP servers to Vercel](https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel) — Streamable HTTP recommendation (HIGH)
- [Vercel — Building efficient MCP servers](https://vercel.com/blog/building-efficient-mcp-servers) — SSE→Streamable-HTTP cutover, CPU halved (HIGH)
- [vercel/mcp-handler GitHub](https://github.com/vercel/mcp-handler) — `withMcpAuth`, Next.js integration (HIGH)
- [Clerk — MCP Server Support for Next.js](https://clerk.com/changelog/2025-06-25-mcp-server-nextjs) — first-party MCP OAuth provider (HIGH)
- [PowerSync — React Native & Expo SDK docs](https://docs.powersync.com/client-sdks/reference/react-native-and-expo) (HIGH)
- [PowerSync pricing](https://powersync.com/pricing) — free tier confirmed (HIGH)
- [Turso offline sync public beta](https://turso.tech/blog/turso-offline-sync-public-beta) — verified the alternative (HIGH)
- [Supabase blog — Offline-first RN with WatermelonDB](https://supabase.com/blog/react-native-offline-first-watermelon-db) — verified WatermelonDB approach (MEDIUM)
- [PowerSync — React Native Local Database Options](https://powersync.com/blog/react-native-local-database-options) — comparative landscape (MEDIUM; vendor-authored but accurate)
- [Raymond Camden — Scraping Recipes with JSON-LD](https://www.raymondcamden.com/2024/06/12/scraping-recipes-using-nodejs-pipedream-and-json-ld) — confirms JSON-LD coverage of major recipe sites (MEDIUM)
- [arcetros/scrape-recipe-schema](https://github.com/arcetros/scrape-recipe-schema) and [@dimfu/recipe-scraper](https://www.npmjs.com/package/@dimfu/recipe-scraper) — existing Node-side options if you want a prebuilt lib instead of rolling your own JSON-LD parser (MEDIUM)
- [MCP spec — Streamable HTTP (March 2025)](https://modelcontextprotocol.io/) — transport recommendation (HIGH)
- Vercel plugin guidance in this session — AI SDK v6, Gateway default, model ID fetch pattern (HIGH)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
