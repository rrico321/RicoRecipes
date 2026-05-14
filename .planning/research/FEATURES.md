# Feature Research

**Domain:** Personal/household recipe app — MCP-first, cross-surface (Claude Desktop → web → iPhone → CLI)
**Researched:** 2026-05-13
**Confidence:** HIGH (recipe app domain is mature with well-established conventions; MCP patterns are newer but consistent across early entrants like mealie-mcp and paprika-3-mcp)

## Research Lenses Applied

This research is structured around three lenses requested in the project brief:

1. **Traditional recipe managers** — Paprika, Whisk, Mealime, Crouton, NYT Cooking, Mealie (the open-source self-hosted reference). Their conventions define table-stakes user expectations.
2. **AI-first recipe assistants** — ChefGPT, DishGen, Whisk AI Chef, SideChef, SuperCook (ingredient-driven). What LLMs unlock that traditional apps can't easily do.
3. **Multi-surface / MCP-shaped products** — mealie-mcp, paprika-3-mcp, HowToCook-mcp. What feature shapes survive being expressed as an MCP tool surface vs. needing UI affordances.

A guiding principle from the brief: **Rico Recipe is MCP-first.** Features are evaluated on "MCP-tool-ability" — features that map cleanly to a single typed tool (`addRecipe`, `searchRecipes`, `suggestFromPantry`) get prioritized over features that demand a UI to be useful (drag-and-drop meal calendar, recipe photo grid browser).

## Feature Landscape

### Table Stakes (Users Expect These)

Missing any of these makes the product feel broken to a typical recipe-app user. Most map cleanly to MCP tools, which is convenient given the MCP-first sequencing.

