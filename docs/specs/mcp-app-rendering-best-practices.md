# MCP App Rendering: Best Practices & Patterns

**Status:** Reference
**Date:** 2026-07-08
**Scope:** Best-practice patterns for rendering MCP Apps (interactive UIs in chat) using `@modelcontextprotocol/sdk` + `@modelcontextprotocol/ext-apps`, as demonstrated by this project.

---

## Overview

An MCP App is a **tool** that points at a **`ui://` resource** (HTML). The host fetches that resource, renders it in a sandboxed iframe, and the React UI inside calls tools **back on the server** through a postMessage bridge. This requires four layers:

1. **HTTP transport** (Apps don't work over stdio)
2. **Server: `registerAppTool` + `registerAppResource`** from `@modelcontextprotocol/ext-apps/server`
3. **Build: single-file Vite bundle** — one self-contained HTML string
4. **UI: `useApp` hook** from `@modelcontextprotocol/ext-apps/react` — calls server tools via `app.callServerTool`

```
┌─────────────────────────────────────────────────────────────┐
│  Host (Claude / basic-host)                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  iframe (sandboxed) — loads ui:// resource HTML       │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  React UI (useApp hook)                         │  │  │
│  │  │  app.callServerTool("spar", {...})              │  │  │
│  │  └────────────────────┬────────────────────────────┘  │  │
│  └────────────────────────│ postMessage (window.parent) ─┘  │
└───────────────────────────┼─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  MCP Server (Hono + WebStandardStreamableHTTPServerTransport) │
│  spar_arena tool → _meta.ui.resourceUri = ui://spar-arena/… │
│  ui:// resource  → returns bundled HTML string                │
│  spar / list_factions / get_faction tools → called by both    │
│  LLM (content) and UI (structuredContent)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Layer 1 — HTTP Transport with Session Management

Apps require HTTP. The server uses `WebStandardStreamableHTTPServerTransport` over Hono with per-session `McpServer` instances.

**Key details:**

- **CORS must expose `mcp-session-id`** so browser-based hosts can read the session header from the `Initialize` response and send it back on subsequent requests.
- **Pre-generate the session ID and store it in the map BEFORE calling `handleRequest`.** `handleRequest` sends the response (with the session id header) to the client immediately; the client may send a follow-up request with that id before the current function returns. If the map isn't populated yet, that follow-up gets a 400.
- **Load the bundled HTML once at startup** — the resource serves this in-memory string, not a per-request file read.

```typescript
// server.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { registerTools } from "./src/tools.js";
import { registerDataResources } from "./src/resources.js";
import { registerApp } from "./src/app.js";

const PORT = 3001;
const distHtmlPath = path.resolve(process.cwd(), "dist", "mcp-app.html");

// Load the bundled HTML ONCE at startup — the resource serves this string
const bundledHtml = await readFile(distHtmlPath, "utf-8");

type Session = { server: McpServer; transport: WebStandardStreamableHTTPServerTransport };
const sessions = new Map<string, Session>();

const app = new Hono();
// exposeHeaders is REQUIRED so browser hosts can read mcp-session-id
app.use("*", cors({ exposeHeaders: ["mcp-session-id"] }));

app.post("/mcp", async (c) => {
  const sessionId = c.req.header("mcp-session-id");
  if (sessionId && sessions.has(sessionId)) {
    return sessions.get(sessionId)!.transport.handleRequest(c.req.raw);
  }
  if (sessionId) {
    return c.json({ error: "Unknown session id. Re-initialize." }, 400);
  }

  // Pre-generate session id BEFORE handling — handleRequest sends the response
  // header immediately, and the client may send a follow-up request before
  // this function returns, so the map must be populated first.
  const newSessionId = randomUUID();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => newSessionId,
  });
  const server = new McpServer({ name: "kungfu-mcp", version: "1.0.0" });
  registerTools(server);
  registerDataResources(server);
  registerApp(server, bundledHtml);  // pass the HTML string
  sessions.set(newSessionId, { server, transport });
  await server.connect(transport);
  return transport.handleRequest(c.req.raw);
});

// GET (SSE stream) and DELETE (session teardown) also require session lookup
app.get("/mcp", async (c) => { /* requireSession → transport.handleRequest */ });
app.delete("/mcp", async (c) => { /* requireSession → close server, delete from map */ });

