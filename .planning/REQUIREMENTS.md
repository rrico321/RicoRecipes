# Requirements: Rico Recipe

**Defined:** 2026-05-13
**Core Value:** A user can talk to an AI agent (Claude / ChatGPT) about their recipe library — adding, finding, planning, and generating recipes — and that same library is available natively on iPhone (offline) and a CLI. The app itself contains no AI; all AI value comes from external clients calling the MCP surface.

## v1 Requirements

### Foundations (Monorepo + Infra)

- [x] **FOUND-01**: Turborepo monorepo scaffolded with pnpm workspaces and `apps/{mcp,mobile,cli,web}` + `packages/{db,core,auth,api,sync,ui}` layout
- [x] **FOUND-02**: Neon Postgres project provisioned and linked to a Vercel project via `vercel link --repo`
- [x] **FOUND-03**: CI runs typecheck (tsc), unit tests (Vitest), and lint (Biome) on every PR
- [x] **FOUND-04**: First preview deploy of the MCP server succeeds end-to-end (smoke health check)

### Data Layer & Tenancy

- [ ] **DATA-01**: Drizzle migration 0001 creates `households`, `household_members`, `recipes`, `recipe_tags`, `recipe_notes`, `recipe_photos`, `outbox` tables
- [ ] **DATA-02**: Every tenant table has `household_id`, `deleted_at` (tombstone), and `updated_at` columns from migration 0001
- [ ] **DATA-03**: `recipes.instructions` column is `text[]` (step array), not a single blob, from migration 0001
- [ ] **DATA-04**: Postgres Row-Level Security is enabled and `FORCE ROW LEVEL SECURITY` is set on every tenant table
- [ ] **DATA-05**: tRPC / service-layer context sets `app.household_id` per-request via `SET LOCAL` before any query
- [ ] **DATA-06**: An automated cross-household isolation test proves user A cannot read or mutate user B's recipes through any surface (MCP, CLI, web, iPhone)

### Authentication

- [ ] **AUTH-01**: A user can sign up and sign in via Clerk (email + password and at least one OAuth provider)
- [ ] **AUTH-02**: Every signed-up user is automatically placed into their own Clerk Organization that represents their household
- [ ] **AUTH-03**: Sessions persist across iPhone app launches and CLI invocations
- [ ] **AUTH-04**: A user can delete their account from the iPhone app, and the deletion actually removes server-side data (App Store requirement)

### MCP Server (v1 Primary Surface)

- [ ] **MCP-01**: MCP server is reachable over Streamable HTTP at a public URL and listed in Claude Desktop / Claude Code as a remote server
- [ ] **MCP-02**: MCP server authenticates clients via OAuth 2.1 + PKCE + Dynamic Client Registration with Clerk as the IdP
- [ ] **MCP-03**: MCP tool `add_recipe(title, ingredients, instructions[], tags?, notes?, photo_url?, source_url?)` creates a recipe scoped to the caller's household
- [ ] **MCP-04**: MCP tool `update_recipe(id, …)` updates an existing recipe the caller owns
- [ ] **MCP-05**: MCP tool `delete_recipe(id)` soft-deletes (tombstone) a recipe
- [ ] **MCP-06**: MCP tool `get_recipe(id)` returns a single recipe with all fields
- [ ] **MCP-07**: MCP tool `list_recipes(tag?, limit?, cursor?)` returns paginated recipes for the household
- [ ] **MCP-08**: MCP tool `search_recipes(query, tag?)` returns recipes matching a text query against title / ingredients / tags
- [ ] **MCP-09**: MCP tool `add_recipe_note(recipe_id, note)` appends a personal note to a recipe
- [ ] **MCP-10**: MCP tool `export_recipe(id, format: "markdown" | "jsonld")` returns the recipe in the requested format
- [ ] **MCP-11**: Every MCP tool has a name, description, and parameter schema written for LLM consumption (verified by a small eval suite of 10+ prompts that hit the right tool ≥ 90% of the time)
- [ ] **MCP-12**: An MCP-driven create / read / update / delete round-trip from Claude Desktop completes successfully end-to-end against the production-equivalent environment

