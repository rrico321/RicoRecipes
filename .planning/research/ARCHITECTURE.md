# Architecture Research

**Domain:** Multi-surface recipe app (Web + iPhone + MCP server + CLI) with shared typed backend, offline iPhone, and multi-tenant household model
**Researched:** 2026-05-13
**Confidence:** HIGH for monorepo / tRPC-MCP / multi-tenancy (Context7-era patterns, well-attested in 2026 ecosystem); MEDIUM for offline-sync (multiple viable approaches, recommendation below); HIGH for MCP auth (spec-mandated)

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT SURFACES                                  │
│                                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Claude       │  │ Web (Next.js)│  │ iPhone (Expo)│  │ CLI (Node)   │    │
│  │ Desktop /    │  │ + shadcn/ui  │  │ + SQLite     │  │              │    │
│  │ MCP clients  │  │              │  │ (offline)    │  │              │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │ MCP/HTTP        │ tRPC/HTTP       │ tRPC + sync     │ tRPC        │
└─────────┼─────────────────┼─────────────────┼─────────────────┼─────────────┘
          │                 │                 │                 │
┌─────────▼─────────┐       │                 │                 │
│ apps/mcp          │       │                 │                 │
│ (MCP server,      │       │                 │                 │
│  OAuth 2.1 +PKCE) │       │                 │                 │
│  → calls into     │       │                 │                 │
│  packages/api or  │       │                 │                 │
│  packages/core    │       │                 │                 │
└─────────┬─────────┘       │                 │                 │
          │                 │                 │                 │
┌─────────▼─────────────────▼─────────────────▼─────────────────▼─────────────┐
│                       TYPED API LAYER  (packages/api)                        │
│                                                                              │
│  tRPC routers — authed via Clerk JWT → ctx { userId, householdId, db }      │
│  Procedures: recipe.add / recipe.import / recipe.search / recipe.get /...   │
│                          │                                                   │
│                          ▼                                                   │
│                   ┌─────────────────┐                                       │
│                   │ packages/core   │  ← pure domain (recipe parsing,       │
│                   │ (domain service)│    URL extraction, scaling, etc.)     │
│                   └────────┬────────┘                                       │
└────────────────────────────┼─────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────────────────┐
│                        DATA + INTEGRATION LAYER                              │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ packages/db  │  │ packages/ai  │  │ Clerk        │  │ Sync engine  │    │
│  │ Drizzle +    │  │ Vercel AI SDK│  │ (auth +      │  │ (PowerSync   │    │
│  │ Neon Postgres│  │ + prompts    │  │  households) │  │  or custom)  │    │
│  │ + RLS        │  │              │  │              │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `apps/web` | Next.js 16 web UI (admin, library, AI chat) | App Router + RSC, calls tRPC via `@trpc/react-query`, Clerk middleware |
| `apps/mobile` | Expo iPhone app, offline-capable | Expo SDK 54+, expo-sqlite, tRPC client + sync engine, Clerk Expo |
| `apps/mcp` | MCP server exposing tools to Claude Desktop / Claude.ai | `@modelcontextprotocol/sdk` (TS) over Streamable HTTP transport, OAuth 2.1 + PKCE; thin wrapper that calls `packages/core` |
| `apps/cli` | Terminal interface for power users / agents | Node CLI, authenticates via stored Clerk token, calls tRPC over HTTP |
| `packages/api` | tRPC routers + Zod schemas | Procedures grouped by resource (recipe, household, mealPlan, ai) |
| `packages/core` | Pure domain service (recipe parsing, scaling, schema.org extraction, search) | Framework-free TS — both tRPC and MCP call into it |
| `packages/db` | Drizzle schema + Neon client + migrations + RLS policies | `drizzle-orm`, `drizzle-kit`; exports types and `db` instance |
| `packages/ai` | LLM prompts, structured-output schemas, tool definitions | Vercel AI SDK — shared between web chat, MCP, iPhone chat |
| `packages/auth` | Clerk wrappers + tRPC context builder + RLS session helper | `@clerk/nextjs`, `@clerk/expo`, `@clerk/backend` |
| `packages/ui` | Shared shadcn/ui components (web) + NativeWind variants where reusable | Tailwind v4 + NativeWind v5; not all components cross-render |
| `packages/sync` | Client sync engine for Expo: pull/push deltas, conflict resolution | Custom thin layer over tRPC, OR PowerSync SDK (recommended) |