serve({ fetch: app.fetch, port: PORT }, () => {
  console.error(`kungfu-mcp listening on http://localhost:${PORT}/mcp`);
});
```

> **Pattern:** Each session gets its own `McpServer` + `transport` pair. The session ID is pre-generated and stored in the map *before* `handleRequest` runs to avoid a race-condition 400.

---

## Layer 2 — Server: App Tool + App Resource

Use `registerAppTool` and `registerAppResource` from `@modelcontextprotocol/ext-apps/server` — **not** the base SDK's `registerTool` / `registerResource`. These helpers normalize UI metadata (populating both `_meta.ui.resourceUri` and the legacy `_meta["ui/resourceUri"]` key for backwards compatibility) and default to the correct MIME type.

**The contract:** Two registrations, one URI. The tool's `_meta.ui.resourceUri` and the resource's URI must match. The tool callback returns text for the LLM; the resource callback returns the HTML for the host.

```typescript
// src/app.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,          // "text/html;profile=mcp-app"
} from "@modelcontextprotocol/ext-apps/server";

const APP_RESOURCE_URI = "ui://spar-arena/app.html";

export function registerApp(server: McpServer, bundledHtml: string): void {
  // 1. The TOOL: carries _meta.ui.resourceUri — host knows to render a UI
  registerAppTool(
    server,
    "spar_arena",
    {
      title: "Kung Fu Spar Arena",
      description:
        "Launch the interactive spar arena. Pick two factions and watch them duel. "
        + "Renders an inline UI; the UI calls list_factions, spar, and get_faction back on this server.",
      inputSchema: {},
      _meta: { ui: { resourceUri: APP_RESOURCE_URI } },  // the contract
    },
    async () => ({
      content: [{ type: "text", text: "Arena ready. Select two factions and begin the spar." }],
    }),
  );

  // 2. The RESOURCE: serves the HTML that the host fetches & iframes
  registerAppResource(
    server,
    "Spar Arena",
    APP_RESOURCE_URI,
    { description: "Interactive spar arena UI." },
    async () => ({
      contents: [{
        uri: APP_RESOURCE_URI,
        mimeType: RESOURCE_MIME_TYPE,
        text: bundledHtml,            // the single-file HTML string
      }],
    }),
  );
}

// Graceful degradation: if the HTML isn't built yet, return a helpful stub
function missingHtmlStub(): string {
  return [
    "<!doctype html><html><body style='font-family:sans-serif;padding:2rem'>",
    "<h1>Arena not built</h1>",
    "<p>Run <code>npm run build</code> in the kungfu-mcp project, then restart the server.</p>",
    "</body></html>",
  ].join("");
}
```

### Resource URI conventions

| URI scheme | Purpose | Example |
|---|---|---|
| `ui://` | App UI resources (HTML rendered in iframe) | `ui://spar-arena/app.html` |
| `kungfu://` | Data resources (markdown context) | `kungfu://factions/{id}` |

> **Pattern:** Resource URIs are the MCP contract. Renaming one breaks external references — do it deliberately and update all code + docs in lockstep.

---

## Layer 3 — Build: Single-File Vite Bundle

The HTML must be a **single self-contained string** — no external JS/CSS references, because it runs in a sandboxed iframe with a strict CSP. `vite-plugin-singlefile` inlines everything into one file.

**Two separate TypeScript build targets — keep them apart:**

| Target | Config | Resolution | Output |
|---|---|---|---|
| **Server** | `tsconfig.json` | NodeNext, `.js` extensions in imports | `build/server.js` |
| **UI** | `tsconfig.ui.json` | Bundler, `jsx: react-jsx`, `noEmit` (typecheck only) | `dist/mcp-app.html` (via Vite) |

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: "mcp-app.html",   // entry at repo root (Vite convention)
      output: {
        entryFileNames: "mcp-app.js",
        assetFileNames: "mcp-app[extname]",
      },
    },
  },
});
```

```html
<!-- mcp-app.html (Vite entry, stays at repo root — NOT under src/ui/) -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Kung Fu Spar Arena</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/ui/main.tsx"></script>
  </body>
</html>
```

```typescript
// src/ui/main.tsx — minimal entry
import { createRoot } from "react-dom/client";
import { ArenaApp } from "./ArenaApp";
import "./arena.css";

