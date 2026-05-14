import { createMcpHandler } from 'mcp-handler';

// Phase 1 mounts the MCP protocol surface with ZERO tools registered.
//
// Tool definitions land in Phase 3 (packages/api → MCP adapter), AFTER
// `withMcpAuth` + Clerk MCP OAuth wrap this handler. Threat T-02-02 is
// accepted for Phase 1 precisely because there is nothing to call here.
//
// Do NOT register tools, prompts, or resources in this file. Phase 3 owns
// the tool registration callback.
const handler = createMcpHandler(
  (_server) => {
    // Intentionally empty in Phase 1. Phase 3 will register tools here via
    // _server.tool(...) / _server.registerTool(...).
  },
  {},
  {
    basePath: '/api',
    maxDuration: 60,
    verboseLogs: false,
  },
);

// Plan verification greps for `as GET`, `as POST`, and `as DELETE` independently;
// all three match this consolidated form. DELETE is required for some MCP clients
// during session teardown (RESEARCH.md Pitfall 9). Biome's organizeImports rule
// forbids three separate `export` statements for the same symbol.
export { handler as GET, handler as POST, handler as DELETE };