---

## Recommended Project Structure

```
rico-recipe/
├── apps/
│   ├── web/                      # Next.js 16, App Router
│   │   ├── app/
│   │   │   ├── (marketing)/      # public landing
│   │   │   ├── (app)/            # authed app shell (Clerk middleware)
│   │   │   │   ├── library/
│   │   │   │   ├── recipe/[id]/
│   │   │   │   └── chat/         # AI chat surface
│   │   │   └── api/trpc/[trpc]/  # tRPC route handler
│   │   └── proxy.ts              # (renamed from middleware.ts in Next 16)
│   ├── mobile/                   # Expo SDK 54+
│   │   ├── app/                  # expo-router
│   │   │   ├── (tabs)/library/
│   │   │   ├── recipe/[id]/
│   │   │   └── cook/[id]/        # cook-along (timers, steps)
│   │   ├── db/                   # expo-sqlite schema mirror
│   │   └── sync/                 # sync orchestrator
│   ├── mcp/                      # MCP server
│   │   ├── src/
│   │   │   ├── server.ts         # streamable HTTP transport
│   │   │   ├── auth.ts           # OAuth 2.1 + PKCE + DCR
│   │   │   └── tools/            # one file per tool, calls packages/core
│   │   └── Dockerfile            # or vercel.json — deployed to Vercel
│   └── cli/                      # Node CLI (Commander / Clipanion)
│       └── src/commands/
├── packages/
│   ├── api/                      # tRPC routers
│   │   └── src/
│   │       ├── routers/
│   │       │   ├── recipe.ts
│   │       │   ├── household.ts
│   │       │   ├── mealPlan.ts
│   │       │   └── ai.ts
│   │       ├── trpc.ts           # initTRPC, middleware
│   │       └── root.ts           # appRouter
│   ├── core/                     # pure domain
│   │   └── src/
│   │       ├── recipe/           # parsing, normalization, scaling
│   │       ├── import/           # URL → schema.org/Recipe extractor
│   │       └── search/           # search query builder
│   ├── db/                       # Drizzle
│   │   └── src/
│   │       ├── schema/           # one file per table
│   │       ├── client.ts         # neon-http driver
│   │       └── rls.ts            # policies
│   ├── ai/                       # Vercel AI SDK glue
│   │   └── src/
│   │       ├── prompts/
│   │       └── tools/            # AI SDK tool defs (mirrored to MCP)
│   ├── auth/
│   │   └── src/
│   │       ├── trpc-context.ts   # builds { userId, householdId, db }
│   │       └── rls-session.ts    # SET app.user_id / app.household_id
│   ├── ui/                       # shadcn/ui + NativeWind variants
│   └── sync/                     # client sync engine
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### Structure Rationale

- **`apps/mcp` as its own app, not part of `apps/web`:** MCP needs a different deploy lifecycle, different auth flow (OAuth 2.1 + PKCE for remote MCP clients, not Clerk session cookies), and may need long-lived connections. Co-locating it as a separate app keeps boundaries clean.
- **`packages/core` is the keystone:** Both `apps/mcp` and `packages/api` call into `packages/core` rather than MCP calling tRPC over HTTP. This avoids self-referential network hops and keeps the domain logic testable in isolation. (See "Pattern 2" below.)
- **`packages/api` exports types only to clients:** Web imports `AppRouter` type, Expo imports `AppRouter` type, CLI imports `AppRouter` type — never the implementation. This is what makes tRPC's end-to-end types work across surfaces.
- **`packages/ai` mirrors tools between Vercel AI SDK and MCP SDK:** Same tool definitions, two adapters. Web chat and Claude Desktop call the same underlying functions.
- **`packages/sync` is mobile-only initially:** Web doesn't need offline; CLI doesn't need offline. Keeps sync complexity scoped.

---

## Architectural Patterns

### Pattern 1: Shared domain core, thin protocol adapters

**What:** Business logic lives in `packages/core` as plain functions. `packages/api` (tRPC) and `apps/mcp` (MCP tools) are thin adapters that handle protocol concerns (validation, auth context, response shape) and delegate to `core`.

**When to use:** Whenever you have N protocols × M operations — exactly the Rico Recipe case (tRPC + MCP today, possibly GraphQL or REST later).

**Trade-offs:**
- Pro: One canonical implementation; tests live with the domain, not the protocol
- Pro: MCP doesn't pay HTTP overhead by calling tRPC over the wire
- Con: Slightly more upfront structure than "just put it in the tRPC procedure"

**Example:**
```typescript
// packages/core/src/recipe/add.ts
export async function addRecipe(deps: { db: DB }, input: AddRecipeInput, actor: Actor) {
  // validate household membership, insert, return
}