createRoot(document.getElementById("root")!).render(<ArenaApp />);
```

> **Pattern:** `viteSingleFile()` produces `dist/mcp-app.html` with all JS/CSS inlined. The server reads it once at startup. The `mcp-app.html` Vite entry stays at repo root (not under `src/ui/`). `npm run build` runs all three: `tsc` (server) + `tsc -p tsconfig.ui.json` (UI typecheck) + `vite build` (UI bundle).

---

## Layer 4 — UI: `useApp` Hook + `callServerTool`

The React app uses `useApp` from `@modelcontextprotocol/ext-apps/react`. This hook:

1. Creates an `App` instance with a `PostMessageTransport` to `window.parent`
2. Performs the `ui/initialize` handshake with the host
3. Returns `{ app, isConnected, error }`

The UI then calls server tools **back through the host** via `app.callServerTool`. The host proxies the request to the actual MCP server and returns the result.

**Critical data contract:** Tool results carry both `content` (text for the LLM) and `structuredContent` (typed JSON for the UI). **Always read `structuredContent`** — never parse prose.

```typescript
// src/ui/ArenaApp.tsx
import { useEffect, useState, useRef } from "react";
import { useApp } from "@modelcontextprotocol/ext-apps/react";

type Faction = { id: string; name: string; catchphrase: string };
type SparOutcome = { rounds: string[]; verdict: string; winnerId: string | null };