### CLI

- [ ] **CLI-01**: A single binary `rico` is installable via `npm i -g @rico/cli` (or equivalent) and authenticates with a personal access token
- [ ] **CLI-02**: `rico add` (interactive via @clack/prompts) creates a recipe
- [ ] **CLI-03**: `rico list [--tag X] [--json]` lists recipes; `--json` outputs machine-readable JSON for agent consumption
- [ ] **CLI-04**: `rico get <id> [--json]` shows a single recipe
- [ ] **CLI-05**: `rico search <query> [--json]` searches recipes
- [ ] **CLI-06**: `rico delete <id>` soft-deletes a recipe with a confirmation prompt (skippable via `--yes`)
- [ ] **CLI-07**: `rico export <id> --format markdown|jsonld` outputs the recipe to stdout

### Native iPhone App (Browse + Offline)

- [ ] **PHONE-01**: Native iPhone app built with Expo SDK 55 + Expo Router, shipped to TestFlight via EAS Build
- [ ] **PHONE-02**: User can sign in with Clerk Expo and see their household's recipes
- [ ] **PHONE-03**: PowerSync replicates the user's household recipes from Neon to on-device SQLite scoped by `household_id` sync rules
- [ ] **PHONE-04**: User can browse, search (local), and view full recipe detail entirely offline (airplane-mode test passes)
- [ ] **PHONE-05**: When the app reconnects, pending local changes (notes, tags toggled, mark-favorite — anything v1 supports) sync to the server without resurrecting tombstoned records
- [ ] **PHONE-06**: EAS Update OTA channel is configured so JS updates can ship without a new App Store submission
- [ ] **PHONE-07**: App Privacy questionnaire and privacy policy disclose Clerk and Neon as data processors and confirm no LLM provider is used by the app itself

### Tiny Web Admin

- [ ] **WEB-01**: Next.js 16 web app provides Clerk sign-in / sign-up pages
- [ ] **WEB-02**: Signed-in user can view a list of their recipes
- [ ] **WEB-03**: Signed-in user can view a single recipe (read-only)
- [ ] **WEB-04**: Signed-in user can generate / revoke a personal access token used by the CLI
- [ ] **WEB-05**: Signed-in user can manage account (display name, email via Clerk components) and delete account

## v2 Requirements

### Bulk Import

- **IMPORT-01**: Import recipes from a Paprika `.paprikarecipes` export (ZIP of JSON)
- **IMPORT-02**: Import recipes from a directory of Markdown files
- **IMPORT-03**: Import recipes from a JSON-LD / schema.org Recipe document

### iPhone: Full CRUD + Cook-Along

- **PHONE2-01**: User can add / edit / delete recipes from the iPhone app (offline-tolerant with sync)
- **PHONE2-02**: Cook mode: screen-awake, stepped instructions with large tap-to-advance targets, ingredient checklist, in-mode scaling
- **PHONE2-03**: Auto-detected timers in instructions (regex + LLM pre-annotation on import — note: pre-annotation runs at import time on the *client* that performs the import, not in our server)

### Pantry, Shopping, Meal Planning

- **PANTRY-01**: User can track which ingredients they have on hand
- **SHOP-01**: User can generate a shopping list from selected recipes (requires robust ingredient parser)
- **PLAN-01**: User can build a weekly meal plan composed of recipes from their library

### Households

- **HOUSE-01**: Household owner can invite a member via email; invitee joins the household and sees shared recipes

### Sharing & Social (v2 fast-follow)

- **SHARE-01**: User can mark a single recipe as shared, with the choice between (a) a public link anyone can view without an account and (b) in-app sharing visible to other Rico users
- **SHARE-02**: When a user shares a recipe in-app, recipient(s) see it in a "shared with me" feed
- **SHARE-03**: Each user has a public profile page (e.g. `rico.app/u/<handle>`) listing the recipes they have chosen to share publicly
- **SHARE-04**: A public "Discover" feed lists publicly-shared recipes from all users (with privacy controls — user must opt-in per recipe)
- **SHARE-05**: User can follow other users; following exposes new public recipes from followed users in a personalized feed
- **SHARE-06**: User can unfollow / block another user
- **SHARE-07**: Public shared recipes show an attribution to the originating user; copies into another user's library preserve original-author attribution