| Feature | Why Expected | Complexity | MCP-tool-able? | Notes |
|---------|--------------|------------|----------------|-------|
| **Manual recipe entry** (paste or type title, ingredients, instructions) | Bedrock of every recipe app since the 90s. Without it, the library can't grow. | LOW | YES — `addRecipe({title, ingredients[], instructions[], ...})` | Already in active reqs. Schema needs to handle freeform ingredients (`"2 cups flour"`) plus structured `{quantity, unit, name}` when parser can extract. |
| **URL import with structured extraction** | Every modern recipe app does this. Schema.org Recipe JSON-LD is on virtually all food blogs (NYT, Serious Eats, Bon Appétit, food bloggers using WP Recipe Maker/Tasty Recipes plugins). | MEDIUM | YES — `importRecipeFromUrl({url})` | Strategy: try JSON-LD first (covers ~80% of blogs), fall back to LLM extraction on raw HTML for outliers. Already in active reqs. |
| **Search across library** (title, ingredient, tag) | Without search, a library over 30 recipes is unusable. | LOW–MEDIUM | YES — `searchRecipes({query, filters})` | Postgres full-text (tsvector) is enough for v1; vector/embedding search is a later upgrade for semantic queries ("comfort food", "weeknight"). |
| **List / browse recipes** | Users need to see what they have without searching. | LOW | YES — `listRecipes({sort, limit, cursor})` | Pagination matters once library > 200 recipes. |
| **Tags / categories** (cuisine, course, occasion, custom) | Foundation of any non-trivial organization. Every app has these. | LOW | YES — flat tag array on recipes; `listTags()` | Don't over-engineer with folders/collections in v1 — tags are flatter and compose better with search. |
| **Ingredient scaling / serving size adjustment** | Paprika, NYT Cooking, Whisk, Crouton — all do this. Cooks regularly halve/double. | MEDIUM | YES — `scaleRecipe({recipeId, targetServings})` returning a derived view | Requires parsed ingredients (`{quantity, unit, name}`). Free-text ingredients fall back to "scale ratio" annotation. Tricky for non-linear ingredients (leavening, salt, spices) — most apps just scale linearly and accept the imperfection. |
| **Unit conversion** (metric ↔ imperial) | Expected especially internationally. Recipes from US food blogs need metric for non-US users and vice versa. | MEDIUM | YES — applied as transform in `getRecipe({recipeId, units: 'metric' \| 'imperial'})` | Density tables needed for volume↔weight (cups of flour vs. cups of water). Ship simple linear conversions in v1; ingredient-aware density later. |
| **Cook mode** (screen-on, large text, step-by-step, integrated timers) | The defining mobile recipe app feature. Paprika, NYT Cooking, Crouton, Whisk all have it. Users penalize harshly if absent on phone. | MEDIUM | NO — fundamentally a UI mode (`expo-keep-awake`, timer state, gesture nav) | iPhone-only need. Already in active reqs. See Cook-along section below for full detail. |
| **Shopping list generation** (from one or many recipes, aisle-sorted, ingredients combined) | Universally expected. Paprika auto-sorts by aisle and merges duplicates (1 egg + 2 eggs → 3 eggs). | MEDIUM–HIGH | PARTIAL — `addToShoppingList({recipeIds[]})` and `getShoppingList()` are clean; UI to check items off needs a surface | Merging is the hard part (unit normalization, ingredient name fuzzing). Aisle sorting is a lookup table by ingredient category. Defer to mid-roadmap; not v1-critical given MCP-first launch. |
| **Multi-device sync** (cloud-backed library) | Set by Paprika Cloud Sync, Whisk, NYT Cooking. Users expect "log in on phone, recipes appear." | MEDIUM | NA — comes for free from server-of-record architecture | Already implied by the chosen stack (Neon + tRPC backend). The hard mode is offline-sync (see iPhone constraints). |
| **Offline access** (phone works in the kitchen) | Cooks have hands wet/floury; bad kitchen wifi is universal. This is table-stakes for mobile recipe apps in 2026. | HIGH | NO — local DB + sync layer (Expo SQLite, Turso embedded replicas, or PowerSync) | Already in active reqs. Sequence early — bolting on later is painful. |
| **Recipe editing** | If you can add, you must be able to edit. | LOW | YES — `updateRecipe({recipeId, patch})` | |
| **Delete / archive** | Bare-minimum hygiene. | LOW | YES — `deleteRecipe`, optional `archiveRecipe` | Soft-delete (deleted_at) recommended over hard-delete for household concurrency. |
| **Notes per recipe** (user's modifications, "added more garlic", "use this oven, not the toaster") | NYT Cooking, Paprika, Crouton all have this. Personal tweaks are why people keep a library instead of using the original URL. | LOW | YES — `addRecipeNote({recipeId, note})` or just a `notes` field on the recipe | |
| **Photos on recipes** | Visual aid both for selection and during cooking. Imported recipes pull a hero image from OG tags / schema.org. | LOW–MEDIUM | YES — `setRecipePhoto({recipeId, url \| base64})` | Image storage = Vercel Blob or similar. For imports, pulling the URL is enough (don't proxy unless rights are clear). |
| **Auth + user accounts** | Multi-tenant from day one is a stated constraint. | MEDIUM | NA — Clerk handles this | Already in active reqs and constraints. |
| **Household / sharing** | Couples and families share recipes. Mealie, Paprika (via shared accounts), Whisk all support a form of sharing. | MEDIUM | YES — `inviteToHousehold({email})`, recipes scoped to household | Already in active reqs. The schema must scope by `householdId` from day one, not `userId`. |
| **Recipe metadata** (prep time, cook time, total time, servings, source URL, source name) | Every app has these fields; they show up in cards, in cook mode, in shopping list calculations. | LOW | YES — fields on `Recipe` model | Standardize on the schema.org Recipe vocabulary — interop with imports is free. |
| **Dietary tags / allergen flags** | Vegetarian, vegan, gluten-free, dairy-free, nut-free, etc. Yummly, SavvyChef, the Allergy Force apps all do this. | LOW–MEDIUM | YES — tag-based; filter param on search | Two flavors: (a) user-set tags on their own recipes, (b) LLM-inferred from ingredients during import. (b) is a differentiator (see below). |
| **Step numbering and structured instructions** | NYT Cooking, Crouton, etc. all have stepped instructions, not a wall of text. Required for cook mode. | LOW | YES — `instructions: string[]` on the model | Imports often give a single string; LLM split into steps during import is cheap and improves cook-mode UX immensely. |
| **Pantry / what-I-have-on-hand list** | Paprika has this. SuperCook is built entirely around it. ChefGPT's PantryChef mode reads from a tracked pantry. | MEDIUM | YES — `addToPantry`, `removeFromPantry`, `getPantry`, `suggestFromPantry` | Bridge between table stakes and differentiator. Without pantry tracking, the AI "what can I make tonight?" question has no good answer. |

### Differentiators (AI-First / MCP-First Competitive Advantage)

These are where Rico Recipe wins. Traditional apps either don't do them or do them clumsily because they don't have a conversational surface.

| Feature | Value Proposition | Complexity | MCP-tool-able? | Notes |
|---------|-------------------|------------|----------------|-------|
| **"What can I make tonight?" from pantry + constraints** | The killer demo. User says "what can I make in 30 minutes with what I have, that's vegetarian?" — Claude calls `getPantry` + `searchRecipes` + reasons over the gap, suggests recipes plus the 1–2 ingredients to grab. SuperCook does the matching, but doesn't reason about substitutions or constraints. | MEDIUM | YES — composes `getPantry()`, `searchRecipes({ filters })`, `suggestFromPantry({ time, dietary, mood })` | This is the single most compelling demo for the MCP-first thesis. Make the tool returns rich enough that Claude can reason over the result rather than just dumping a list. |
| **Conversational recipe generation** (LLM produces a novel recipe, optionally saves to library) | ChefGPT, DishGen, Microsoft Copilot all do this. With MCP, the user doesn't context-switch — they're already in Claude, they ask, the recipe is generated and saved with one tool call. | MEDIUM | YES — `generateRecipe({prompt, constraints})` returning a draft; `addRecipe` to persist | Differs from generic ChatGPT use because the output is durable in their library. Trick: structured output (Zod schema) so the generation always slots into the recipe shape. |
| **Smart substitutions** ("I don't have buttermilk, what works?") | Whisk AI Chef and SideChef do this. Traditional apps either link to static substitution tables or don't address it. | LOW–MEDIUM | YES — `suggestSubstitution({recipeId, ingredient, reason})` returning suggestions with confidence/notes | Mostly LLM passthrough with light grounding. Cheap to ship, high perceived value. |
| **Dietary / allergen inference from ingredients during import** | When importing a recipe, automatically tag it `gluten-free`, `vegetarian`, `contains-nuts`, etc. by analyzing ingredients. Saves users from manual tagging and powers reliable dietary filtering. | LOW–MEDIUM | YES — invoked inside `importRecipeFromUrl`; no separate tool needed | LLM call with a tight schema. Top-9 allergens (FDA) + common diets (vegetarian, vegan, GF, DF, keto). Confidence flag so user can correct. |
| **Conversational meal planning** ("plan me a week of dinners, vegetarian Mondays, salmon Wednesday, leftover-friendly Friday") | Mealime does menus but only from its own database. Plan to Eat does manual planning. Nobody does conversational planning that respects your library + constraints. | MEDIUM–HIGH | YES — `planMeals({startDate, endDate, constraints})` + `addToMealPlan` | This is where pantry, library, dietary tags, and shopping list compose. Defer until those primitives exist. |
| **Recipe Q&A in context** ("can I make this without a stand mixer?", "what does 'fold' mean?", "what's a sub for cake flour?") | Comes essentially for free with MCP — Claude can answer using its own knowledge, but having `getRecipe` to pull exact context makes answers precise instead of generic. | LOW | YES — `getRecipe({recipeId})` is enough; Claude does the reasoning | Cheapest differentiator. Already free if `getRecipe` exists. |
| **Ingredient parsing / normalization from messy input** | When a user pastes "2 c. all-purpose flour, sifted" — parse to `{quantity: 2, unit: 'cup', name: 'all-purpose flour', prep: 'sifted'}`. Powers scaling, shopping list merging, pantry matching. | MEDIUM | NA — internal capability, not exposed as a tool | LLM-based parser with structured output is dramatically more robust than regex (which is what Paprika and others use, with notable failure modes). |
| **Auto-split walls of text into stepped instructions on import** | Improves cook-mode dramatically. LLM does it well; traditional apps don't. | LOW | NA — internal to import | |
| **CLI parity** (same tools usable from `rico add`, `rico search`, etc.) | Power users (the target user is "experienced developer") will use this. Also: identical surface means dogfooding via terminal. | LOW–MEDIUM | YES — CLI is just a tRPC/MCP client | Already in active reqs. Compose existing tool surface; no new business logic. |
| **Cook-along via Claude voice** (eventual: voice-driven cook-along on phone using MCP + Claude's voice features) | Future-looking, but the MCP-first architecture makes it cheap to support whenever Anthropic ships voice surfaces. | HIGH | YES — `nextStep`, `previousStep`, `startTimer`, `repeatStep` tools | Defer past v1, but design tool shapes that don't preclude it (small atomic tools, not chunky ones). |
| **Recipe history / "what did I cook"** (auto-log when cook mode was used, queryable later) | Differentiator over Paprika/Crouton. "What did I make last Thursday?" / "what have I made twice this month?" is a natural Claude query. | LOW | YES — `logCook({recipeId, date})`, `getCookHistory({range})` | Cheap to add once recipes exist. Powers nice "you tend to repeat these" insights later. |
| **Schema.org-compatible export** (recipes export back to JSON-LD or markdown) | Users distrust lock-in; exportability is a trust signal and free from the schema choice. | LOW | YES — `exportRecipe({recipeId, format})` | Markdown export is also great for sharing recipes via email/chat without granting account access. |

### Cook-Along Must-Haves (The Hands-Free Kitchen Experience)

A distinct category from the brief. Cook-along is mostly a phone UI concern, not an MCP concern — but the data model and tools must support it from day one or the iPhone phase will require schema changes.

| Feature | Why Required | Complexity | Notes |
|---------|--------------|------------|-------|
| **Screen stays awake** while in cook mode | Standard since `expo-keep-awake`. Universal across recipe apps. | LOW | Bare-minimum iPhone requirement. |
| **Stepped instructions with current-step highlighting** | The defining cook-mode UI pattern (Paprika, NYT Cooking, Crouton). | LOW | Requires `instructions: string[]`, not blob text. Data-model decision, not UI. |
| **Tap-to-advance / large hit targets** | Hands wet/floury → can't precisely tap. UX research consistently calls this out. | LOW | UI concern; full-screen tap zones to advance/go back. |
| **Auto-detected timers in steps** | Paprika and NYT Cooking parse "bake for 25 minutes" → tappable timer. | MEDIUM | Regex on instruction text is good enough for v1; LLM can pre-annotate during import as a stronger version. |
| **Multiple concurrent timers** (sauce simmering while pasta boils) | Most serious cooks need this. | MEDIUM | iOS LiveActivities / background timers to survive backgrounding. |
| **Ingredient checklist visible during cooking** | Paprika lets you cross off ingredients in cook mode. | LOW | Reads from parsed ingredients. |
| **Servings scaler accessible in cook mode** | Common "halving the recipe" mid-cook need. | LOW | Same scaling logic as elsewhere, exposed in the cook-mode shell. |
| **Voice control** ("next step", "repeat", "set timer") | KudoCook, Voicipe, Vule — emerging pattern. Solves hands-busy problem decisively. | HIGH | Defer past v1. Native iOS Speech framework or Whisper. Real value, real complexity. Note that the MCP architecture means "voice" can also eventually mean Claude voice on the phone calling tools. |
| **Pinned recipe / picture-in-picture style mini-mode** | Newer iOS pattern; lets user check messages without losing place. | MEDIUM | iOS 16+ Stage Manager / activity-style. Nice-to-have, defer. |
| **Step-by-step with photos per step** (where available) | Bon Appétit / Serious Eats imports sometimes have these. | LOW data, MEDIUM UI | Add when imports surface them; not blocking. |

### Anti-Features (Deliberately NOT Building)

The brief is explicit on some of these; others are inferred from the product positioning ("personal + household, not social", "MCP-first") and from common recipe-app failure modes.

| Feature | Why Requested / Tempting | Why Problematic | Alternative |
|---------|--------------------------|-----------------|-------------|
| **Public recipe discovery / social feed / followers** | Every consumer app trends toward social. Whisk has it; Yummly has it. | Stated out-of-scope. Personal/household focus is the wedge. Social feeds bring moderation burden, content rights issues, and ranking/ML overhead that kills a solo-built product. | Household sharing is the only "social" feature. Anything more = different product. |
| **Recipe ratings / stars (community)** | NYT Cooking, Allrecipes use these. Feels like a basic. | Requires a public corpus, which we don't have. Personal ratings are pointless on your own recipes (you wouldn't save it if you didn't like it). | If anything, support a free-text "verdict" field on the user's notes. Not stars. |
| **Ads / sponsored recipes** | Monetization path. | Erodes the trust signal that makes "your library" feel safe. Inconsistent with the premium-positioned, possibly-paid product. | Charge directly (subscription/one-time) when the product warrants it. |
| **Built-in grocery delivery integrations** (Instacart, Walmart) | Whisk has this; meal-kit and grocery apps want it. | Stated out-of-scope. Each integration is a partnership and a rabbit hole. Defer until "core value proven" per project brief. | Export shopping list to clipboard/share sheet; user pastes into their grocery app. Cheap and respectful. |
| **OCR / recipe-from-cookbook-photo** | Fond does this; users ask for it. | Stated out-of-scope ("URL + paste covers input for v1"). LLM vision can do it, but the UX (multi-page cookbook, handwritten cards) is its own product. | Paste OCR result as text and let the LLM extractor do the parsing — works today, no new infra. |
| **Android v1** | Expo gives it "for free" — why not? | Stated out-of-scope. "Free" is a lie — App Store + Play Store doubles QA, reviews, and store-listing maintenance for one solo dev. | Ship to App Store first; Android is a real release effort later, not v1. |
| **Self-hosting as first-class** | Mealie's positioning. Appealing for technical users. | Stated out-of-scope. Solo builder can't run two distribution models. | Single hosted product (Vercel + Neon + Clerk). |
| **Calorie / macro tracking and weight-loss features** | Whisk does basic macros; Mealime has them. | Drifts into MyFitnessPal territory — different product, different competitive set, different regulatory surface (health claims). | Show nutrition info if a recipe import provides it (passthrough from schema.org). Don't build calculation. |
| **Real-time collaborative editing on recipes** (Google-Docs-style) | Households "cooking together". | Massive complexity (OT/CRDT) for negligible real value — recipes are rarely co-edited live. | Last-write-wins with simple conflict surfacing is enough at the household scale (1–5 users). |
| **Recipe versioning / full history** | "What changed since I last cooked this?" | Schema and UI complexity. Not requested. | Notes + updated_at timestamp on recipes. Sufficient. |
| **Custom recipe collections / nested folders** | Paprika has categories; users ask for folders. | Tags + saved searches do this better and compose with AI queries. | Flat tags + saved-filter URLs. |
| **In-app community / commenting** | Some attempt at social-lite. | Same problems as social feed. | None — out of scope. |
| **Built-in voice assistant that competes with Siri/Claude** | Tempting given cook-along voice need. | Building voice-from-scratch is a whole product. Claude (the MCP client) is already the voice surface. | Bet on Claude voice + MCP integration as the eventual voice path; native cook-along voice in v2 if at all. |
| **Ranking AI-generated recipes against the web** ("is this any good?") | LLMs can hallucinate gross recipes. | Out of scope and low ROI for a personal library. | Trust the user to delete what they don't like; auto-tag AI-generated recipes so they're filterable. |

## Feature Dependencies

```
Auth (Clerk)
  └── Household model
        └── All recipe-scoped features
              ├── Add recipe (manual)
              ├── Import recipe from URL ──> Ingredient parser (LLM)
              ├── List / search recipes
              ├── Tags / dietary inference ──> Ingredient parser
              ├── Photos
              ├── Edit / delete / notes
              ├── Stepped instructions (data shape)
              │     └── Cook mode (iPhone UI)
              │           ├── Screen-awake
              │           ├── Auto-detected timers
              │           ├── Ingredient checklist
              │           └── (later) Voice control
              ├── Parsed ingredients ({quantity, unit, name})
              │     ├── Scaling
              │     ├── Unit conversion
              │     ├── Shopping list (merge + aisle-sort)
              │     └── Pantry matching
              │           ├── Pantry CRUD
              │           └── "What can I make tonight?" ──> LLM via MCP
              ├── Recipe generation (LLM) ──> uses Recipe schema
              ├── Substitution suggestions (LLM) ──> uses getRecipe
              └── Meal planning ──> needs library + pantry + dietary tags + shopping list

Server-of-record (tRPC backend on Vercel + Neon)
  ├── MCP server (Claude Desktop) ──> v1 user surface
  ├── Web admin (Next.js)         ──> v1 minimal surface
  ├── iPhone (Expo)               ──> needs offline-sync
  │     └── Local SQLite + sync layer ──> blocks cook-mode + offline
  └── CLI                          ──> trivial once tools exist
```

### Dependency Notes

- **Ingredient parser is the single biggest internal dependency.** It unlocks scaling, unit conversion, shopping list merging, pantry matching, dietary tagging, and "what can I make tonight?". Build it once, well, with LLM + structured output, and a lot of features become cheap.
- **Stepped instructions (data shape) blocks cook mode.** A recipe must store `instructions: string[]`, not a blob, or the iPhone phase will require a backfill. Decide now.
- **Household model is upstream of every recipe-scoped feature.** Project brief is right to require this from day one — retrofitting is painful (project context line 46).
- **Offline-sync blocks the iPhone phase entirely.** Sequence the sync layer early in the iPhone work, not late. Bolting it on at the end is the failure mode the project brief explicitly warns about.
- **Pantry depends on parsed ingredients to be useful.** A free-text pantry list can't answer "what can I make tonight?" reliably.
- **Meal planning is downstream of nearly everything.** It composes library, pantry, dietary tags, and shopping list — defer it.
- **Recipe import from URL has two paths:** JSON-LD parsing (fast, deterministic, covers ~80% of food blogs) and LLM fallback (covers the rest). Build both; they compose.

## MCP-Tool-ability Audit

Per the brief, here's the explicit MCP-fitness rating for each non-trivial feature:

| Feature | Maps Cleanly to MCP Tool? | Needs UI? |
|---------|---------------------------|-----------|
| Add / edit / delete recipe | YES — atomic CRUD tools | No |
| Import recipe from URL | YES — one tool, returns recipe | No |
| Search / list recipes | YES — query + filter params | No |
| Get recipe (single) | YES | No |
| Tags / categorize | YES — exposed as fields on add/update | No |
| Notes | YES — `addRecipeNote` | No |
| Photos | PARTIAL — URL-based works in MCP; upload needs UI | Upload yes |
| Scaling | YES — derived view via `getRecipe({scaleTo})` or `scaleRecipe` | No (also nice in UI) |
| Unit conversion | YES — param on getRecipe | No |
| Pantry CRUD | YES | UI nice-to-have |
| Suggest from pantry | YES — composes well in conversation | No |
| Recipe generation | YES — structured output | No |
| Substitutions | YES | No |
| Meal planning | YES — `planMeals` returns plan; `addToMealPlan` | UI strongly preferred for browse |
| Shopping list (build) | YES — `addRecipeToShoppingList`, `getShoppingList` | UI required for "check off" |
| Cook mode | NO — fundamentally a UI mode | iPhone UI required |
| Sync / offline | NO — infrastructure, not user-facing | iPhone infra |
| Auth | NO — Clerk, not a tool | Web UI |
| Household management | YES — `invite`, `getHousehold` | UI nice for browsing |
| Recipe history / "what did I cook" | YES — `logCook`, `getCookHistory` | UI nice for timeline view |
| Export | YES — `exportRecipe({format})` | No |

**MCP-first verdict:** ~80% of value features fit cleanly in MCP tools. The exceptions are cook-mode (intrinsically a phone UX) and shopping-list check-off (intrinsically interactive). Both are surface-level UI, not architectural — they sit on top of the same tool surface.

## MVP Definition

### Launch With (v1 — MCP + Minimal Web)

The minimum that delivers the core value: "user has a recipe library, Claude can manage it, basic AI assistance works."

- [ ] **Auth + household model** — non-negotiable (constraint)
- [ ] **MCP server** — primary user surface in v1
- [ ] **Add recipe (manual)** — bedrock
- [ ] **Import recipe from URL** with JSON-LD + LLM fallback — biggest unlock for library growth
- [ ] **List / search / get recipe** — bedrock
- [ ] **Edit / delete recipe** — bedrock
- [ ] **Tags** (user-set) — basic organization
- [ ] **Notes per recipe** — bedrock
- [ ] **Photos** (URL/import only) — table stakes for browse
- [ ] **Stepped instructions data shape** — invest now to unblock cook mode later
- [ ] **Parsed ingredients** (`{quantity, unit, name}`) — internal capability that unlocks many downstream features
- [ ] **Dietary tag inference on import** — cheap differentiator powered by the parser
- [ ] **Recipe generation tool** — keystone AI differentiator
- [ ] **Substitution suggestion tool** — cheap, high-value AI differentiator
- [ ] **Minimal web admin** (sign in, browse library, manage recipes) — required by project brief
- [ ] **Export recipe** (Markdown + JSON-LD) — cheap, builds trust

### Add After Validation (v1.x — iPhone + Cook-Along)

Once v1 proves people use the MCP surface and library grows.

- [ ] **iPhone app (Expo)** — browse + view library
- [ ] **Offline-first sync layer** — must ship with iPhone, not after
- [ ] **Cook mode** (screen-awake, stepped instructions, ingredient checklist, in-recipe scaling)
- [ ] **Auto-detected timers in cook mode**
- [ ] **Scaling + unit conversion** exposed in UI (logic exists from v1)
- [ ] **Pantry CRUD + "what can I make tonight?"** — once pantry UI exists; tool surface lights up immediately
- [ ] **Recipe history / cook log**
- [ ] **CLI** — trivial wrapper; ship whenever convenient
- [ ] **Web in-app AI chat** — once tool surface is stable

### Future Consideration (v2+ — Compositions)

Features that compose existing primitives; defer until primitives are battle-tested.

- [ ] **Shopping list** (build + aisle-sort + merge) — needs robust ingredient parser proven in production
- [ ] **Conversational meal planning** — needs library + pantry + dietary tags + shopping list
- [ ] **Multiple concurrent timers + LiveActivities**
- [ ] **Voice control in cook mode** (native or via Claude voice when available)
- [ ] **Semantic / embedding search** ("comfort food", "weeknight") — once full-text proves insufficient
- [ ] **Recipe-from-photo (OCR / cookbook)** — explicitly deferred by brief
- [ ] **Android** — explicitly deferred
- [ ] **Public sharing / household browsing UX polish**
- [ ] **Step-by-step photos** (when imports surface them)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| MCP server with CRUD tools | HIGH | LOW | P1 |
| URL import (JSON-LD + LLM fallback) | HIGH | MEDIUM | P1 |
| Manual recipe add | HIGH | LOW | P1 |
| Search / list / get | HIGH | LOW | P1 |
| Stepped instructions data shape | MEDIUM (now) HIGH (later) | LOW | P1 |
| Parsed ingredients (internal) | HIGH (compounding) | MEDIUM | P1 |
| Tags + dietary inference | HIGH | LOW | P1 |
| Recipe generation tool | HIGH | MEDIUM | P1 |
| Substitution tool | MEDIUM | LOW | P1 |
| Household model + auth | HIGH (constraint) | MEDIUM | P1 |
| Minimal web admin | MEDIUM | MEDIUM | P1 |
| Export recipe | LOW | LOW | P1 (trust signal) |
| iPhone offline sync layer | HIGH | HIGH | P2 |
| Cook mode (full) | HIGH | MEDIUM | P2 |
| Pantry + "what can I make tonight?" | HIGH | MEDIUM | P2 |
| Scaling + unit conversion UI | MEDIUM | LOW | P2 |
| CLI | LOW–MEDIUM | LOW | P2 |
| Recipe history | LOW | LOW | P2 |
| In-app web AI chat | MEDIUM | MEDIUM | P2 |
| Shopping list | HIGH | HIGH | P3 |
| Conversational meal planning | HIGH | HIGH | P3 |
| Voice control in cook mode | MEDIUM | HIGH | P3 |
| Semantic search | LOW | MEDIUM | P3 |
| Android | LOW (v1) | LOW (additive) | P3 |
| OCR / cookbook photo | MEDIUM | HIGH | P3 |

**Priority key:**
- **P1**: Must have for v1 launch (MCP-first MVP)
- **P2**: Add immediately after v1 validates, primarily in iPhone phase
- **P3**: Future consideration, defer until primitives are battle-tested

## Competitor Feature Analysis

| Feature | Paprika | NYT Cooking | Whisk | Crouton | Mealime | SuperCook | ChefGPT | Mealie (OSS) | **Rico Recipe** |
|---------|---------|-------------|-------|---------|---------|-----------|---------|--------------|-----------------|
| URL import | Browser-extension web clipper | Internal only | Strong (incl. social) | Yes | No | No | Yes (limited) | Yes | **JSON-LD + LLM fallback** |
| Manual add | Yes | No (curated) | Yes | Yes | No | No | Limited | Yes | **Yes (primary path)** |
| Cook mode | Excellent | Excellent | Good | Excellent (iOS) | N/A | N/A | N/A | Basic | **Yes (iPhone, v1.x)** |
| Scaling | Yes | Yes | Yes | Yes | No | N/A | Limited | Yes | **Yes (parsed-ingredient based)** |
| Shopping list | Excellent (aisle-sort + merge) | Yes | Excellent (+ delivery) | Yes | Yes | Limited | No | Yes | **Yes (v2)** |
| Meal planning | Basic | Basic | Yes | Limited | Yes (auto) | N/A | Yes | Yes | **Conversational (v2)** |
| Pantry tracking | Yes | No | No | No | No | Yes (core) | Yes | Partial | **Yes (v1.x, MCP-first)** |
| AI recipe generation | No | No | Yes (AI Chef) | No | No | No | Yes (core) | No | **Yes (v1, MCP-first)** |
| AI substitutions | No | No | Yes | No | No | No | Yes | No | **Yes (v1)** |
| Dietary tag inference | No (manual) | Curated tags | Manual | Manual | Built-in (own corpus) | No | Yes | Manual | **Yes (LLM on import)** |
| Multi-surface (phone + web) | Yes | Yes | Yes | iOS only | Phone-first | Phone + web | Web-first | Self-hosted web | **Yes (phone + web + MCP + CLI)** |
| Conversational interface | No | No | Limited chat | No | No | No | Chat-based | No | **MCP-first (Claude Desktop)** |
| Offline (mobile) | Yes | Limited | Limited | Yes | Limited | No | No | Self-hosted | **Yes (required, sync layer)** |
| Household sharing | Via shared account | Account share | Yes | Limited | Limited | No | No | Yes (groups) | **Yes (first-class)** |
| Export / portability | Limited | No | Limited | Limited | No | No | No | Yes (good) | **Yes (Markdown + JSON-LD)** |
| CLI / programmatic | No | No | No | No | No | No | No | API | **Yes (CLI + tRPC + MCP)** |
| Recipe ratings / social | No | Yes (community) | Yes | No | No | No | No | No | **Deliberately no** |
| Ads | No | No | Some | No | No | Yes | No | No | **Deliberately no** |

**Where Rico Recipe wins:**
- **MCP-first conversational surface** — no competitor leads with this; Claude users get value on day one.
- **AI as a feature primitive, not bolted on** — generation, substitution, dietary inference, ingredient parsing all leverage LLMs in the data layer, not as side panels.
- **Multi-surface from one typed backend** — Paprika/NYT/Whisk all have phone+web but different codebases; Rico's tRPC monorepo gives parity for less work.
- **Personal/household focus + portability + no ads** — clean trust signal vs. Whisk's social/delivery direction or ad-funded apps.

**Where Rico Recipe defers:**
- Shopping list and meal planning aren't v1, even though they're table-stakes for traditional recipe apps. The MCP-first thesis lets us skip them in v1 because Claude-driven users don't expect them in the chat interface yet; they will eventually.

## Sources

- [Paprika Recipe Manager — official site & app store listings](https://www.paprikaapp.com/)
- [Paprika app review: pros and cons — Plan to Eat](https://www.plantoeat.com/blog/2023/07/paprika-app-review-pros-and-cons/)
- [7 Best Recipe Apps in 2026 — Fond](https://fond.kitchen/guides/best-recipe-apps/)
- [12 Best Recipe Apps in 2026 — RecipeOne](https://www.recipeone.app/blog/best-recipe-manager-apps)
- [Best Recipe Manager Apps of 2025 — BeChef](https://www.bechef.app/blog/recipe-app-comparison)
- [SuperCook — recipe search by ingredients](https://www.supercook.com/)
- [DishGen AI recipe generator](https://www.dishgen.com/)
- [ChefGPT AI recipe generator](https://www.chefgpt.xyz/)
- [The Best AI Recipe Generators of 2025 — AutoGPT](https://autogpt.net/8-best-ai-recipe-generators-in-2025/)
- [Build a Recipe Finder Agent — CallSphere](https://callsphere.ai/blog/build-recipe-finder-agent-ingredient-matching-dietary-filters)
- [AI-powered Recipe Generator vs Cookbook App — Alibaba product insights](https://www.alibaba.com/product-insights/ai-powered-recipe-generator-vs-cookbook-app-which-handles-pantry-substitutions-more-intelligently.html)
- [Schema.org Recipe type](https://schema.org/Recipe)
- [Google Search Central: Recipe structured data](https://developers.google.com/search/docs/appearance/structured-data/recipe)
- [scrape-schema-recipe (GitHub) — JSON-LD recipe extraction reference](https://github.com/micahcochran/scrape-schema-recipe)
- [Voicipe — voice recipe reader](https://voicipe.com/)
- [Cook hands-free with voice commands — KudoCook](https://kudocook.com/cook-hands-free-with-voice-commands/)
- [Hands-Free Recipe Navigation UX case study — Medium](https://medium.com/@calebha_63744/handsfree-recipe-navigation-a-ux-case-study-of-finding-and-following-recipe-like-a-breeze-49cc4cafc408)
- [Recipe Scale Converter — Google Play](https://play.google.com/store/apps/details?id=com.recipe.unit.scale&hl=en)
- [Recipe Measurement Converter — RecipeCard](https://recipecard.io/recipe-unit-converter/)
- [Diet & Allergen Filters — SavvyChef](https://savvychef.co.uk/guides/diet-filters)
- [Allergy Force app recipe search](https://www.allergyforce.com/post/meet-the-app-recipe-search)
- [Mealie MCP Server — AIBase](https://mcp.aibase.com/server/1917149557592616961)
- [Paprika 3 MCP — AIBase](https://mcp.aibase.com/server/1917155320696336386)
- [HowToCook MCP — AIBase](https://mcp.aibase.com/server/1917154428102307841)
- [Build an MCP server — Model Context Protocol docs](https://modelcontextprotocol.io/docs/develop/build-server)

---
*Feature research for: personal/household recipe app, MCP-first, multi-surface*
*Researched: 2026-05-13*
