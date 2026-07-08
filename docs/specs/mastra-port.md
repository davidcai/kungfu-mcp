# Spec: Port kungfu-mcp from @modelcontextprotocol/sdk to @mastra/mcp

**Status:** Draft — not yet implemented
**Branch:** `feat/mastra-port`
**Date:** 2026-07-08

---

## Overview

This spec captures the plan to port the kungfu-mcp server from the imperative
`@modelcontextprotocol/sdk` + `@modelcontextprotocol/ext-apps` stack to Mastra's
declarative `@mastra/mcp` `MCPServer`. The goal is to compare the two approaches
and evaluate whether Mastra's declarative style is a better fit for this project.

**Current stack:**
- `@modelcontextprotocol/sdk` — `McpServer`, `WebStandardStreamableHTTPServerTransport`, `ResourceTemplate`
- `@modelcontextprotocol/ext-apps` — `registerAppTool`, `registerAppResource`, `RESOURCE_MIME_TYPE`, `useApp` (React)
- `hono` + `@hono/node-server` — HTTP server with manual session management

**Target stack:**
- `@mastra/mcp` — `MCPServer` (declarative constructor config, built on top of the SDK's low-level `Server`)
- `@mastra/core/tools` — `createTool` (Mastra's tool primitive)
- `@modelcontextprotocol/ext-apps` — **kept** (Mastra uses the same package for MCP Apps guest-side)

---

## What stays unchanged

| File | Why it's untouched |
|---|---|
| `src/data.ts` | Pure faction dataset, framework-agnostic |
| `src/format.ts` | Pure markdown formatting functions, no framework deps |
| `src/ui/` (all files) | React app uses `useApp` from `@modelcontextprotocol/ext-apps/react` — Mastra uses the same guest-side SDK |
| `mcp-app.html` | Vite entry shell, unchanged |
| `vite.config.ts` | Build pipeline unchanged — still produces `dist/mcp-app.html` |
| `tsconfig.ui.json` | UI typecheck config unchanged |

---

## What changes — file by file

### `src/tools.ts` — imperative `registerTool` → declarative `createTool`

**Current:** 3 imperative `server.registerTool()` calls on a passed-in `McpServer`,
each returning `{ content, structuredContent }` in a single result object.

**Ported:** 3 `createTool()` objects exported individually, no `McpServer` parameter.

```ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const listFactionsTool = createTool({
  id: "list_factions",
  description: "...same...",
  inputSchema: z.object({}),
  outputSchema: z.object({
    factions: z.array(z.object({ id: z.string(), name: z.string(), catchphrase: z.string() })),
  }),
  execute: async () => ({
    factions: KUNGFU_FACTIONS.map((f) => ({ id: f.id, name: f.name, catchphrase: f.catchphrase })),
  }),
  toModelOutput: () => [{ type: "text" as const, text: rosterMarkdown() }],
});

export const getFactionTool = createTool({
  id: "get_faction",
  description: "...same...",
  inputSchema: z.object({ id: z.string().describe("...") }),
  execute: async ({ id }) => {
    const faction = findFaction(id);
    if (!faction) throw new Error(`No faction with id "${id}"...`);
    return { markdown: profileMarkdown(faction) };
  },
  toModelOutput: (output) => [{ type: "text" as const, text: output.markdown }],
});

export const sparTool = createTool({
  id: "spar",
  description: "...same...",
  inputSchema: z.object({
    faction_a: z.string(), faction_b: z.string(),
    champion_a: z.string().optional(), champion_b: z.string().optional(),
  }),
  outputSchema: z.object({
    rounds: z.array(z.string()), verdict: z.string(), winnerId: z.string().nullable(),
  }),
  execute: async ({ faction_a, faction_b, champion_a, champion_b }) => {
    // ...same runSpar logic...
    return outcome;
  },
  toModelOutput: (outcome) => [{ type: "text" as const, text: sparNarration(...) }],
});
```

**Key difference:** Mastra splits the dual-consumer pattern into two config keys:
- `outputSchema` + `execute` → produces `structuredContent` (for the UI)
- `toModelOutput` → produces `content` array (for the LLM)

The current SDK merges both into one return value (`{ content, structuredContent }`).

### `src/resources.ts` — `registerResource` + `ResourceTemplate` → declarative `resources` config

**Current:** 2 imperative registrations — a static resource and a `ResourceTemplate`
with `list` and `complete` callbacks for autocomplete.

**Ported:** One config object implementing `MCPServerResources`.

```ts
import type { MCPServerResources } from "@mastra/mcp";

export const kungfuResources: MCPServerResources = {
  listResources: async () => [
    { uri: "kungfu://kungfu/roster", name: "Kung Fu Roster", mimeType: "text/markdown",
      description: "The full kung fu faction roster, as markdown." },
    ...KUNGFU_FACTIONS.map((f) => ({
      uri: `kungfu://factions/${f.id}`, name: `${f.name} profile`,
      description: `Profile for ${f.name} — ${f.faction}`, mimeType: "text/markdown",
    })),
  ],
  getResourceContent: async ({ uri }) => {
    if (uri === "kungfu://kungfu/roster")
      return { text: rosterMarkdown() };
    const id = uri.split("/").pop() ?? "";
    const faction = findFaction(decodeURIComponent(id));
    return { text: faction ? profileMarkdown(faction) : `# Not found\n\nNo faction with id "${id}"...` };
  },
};
```

**Key difference:** No `ResourceTemplate` class. Mastra flattens templates into
`listResources()` (enumerate all URIs) + `getResourceContent({ uri })` (resolve by
URI). The `complete` callback for autocomplete is **lost** — Mastra has no equivalent.

### `src/app.ts` — `registerAppTool` + `registerAppResource` → `appResources` config + tool `mcp._meta`

**Current:** 2 ext-apps calls — `registerAppTool` and `registerAppResource`.

**Ported:** One tool with `mcp._meta.ui.resourceUri` + one `appResources` entry.

```ts
import { createTool } from "@mastra/core/tools";