// packages/api/src/routers/recipe.ts
recipe.add: protectedProcedure.input(AddRecipeSchema).mutation(({ ctx, input }) =>
  addRecipe({ db: ctx.db }, input, { userId: ctx.userId, householdId: ctx.householdId })
)

// apps/mcp/src/tools/add-recipe.ts
server.tool("add_recipe", AddRecipeSchema, async (input, { actor, db }) =>
  addRecipe({ db }, input, actor)
)
```

> **Note on `trpc-mcp`:** A library exists ([Jacse/trpc-mcp](https://github.com/Jacse/trpc-mcp)) that exposes tRPC procedures as MCP tools automatically. It is appropriate for a fast spike, but for Rico Recipe I recommend the manual adapter pattern above — MCP tool descriptions need careful prompt-engineering and don't 1:1 map to API procedures (e.g., `recipe.search` may need a richer description for the LLM than for a UI client).

### Pattern 2: tRPC context as the multi-tenancy boundary

**What:** Every tRPC procedure receives a context object built from the Clerk session that includes `{ userId, householdId, db }`. The `db` instance has the user's household ID set as a Postgres session variable; all queries go through Row-Level Security policies.

**When to use:** Always, for any data-bearing procedure in this app.

**Trade-offs:**
- Pro: Even a forgotten `where householdId = ?` clause cannot leak data — the database refuses
- Pro: Same context shape used in MCP tools, keeping the security model uniform
- Con: Requires Neon + Postgres RLS; a small per-request `SET LOCAL app.household_id = ...`

**Example:**
```typescript
// packages/auth/src/trpc-context.ts
export async function createContext({ req }) {
  const { userId, orgId } = await clerk.authenticateRequest(req);
  const householdId = orgId; // Clerk Organization == Household
  const db = await dbWithRlsSession({ userId, householdId });
  return { userId, householdId, db };
}
```

### Pattern 3: Offline-first iPhone with server-authoritative sync

**What:** iPhone reads/writes go to a local SQLite mirror first. A sync engine pushes mutations to the server and pulls deltas. Server is the source of truth; conflicts resolved by last-writer-wins on a per-field basis.

**When to use:** When the offline experience is core (Rico Recipe: yes — cooking happens with bad wifi).

**Trade-offs:**
- Pro: Instant UI, works offline
- Pro: Server remains authoritative — simpler than peer-to-peer CRDT
- Con: Genuine multi-device concurrent edits to the same recipe can lose data on the loser side
- Mitigation: Recipes are rarely co-edited in real time; LWW per-field is fine here

**Recommendation:** Use **PowerSync** with Neon Postgres + Expo SQLite. It implements exactly this pattern (server-authoritative + LWW with hooks for custom resolution) and is production-grade in 2026. Don't roll your own sync engine for v1 — it's a multi-month tarpit. CRDT (e.g., Yjs / sqlite-sync) is overkill for recipes; a recipe is not Figma.

### Pattern 4: AI tools defined once, exposed everywhere

**What:** `packages/ai` defines each LLM tool (e.g., `searchMyRecipes`, `planMealsForWeek`) as a Zod schema + handler. Two adapters: one registers them with Vercel AI SDK (used by web/iPhone chat), one registers them with the MCP SDK (used by Claude Desktop).

**When to use:** Whenever the same AI capability needs to work both in your own chat UI and from Claude Desktop.

**Trade-offs:**
- Pro: No drift between "what Claude Desktop can do" and "what in-app chat can do"
- Con: A tiny abstraction over two SDKs that have slightly different shapes

---

## Data Flow

### Key data flow 1: User pastes a recipe URL in Claude Desktop

```
User: "Save this recipe: https://nytcooking.com/..." in Claude Desktop
   ↓
