# Rico Recipe

## What This Is

A recipe app for individuals and households, whose first surface is an AI cooking assistant driven from Claude Desktop via MCP. Over time it grows into a native iPhone app, a web app, an in-app AI chat, and a CLI — all sharing one typed backend. The end-state is a polished, possibly monetized product where users can capture their recipe library, get AI help (meal planning, "what can I make tonight?", recipe generation), and cook hands-free on their phone — including offline in the kitchen.

## Core Value

A user can talk to an AI agent about their recipe library — adding, finding, planning, and generating recipes — and that same library and intelligence is available natively on iPhone and web.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can run an MCP server locally/remotely that exposes recipe tools (add, search, list, get) to Claude Desktop and other MCP clients
- [ ] User can add a recipe by pasting text or typing it in
- [ ] User can import a recipe from a URL (NYT Cooking, Serious Eats, food blogs) with structured extraction
- [ ] User can search and retrieve their recipes via the MCP tools
- [ ] User has an account; recipes are scoped to that account (multi-user/household-ready from day one)
- [ ] A minimal web admin exists for sign-in, viewing the library, and managing recipes
- [ ] A native iPhone app (Expo / React Native, App Store distribution) lets users browse and view recipes
- [ ] The iPhone app works offline in the kitchen — recipes available without network, sync when online
- [ ] AI chat surface (in web app, then iPhone) for "what can I make tonight?", meal planning, recipe generation
- [ ] CLI exposing the same tool surface for terminal users and agents
- [ ] Households / sharing: users can belong to a household and share recipes with members
- [ ] Cook-along experience on iPhone: stepped instructions, timers, ingredient scaling

### Out of Scope

- Self-hosting as a first-class deployment path — user opted for managed (Vercel + Neon) to ship faster
- Public recipe discovery / social feed — focus is personal + household libraries, not a community product
- Android app for v1 — Expo gives this for free later, not a v1 goal
- Recipe import from cookbook photos / OCR — deferred; URL + paste covers the input need for v1
- Built-in grocery / instacart integrations — out of scope until core value is proven

## Context

- **User profile:** Experienced developer; comfortable across stacks. Wants this to be a real product, not just a personal toy, but is the sole builder.
- **Why MCP first:** Driving the app from Claude Desktop in v1 means the product is useful before any custom UI is built. It also forces a clean, typed tool surface that web/iPhone/CLI then reuse.
- **Why managed services:** User originally considered self-hosting but agreed that for a solo-built, potentially-monetized product, the ops burden of self-hosting isn't worth it. Vercel + Neon + Clerk minimize ops time so focus stays on the product.
- **Offline is a real constraint, not aspirational:** Cooking happens in kitchens with bad wifi. The iPhone app must function offline; this shapes the data layer (local SQLite + sync) and must be sequenced early enough that it isn't bolted on.
- **Multi-tenant from day one:** Even though v1 is "just me using Claude Desktop," users should have accounts and recipes should be scoped to accounts/households. Retrofitting auth and tenancy onto a single-user schema is painful.

## Constraints

- **Tech stack**: Turborepo monorepo; Next.js 16 (web) on Vercel; Expo / React Native (iPhone); Neon Postgres; Drizzle ORM; tRPC for the typed API; Vercel AI SDK for LLM calls; `@modelcontextprotocol/sdk` (TypeScript) for the MCP server; Clerk for auth; shadcn/ui + Tailwind for web UI — chosen for managed-services velocity and shared types across surfaces
- **Hosting**: Managed services on Vercel + Neon + Clerk + EAS — user explicitly accepted paid hosting in exchange for shipping speed
- **Platforms**: Web + native iPhone (App Store via EAS). Android is a free bonus later, not a v1 goal.
- **Offline**: iPhone app must work without network for browsing and cook-along; sync layer (Expo SQLite + custom or Turso embedded replicas) is required, not optional
- **Multi-tenancy**: Auth and data isolation present from v1 even if there's only one user — schema and API designed for households from day one
- **Budget**: Comfortable with ~$0–30/month while building; cost scales with real users
- **Solo developer**: Single builder — scope and sequencing must respect that one person is shipping all of this

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| MCP server is the first user-facing surface | Ship useful product in weeks by leveraging Claude Desktop as the v1 UI; forces a clean tool API that all other surfaces reuse | — Pending |
| Native iPhone via Expo / React Native (not PWA) | User wants real native feel and App Store distribution; Expo shares ~70% of code with web | — Pending |
| Managed hosting (Vercel + Neon + Clerk) over self-hosting | Solo builder shipping a real product can't afford the ops tax of self-hosting | — Pending |
| Multi-user / household model from day one | Retrofitting tenancy is painful; build it in even though v1 has one user | — Pending |
| Offline-first iPhone with sync layer | Cooking happens with bad wifi; not optional for the core cook-along value | — Pending |
| Single typed tool surface (tRPC) consumed by web, iPhone, MCP, CLI | One backend, many front-doors — avoid drift between surfaces | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-13 after initialization*