export const sparArenaTool = createTool({
  id: "spar_arena",
  description: "Launch the interactive spar arena...",
  inputSchema: z.object({}),
  execute: async () => ({ message: "Arena ready. Select two factions and begin the spar." }),
  toModelOutput: () => [{ type: "text" as const, text: "Arena ready. Select two factions and begin the spar." }],
  mcp: { _meta: { ui: { resourceUri: "ui://spar-arena/app.html" } } },
});

export const appResources = {
  "ui://spar-arena/app.html": {
    name: "Spar Arena",
    description: "Interactive spar arena UI.",
    htmlPath: path.resolve(process.cwd(), "dist", "mcp-app.html"),
  },
};
```

**Key difference:** The app resource is a static config entry (`htmlPath` read once
at startup via `readFileSync`), not a dynamic async handler. The tool-to-app link is
`mcp._meta.ui.resourceUri` — same mechanism, just on `createTool` instead of
`registerAppTool`.

### `server.ts` — Hono + manual session map → `MCPServer.startHTTP`

**Current:** 87 lines — Hono app, CORS middleware, session map, 3 route handlers
(POST/GET/DELETE `/mcp`).

**Ported:** ~20 lines.

```ts
import { MCPServer } from "@mastra/mcp";
import { createServer } from "node:http";
import { listFactionsTool, getFactionTool, sparTool, sparArenaTool } from "./src/tools.js";
import { kungfuResources, appResources } from "./src/index.js";

const mcpServer = new MCPServer({
  name: "kungfu-mcp",
  version: "1.0.0",
  tools: { list_factions: listFactionsTool, get_faction: getFactionTool, spar: sparTool, spar_arena: sparArenaTool },
  resources: kungfuResources,
  appResources,
});

const httpServer = createServer(async (req, res) => {
  const url = new URL(`http://localhost:${PORT}${req.url}`);
  if (url.pathname === "/mcp") {
    await mcpServer.startHTTP({ url, httpPath: "/mcp", req, res });
  } else {
    res.statusCode = 404; res.end();
  }
});