Claude Desktop → apps/mcp (Streamable HTTP, OAuth 2.1 bearer token in header)
   ↓
apps/mcp: resolve token → Clerk userId + householdId → build actor context
   ↓
apps/mcp: tool `import_recipe_from_url` → packages/core/import/from-url.ts
   ↓
packages/core: fetch URL → parse schema.org/Recipe JSON-LD → normalize
   ↓
packages/core: addRecipe({ db }, normalized, actor)
   ↓
packages/db: INSERT with RLS session → Neon Postgres
   ↓
Response bubbles back to Claude Desktop as MCP tool result
```

### Key data flow 2: iPhone offline cook-along

```
[Online, earlier]
apps/mobile boot → Clerk session → sync.pull()
   ↓
packages/sync → tRPC recipe.listSince(lastSync) → expo-sqlite UPSERT
   ↓
[Offline, in kitchen]
User opens recipe → reads from expo-sqlite only (no network)
User adjusts servings → writes to expo-sqlite + local mutation log
   ↓
[Back online]
sync.push() → tRPC recipe.batchMutate(log) → server applies (LWW)
sync.pull() → server returns deltas → expo-sqlite reconciles
```

### Key data flow 3: In-app AI chat "what can I make tonight?"

```
User types in web/iPhone chat
   ↓
UI → tRPC ai.chat (streaming) → Vercel AI SDK
   ↓
AI SDK invokes tool `searchMyRecipes` (defined in packages/ai)
   ↓
Tool handler → packages/core/search → packages/db (with RLS context)
   ↓
Results stream back through AI SDK → UI
```

### State management

- **Web:** Server Components for reads where possible; `@trpc/react-query` for client interactivity; no Redux
- **iPhone:** `expo-sqlite` IS the state. UI subscribes via Drizzle's `useLiveQuery` or a thin Zustand store mirroring SQLite. tRPC is only used by `packages/sync`, not by UI components directly.
- **MCP / CLI:** Stateless request/response

---

## Build Order / Phase Dependencies

Strict topological order (each layer depends on prior):

```
1. packages/db  (Drizzle schema + RLS policies)
        ↓
2. packages/auth + packages/core  (parallel)
        ↓
3. packages/api (tRPC) + packages/ai (parallel — both depend on core)
        ↓
   ┌────┴────┬─────────────┬──────────────┐
   ↓         ↓             ↓              ↓
4a. apps/mcp   4b. apps/web   4c. apps/cli   (parallel — share packages/api types)
        ↓