### Additional Surfaces

- **ANDROID-01**: Android app via the same Expo codebase
- **VOICE-01**: Voice control in cook mode

## Out of Scope

| Feature | Reason |
|---------|--------|
| In-app LLM calls of any kind | Explicit product decision — app exposes MCP; AI lives in user's external Claude / ChatGPT subscription |
| URL extraction in our app | Same reason — the user pastes a URL into Claude, Claude fetches and structures it, then calls `add_recipe` via MCP |
| In-app AI chat (web or iPhone) | Same reason — Claude Desktop / ChatGPT app IS the chat UI |
| Per-user AI cost budgets | Not needed — we don't call LLM APIs |
| Recipe generation feature | Same reason — Claude generates and calls `add_recipe` |
| Substitution / dietary inference feature | Same reason — handled by the user's external AI client |
| Self-hosted deployment as a first-class path | User accepted managed services (Vercel + Neon + Clerk) for shipping speed |
| Community ratings / reviews on shared recipes | Anti-feature — sharing is "here's my recipe," not a ratings platform |
| Comments on others' shared recipes | Out for now to avoid moderation overhead; revisit after social v2 ships |
| Ads or third-party tracking | Privacy posture for App Store + product values |
| OCR / extract recipe from cookbook photo | Deferred indefinitely — manual + MCP-driven input cover the use case |
| Grocery / Instacart integrations | Out of scope until shopping list itself proves valuable |
| Android in v1 | Expo gives this for free later; not a v1 goal |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Complete |
| FOUND-02 | Phase 1 | Complete |
| FOUND-03 | Phase 1 | Complete |
| FOUND-04 | Phase 1 | Complete |
| DATA-01 | Phase 2 | Pending |
| DATA-02 | Phase 2 | Pending |
| DATA-03 | Phase 2 | Pending |
| DATA-04 | Phase 2 | Pending |
| DATA-05 | Phase 2 | Pending |
| DATA-06 | Phase 2 | Pending |
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 5 | Pending |
| MCP-01 | Phase 3 | Pending |
| MCP-02 | Phase 3 | Pending |
| MCP-03 | Phase 3 | Pending |
| MCP-04 | Phase 3 | Pending |
| MCP-05 | Phase 3 | Pending |
| MCP-06 | Phase 3 | Pending |
| MCP-07 | Phase 3 | Pending |
| MCP-08 | Phase 3 | Pending |
| MCP-09 | Phase 3 | Pending |
| MCP-10 | Phase 3 | Pending |
| MCP-11 | Phase 3 | Pending |
| MCP-12 | Phase 3 | Pending |
| CLI-01 | Phase 4 | Pending |
| CLI-02 | Phase 4 | Pending |
| CLI-03 | Phase 4 | Pending |
| CLI-04 | Phase 4 | Pending |
| CLI-05 | Phase 4 | Pending |
| CLI-06 | Phase 4 | Pending |
| CLI-07 | Phase 4 | Pending |
| PHONE-01 | Phase 5 | Pending |
| PHONE-02 | Phase 5 | Pending |
| PHONE-03 | Phase 5 | Pending |
| PHONE-04 | Phase 5 | Pending |
| PHONE-05 | Phase 5 | Pending |
| PHONE-06 | Phase 5 | Pending |
| PHONE-07 | Phase 5 | Pending |
| WEB-01 | Phase 4 | Pending |
| WEB-02 | Phase 4 | Pending |
| WEB-03 | Phase 4 | Pending |
| WEB-04 | Phase 4 | Pending |
| WEB-05 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 45 total (enumeration corrected from header's "47" — actual ID count: FOUND=4, DATA=6, AUTH=4, MCP=12, CLI=7, PHONE=7, WEB=5)
- Mapped to phases: 45
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-13*
*Last updated: 2026-05-13 after roadmap creation (phase mappings populated)*