export function ArenaApp() {
  // 1. Connect to the host (postMessage bridge to window.parent)
  const { app, isConnected, error } = useApp({
    appInfo: { name: "spar-arena", version: "1.0.0" },
    capabilities: {},
  });

  const [factions, setFactions] = useState<Faction[]>([]);
  const [ready, setReady] = useState(false);
  const [result, setResult] = useState<SparOutcome | null>(null);
  const sparIdRef = useRef(0);

  // 2. On connect, call a server tool to load initial data
  useEffect(() => {
    if (!isConnected || !app) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await app.callServerTool({ name: "list_factions", arguments: {} });
        if (cancelled) return;
        // Read structuredContent — NOT prose. The UI never parses text.
        const f = (res.structuredContent as { factions?: Faction[] })?.factions ?? [];
        setFactions(f);
        setReady(true);
      } catch (e) {
        // transport-level error (tool execution errors come back in result.isError)
      }
    })();
    return () => { cancelled = true; };
  }, [isConnected, app]);

  // 3. Call another server tool on user action
  async function beginSpar(aId: string, bId: string): Promise<void> {
    if (!app) return;
    try {
      const res = await app.callServerTool({
        name: "spar",
        arguments: {
          faction_a: aId,
          faction_b: bId,
          champion_a: "Neo",
          champion_b: "Morpheus",
        },
      });
      // Always check isError before consuming results
      if (res.isError) {
        // res.content[0].text has the error message
        return;
      }
      sparIdRef.current += 1;
      // Read structuredContent, not content[0].text
      setResult(res.structuredContent as SparOutcome);
    } catch (e) {
      // transport failure (thrown) vs tool execution failure (returned with isError: true)
    }
  }

  return ready ? (
    <button onClick={() => beginSpar(selA, selB)}>Begin the Spar</button>
  ) : (
    <div>Connecting…</div>
  );
}
```

### `useApp` hook API

```typescript
// Returns: { app: App | null, isConnected: boolean, error: Error | null }
const { app, isConnected, error } = useApp({
  appInfo: { name: "spar-arena", version: "1.0.0" },
  capabilities: {},                         // what features this app supports
  onAppCreated?: (app) => {                 // register event handlers BEFORE connect
    app.addEventListener("toolinput", (params) => { /* complete tool args from host */ });
    app.addEventListener("toolresult", (params) => { /* tool execution results */ });
    app.addEventListener("toolcancelled", (params) => { /* tool was cancelled */ });
    app.addEventListener("hostcontextchanged", (ctx) => { /* theme, locale, etc. */ });
  },
  autoResize: true,                         // auto-report iframe size changes
  strict: false,                            // throw on misuse vs console.warn
});
```

### `App` instance methods (called on the returned `app`)

| Method | Purpose |
|---|---|
| `app.callServerTool({ name, arguments })` | Call a tool on the MCP server (proxied through host) |
| `app.readServerResource({ uri })` | Read a resource from the server |
| `app.listServerResources()` | Discover available resources |
| `app.getHostContext()` | Get host theme, locale, display mode, etc. |
| `app.getHostCapabilities()` | Check what the host supports |
| `app.registerTool(...)` | Register app-side tools callable by the host |
| `app.sendMessage(...)` | Send a message to the host |

> **Pattern:** Register event handlers via `onAppCreated` (before connect) to avoid missing one-shot notifications. Use `addEventListener` (composable, multi-listener) over the deprecated `on*` setter properties. The hook intentionally does NOT re-run on option changes and does NOT close the `App` on unmount (to survive React Strict Mode double-mount).

---

## The Two-Consumer Pattern

Tools return **both** `content` and `structuredContent` in a single result — one result, two consumers. The LLM reads `content` (markdown text); the iframe UI reads `structuredContent` (typed JSON). **Keep both in sync.**

```typescript
// src/tools.ts — list_factions returns BOTH
server.registerTool("list_factions", {
  description: "List all factions…",
  inputSchema: {},
  outputSchema: {                            // typed output schema (zod)
    factions: z.array(z.object({
      id: z.string(),
      name: z.string(),
      catchphrase: z.string(),
    })),
  },
}, async () => ({
  content: [{ type: "text", text: rosterMarkdown() }],    // LLM reads this
  structuredContent: {                                     // UI reads this
    factions: KUNGFU_FACTIONS.map((f) => ({
      id: f.id,
      name: f.name,
      catchphrase: f.catchphrase,
    })),
  },
}));
```

> **Pattern:** `outputSchema` (zod) makes `structuredContent` typed and discoverable. The shared markdown formatting lives in `src/format.ts` — change it once, not per-primitive. `src/data.ts` (`KUNGFU_FACTIONS`) is the single source of truth for faction data.

---

## Best Practices Summary

| Concern | Pattern |
|---|---|
| **Transport** | `WebStandardStreamableHTTPServerTransport` over Hono; per-session `McpServer`; pre-generate session ID before `handleRequest` |
| **CORS** | `exposeHeaders: ["mcp-session-id"]` so browser hosts can read the session header |
| **App tool** | `registerAppTool` with `_meta: { ui: { resourceUri } }` |
| **App resource** | `registerAppResource` with `RESOURCE_MIME_TYPE`, serving the bundled HTML string |
| **Build** | `viteSingleFile()` — one self-contained `dist/mcp-app.html`; server reads it once at startup |
| **tsconfig** | Two targets: server (NodeNext, emits to `build/`) + UI (Bundler, `noEmit`, `jsx: react-jsx`) |
| **Vite entry** | `mcp-app.html` at repo root (not under `src/ui/`) |
| **UI connection** | `useApp({ appInfo, capabilities })` — auto-creates `PostMessageTransport` to `window.parent` |
| **UI → server** | `app.callServerTool({ name, arguments })` — proxied through host back to the MCP server |
| **Data contract** | Tools return both `content` (text/LLM) and `structuredContent` (typed/UI); UI reads `structuredContent` only |
| **Error handling** | Check `res.isError` before consuming results; catch transport exceptions separately (thrown vs returned) |
| **Event handlers** | Register via `onAppCreated` (before connect) to avoid missing one-shot notifications; prefer `addEventListener` over `on*` setters |
| **Graceful degradation** | If `dist/mcp-app.html` is missing, return a stub HTML with build instructions rather than crashing |
| **Resource URIs** | The MCP contract — renaming breaks external references; update all code + docs in lockstep |
| **Shared formatting** | `src/format.ts` — change markdown once, not per-primitive |
| **Single source of truth** | `src/data.ts` (`KUNGFU_FACTIONS`) for faction data |

---

## File Reference

| File | Role |
|---|---|
| `server.ts` | HTTP entry: Hono + `WebStandardStreamableHTTPServerTransport` on `:3001/mcp` |
| `src/app.ts` | App tool (`spar_arena`) + App resource (`ui://spar-arena/app.html`) |
| `src/tools.ts` | Tools: `list_factions`, `get_faction`, `spar` — return both `content` + `structuredContent` |
| `src/resources.ts` | Data resources: `kungfu://kungfu/roster` + `kungfu://factions/{id}` |
| `src/format.ts` | Shared markdown formatting (tools + resources + UI) |
| `src/data.ts` | `KUNGFU_FACTIONS` dataset — single source of truth |
| `src/ui/main.tsx` | React entry point |
| `src/ui/ArenaApp.tsx` | Main app component using `useApp` + `callServerTool` |
| `src/ui/types.ts` | Shared UI types (`Faction`, `SparOutcome`, `ProfileState`) |
| `mcp-app.html` | Vite entry (repo root) — `#root` div + `main.tsx` script |
| `vite.config.ts` | `react()` + `viteSingleFile()`, input `mcp-app.html` → `dist/mcp-app.html` |
| `tsconfig.json` | Server target: NodeNext, emits to `build/` |
| `tsconfig.ui.json` | UI target: Bundler, `noEmit`, `jsx: react-jsx` |

---

## References

- [MCP Specification](https://modelcontextprotocol.io/)
- [`@modelcontextprotocol/ext-apps`](https://github.com/modelcontextprotocol/ext-apps) — Apps SDK (server helpers + React hooks)
- [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) — Core MCP SDK
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector) — verify tools/resources (not app host)
- [ext-apps basic-host](https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-host) — minimal app host for local dev