5. packages/sync + apps/mobile  (mobile depends on sync, sync depends on api)
```

**Phase recommendation:**

| Phase | Build | Why this order |
|-------|-------|---------------|
| 0 | Monorepo scaffolding (Turborepo + pnpm, Clerk dev keys, Neon dev DB) | Foundation |
| 1 | `packages/db` schema + RLS + `packages/auth` + `packages/core` recipe domain | Nothing else can be built without these |
| 2 | `packages/api` tRPC routers + `apps/mcp` MCP server | The "v1 user surface" per project decision |
| 3 | `apps/web` (admin + library + chat) using `packages/ai` | Validates the API; gives a fallback UI |
| 4 | `apps/cli` | Quick win; reuses everything |
| 5 | `packages/sync` + `apps/mobile` (browse-only offline first) | Most complex; built once the API is stable |
| 6 | `apps/mobile` cook-along + scaling + timers | Native polish |

**Critical sequencing insight:** Build `apps/mcp` in phase 2 **before** `apps/web`. The project's stated thesis is "MCP is the v1 surface"; building MCP first forces the API to be useful in isolation, which is exactly what you want for testing the design.

---

## Multi-Tenancy Decision

**Recommendation:** **Shared schema + `household_id` column on every tenant-scoped table + Postgres Row-Level Security**, with Clerk Organizations modeling households.

**Model:**
```
users (clerk_user_id PK)
households (id PK)              ← maps 1:1 to Clerk Organization
household_members (user_id, household_id, role)
recipes (id, household_id, created_by_user_id, ...)
meal_plans (id, household_id, ...)
```

**Rationale:**
- **Clerk Organizations = Households**: Clerk already implements org membership, invites, roles. Don't rebuild it.
- **RLS at DB layer**: Defense in depth. A bug in a tRPC procedure cannot leak another household's recipes because the database itself refuses. This is the difference between a 4 a.m. incident and a CVE.
- **Shared schema (not DB-per-tenant)**: At Rico Recipe's scale (households of 1-6 people, target audience individual / small group), schema-per-tenant or DB-per-tenant is wildly over-engineered. Shared schema with `household_id` is the canonical 2026 approach for SaaS at this scale.
- **MCP context**: When an MCP tool runs, the actor's `householdId` is set in the same RLS session variable, so MCP tools share the security model with tRPC.

**Implementation note:** Use `SET LOCAL app.household_id = '...'` at the start of each request (in a tRPC middleware), and write Drizzle RLS policies as:
```sql
CREATE POLICY recipe_household_isolation ON recipes
  USING (household_id = current_setting('app.household_id')::uuid);