httpServer.listen(PORT, () => console.error(`kungfu-mcp listening on http://localhost:${PORT}/mcp`));
```

**Key difference:** Session management, CORS, and the GET/DELETE handlers are all
internal to `MCPServer.startHTTP`. Hono is dropped — `startHTTP` takes raw Node
`http.IncomingMessage` / `http.ServerResponse`.

---

## Tradeoffs

| Aspect | Current (`@modelcontextprotocol/sdk`) | Ported (`@mastra/mcp`) |
|---|---|---|
| **Style** | Imperative `registerTool` at runtime | Declarative constructor config |
| **Session mgmt** | Manual (87-line `server.ts`) | Internal to `startHTTP` |
| **Dual-consumer** | One return: `{content, structuredContent}` | Split: `execute`→structuredContent, `toModelOutput`→content |
| **Resource templates** | `ResourceTemplate` with `complete` autocomplete | Flattened to `listResources` — **no autocomplete** |
| **Error responses** | `{ content, isError: true }` | **Unclear** — Mastra's execute returns data or throws; `isError` MCP flag may not map cleanly |
| **Dependencies gained** | — | `@mastra/core`, `@mastra/mcp` (heavier) |
| **Dependencies lost** | — | `hono`, `@hono/node-server` (if Hono is dropped) |
| **UI code** | Unchanged | Unchanged (same `ext-apps/react`) |
| **`server.ts` size** | 87 lines | ~20 lines |

---

## Open questions (must resolve before implementation)

### 1. Error handling gap

The current `get_faction` and `spar` return `isError: true` for not-found factions.
Mastra's `createTool` execute returns data or throws — it's unclear whether thrown
errors become MCP `isError` responses or transport-level errors. Needs verification
against Mastra's `CallTool` handler source.

### 2. Hono vs plain Node HTTP

`MCPServer.startHTTP` takes Node's `http.IncomingMessage`/`http.ServerResponse`,
not Hono's `Request`/`Response`. Options:
- **Drop Hono** — use plain `node:http` (simplest, matches `startHTTP` signature)
- **Keep Hono** — use `startHonoSSE` (SSE transport, not StreamableHTTP) or build a bridge

Dropping Hono means losing the CORS middleware. The current CORS config exposes
`mcp-session-id` for browser-based hosts — does `startHTTP` handle this internally?

### 3. `toModelOutput` for text-only tools

`get_faction` has no `outputSchema` currently — it returns just markdown text. In
Mastra, without `outputSchema`, the execute return is stringified into
`content[0].text`. Options:
- Add an `outputSchema` with a `markdown` field + `toModelOutput` (explicit)
- Return a string and let Mastra auto-wrap it (implicit, may lose type safety)

### 4. Is the port worth it?

This is a demo server with 4 tools. The main draw of Mastra is
agents/workflows/Studio — none of which kungfu-mcp uses. The port:
- **Gains:** `server.ts` shrinks from 87→20 lines, declarative style, path to
  Mastra's agent/workflow ecosystem if the project grows
- **Loses:** resource autocomplete, `isError` flag control, adds heavier deps,
  loses Hono middleware flexibility

---

## Implementation order (when ready)

1. Install `@mastra/mcp` and `@mastra/core` deps
2. Port `src/tools.ts` — 4 `createTool` exports (resolve open question 3 first)
3. Port `src/resources.ts` — `MCPServerResources` config (resolve open question 1 for error handling)
4. Port `src/app.ts` — `sparArenaTool` + `appResources` config
5. Port `server.ts` — `MCPServer` constructor + `startHTTP` (resolve open question 2 first)
6. Update `package.json` — add Mastra deps, remove `hono`/`@hono/node-server` if dropped
7. Update `tsconfig.json` if import resolution changes
8. Run `npm run build` to verify both tsc targets + vite build pass
9. Run `npm run inspect` to verify tools/resources work via MCP Inspector
10. Test with `basic-host` to verify `spar_arena` App UI renders
11. Update `README.md` and `CLAUDE.md` to reflect the new stack