```

---

## MCP Auth Decision

**Recommendation:** **Remote MCP server, OAuth 2.1 + PKCE with Dynamic Client Registration (DCR)**, hosted alongside the rest of the stack on Vercel. Clerk acts as the OAuth IdP for the MCP server.

**Rationale:**
- **Remote, not local**: A local MCP server (stdio transport) means each user has to install a binary, configure Claude Desktop config JSON, and keep it updated. For a real product with non-developer households, this is a non-starter. Remote MCP works on Claude.ai (web) AND Claude Desktop without the user touching JSON.
- **OAuth 2.1 + PKCE**: This is the MCP spec mandate for remote servers as of 2026. Not optional. ([MCP spec](https://modelcontextprotocol.io/docs/develop/connect-remote-servers))
- **DCR (Dynamic Client Registration)**: Lets Claude Desktop register itself as a client automatically, no per-user setup. This is what makes the "click connector → done" UX work.
- **Clerk as IdP**: Clerk supports OAuth-provider mode. You don't need to also adopt Auth0 just for this. A single auth provider across web/iPhone/MCP is the goal.

**Flow:**
1. User in Claude Desktop: "Add custom connector → https://mcp.ricorecipe.app"
2. MCP server responds with OAuth discovery (`/.well-known/oauth-authorization-server`)
3. Claude Desktop performs DCR → Clerk
4. User redirected to Clerk hosted login → consents
5. Token issued, Claude Desktop stores it, opens Streamable HTTP session
6. Every MCP request includes the bearer token; server resolves to `{ userId, householdId }` and runs tools

**Alternative considered: Static API token** — rejected. Doesn't work with Claude Desktop's modern connector flow, doesn't scale to multi-user, no revocation UX. Only use for the CLI (where the user explicitly pastes a personal access token from a "Tokens" page in the web app).

**Note on transport:** Use **Streamable HTTP** (the 2026 successor to SSE). SSE is deprecated.

---

## Offline-Sync Decision

**Recommendation:** **PowerSync** (managed sync service, Postgres ↔ SQLite, server-authoritative, LWW conflict resolution) integrated with Neon and expo-sqlite.

**Why not custom?** You will spend 6-8 weeks building a buggy sync engine, then 6 months fixing it. The solo-developer constraint argues strongly against this. PowerSync's free tier covers initial development; pricing scales reasonably.

**Why not CRDT (Yjs, sqlite-sync, ElectricSQL)?** CRDTs solve concurrent multi-author editing on the same document. Recipes are 99% single-author. The cost (complexity, storage overhead, conceptual load) is not justified.

**Why not Turso embedded replicas?** They give you fast reads but the write/sync model for offline-edit-and-reconcile is less mature than PowerSync's. Reconsider if PowerSync pricing becomes an issue.

**Conflict resolution policy:**
- Recipe title / ingredients / instructions: last-writer-wins on the whole field
- Recipe `tags` and `favorites`: set-merge (union of both sides)
- Meal plan slot assignments: last-writer-wins on the slot
- Cook-along progress state: client-only, never synced

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-100 households | Single Vercel project, single Neon branch, PowerSync free tier — no changes needed |
| 100-10k households | Add Neon autoscaling, monitor Postgres RLS overhead (it's small but real), upgrade PowerSync tier, add basic background job queue (Inngest / Trigger.dev) for URL imports |
| 10k+ households | Consider read replicas in Neon, partition `recipes` by `household_id` if hot, move LLM calls to dedicated edge functions with response caching |

### Scaling priorities

1. **First bottleneck**: AI/LLM costs (per-call cost, not throughput) — mitigate with caching of common queries and structured-output prompts that return less
2. **Second bottleneck**: URL-import latency (scraping a recipe URL is slow) — move to async job + push notification on completion
3. **Third bottleneck**: PowerSync sync rules complexity as schema grows — keep tenant-scoped queries simple

---

## Anti-Patterns

### Anti-Pattern 1: Having MCP call tRPC over HTTP

**What people do:** Deploy MCP server as a wrapper that makes HTTP calls to the tRPC API.
**Why it's wrong:** Extra network hop, double serialization, harder auth (need to forward credentials), and you've now coupled MCP to the tRPC wire format.
**Do this instead:** Both MCP tools and tRPC procedures call into `packages/core`. The HTTP-only boundary is at the edge.

### Anti-Pattern 2: Designing the schema for one user then "adding multi-tenancy later"

**What people do:** Ship with `recipes(id, title, ...)`, plan to add `household_id` once "we have real users."
**Why it's wrong:** Every query, every test, every API call needs to be retrofitted. Data migration is fraught. The project's own Key Decisions list calls this out.
**Do this instead:** `household_id` on every tenant table from migration 0001. RLS policies from day one. Develop with two seeded households.

### Anti-Pattern 3: Building a custom offline-sync engine

**What people do:** "It's just a delta sync, how hard can it be." 6 months later, the sync engine has its own bug tracker.
**Why it's wrong:** Offline sync is one of the genuinely hard problems in distributed systems. Edge cases compound.
**Do this instead:** PowerSync (recommended) or accept the limits of optimistic-update + last-online-wins. Don't write the engine.

### Anti-Pattern 4: Different AI tool surfaces for in-app chat vs MCP

**What people do:** Define tools twice — once for the AI SDK chat, once for the MCP server, slightly differently.
**Why it's wrong:** Behavior drifts. "Why can Claude Desktop do this but the iPhone chat can't?"
**Do this instead:** `packages/ai` defines tools once with a Zod schema; two thin adapters register them.

### Anti-Pattern 5: Using Clerk Users for sharing instead of Clerk Organizations

**What people do:** Add a `shared_with` array column on recipes.
**Why it's wrong:** Doesn't model real households well (invites, removal, roles), and you'll rebuild Clerk Organizations badly.
**Do this instead:** One household = one Clerk Organization. Recipes belong to households, not users.

---

## Integration Points

### External services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Neon Postgres | Drizzle ORM via `@neondatabase/serverless` HTTP driver in serverless contexts; pooled connection in MCP server (long-lived) | RLS requires session variables — works fine over HTTP driver per-request |
| Clerk | `@clerk/nextjs` (web), `@clerk/expo` (mobile), `@clerk/backend` (MCP/CLI), Organizations for households | Clerk also acts as OAuth IdP for the remote MCP server |
| PowerSync | PowerSync service connects to Neon read replica; mobile SDK on Expo side | Define sync rules per-table; tenant-scoped via `household_id` |
| Vercel AI SDK | Used in `packages/ai`; called from tRPC streaming procedures and from MCP tools | Same prompts and tools across surfaces |
| `@modelcontextprotocol/sdk` | TS SDK in `apps/mcp` over Streamable HTTP transport with OAuth 2.1 | DCR for Claude Desktop auto-registration |
| Vercel hosting | `apps/web` and `apps/mcp` deployed as separate Vercel projects from same repo | Use `vercel link --repo` for monorepo linking |

### Internal boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `apps/*` ↔ `packages/api` | Type-only import of `AppRouter`; runtime calls via tRPC client over HTTP | Web uses route handler, mobile uses URL |
| `apps/mcp` ↔ `packages/core` | Direct function call (in-process) | NOT over HTTP — they're in the same Node runtime |
| `packages/api` ↔ `packages/core` | Direct function call | Same as above |
| `packages/api` ↔ `packages/db` | Drizzle client passed via context | Each request gets a db with RLS session set |
| `apps/mobile` ↔ `packages/sync` | Direct (in-app) | Sync engine wraps tRPC client + SQLite |
| `packages/sync` ↔ Neon | Via PowerSync service, not direct | PowerSync handles the bridge |

---

## Sources

- [T3 Turbo monorepo structure 2026](https://starterpick.com/guides/create-t3-turbo-review-2026) — canonical Turborepo + Next.js + Expo + tRPC + Drizzle layout
- [Turborepo Next.js guide](https://turborepo.dev/docs/guides/frameworks/nextjs) — official monorepo patterns
- [MCP OAuth authentication (2026)](https://www.truefoundry.com/blog/mcp-authentication-in-claude-code) — OAuth 2.1 + PKCE mandate for remote MCP
- [MCP remote servers (official)](https://modelcontextprotocol.io/docs/develop/connect-remote-servers) — Streamable HTTP transport, DCR
- [Claude Connector OAuth flow](https://sunpeak.ai/blogs/claude-connector-oauth-authentication/) — DCR, CIMD, Anthropic-held credentials
- [Get started with custom connectors using remote MCP](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp) — Claude Desktop UX for remote MCP
- [PowerSync React Native / Expo](https://docs.powersync.com/client-sdks/reference/react-native-and-expo) — production offline-sync for Postgres ↔ SQLite
- [Local-first architecture with Expo (official)](https://docs.expo.dev/guides/local-first/) — Expo's own guide on offline-first choices
- [Offline-First Apps with TanStack DB and PowerSync](https://powersync.com/blog/offline-first-apps-with-tanstack-db-and-powersync) — LWW + server-authoritative model
- [trpc-mcp library](https://github.com/Jacse/trpc-mcp) — auto-expose tRPC as MCP (considered, not recommended as primary)
- [Drizzle ORM Row-Level Security docs](https://orm.drizzle.team/docs/rls) — RLS policy definition in Drizzle
- [Neon RLS introduction](https://dev.to/neon-postgres/introducing-neon-authorize-simplifying-row-level-security-for-postgres-14fp) — RLS on Neon specifically
- [Multi-tenant data isolation with PostgreSQL RLS (AWS)](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/) — canonical shared-schema multi-tenant pattern

---
*Architecture research for: multi-surface recipe app (Rico Recipe)*
*Researched: 2026-05-13*
