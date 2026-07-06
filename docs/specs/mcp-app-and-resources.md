# kungfu-mcp: MCP App + Resources Spec

**Status:** Approved (pending build)
**Date:** 2026-07-05
**Scope:** Add MCP App (interactive UI) and MCP resources to the existing `kungfu-mcp` server

---

## Goal

Demonstrate **MCP Apps** (rich inline UI widgets) together with **MCP resources** (application-driven context), using the existing kungfu faction dataset. The demo shows the contrast between model-controlled primitives (tools), application-driven primitives (resources), and interactive UIs rendered in chat (apps — which are themselves served from `ui://` resources).

## How MCP Apps + Resources fit together

MCP Apps are built **on top of** resources — the interactive UI is itself served from a `ui://` resource. The demo naturally shows both primitives:

| Primitive | Role in demo | Control flow |
|---|---|---|
| **Data resources** (`kungfu://factions/{id}`) | Faction profiles as markdown context | Application-driven (host picks URI) |
| **UI resource** (`ui://spar-arena/app.html`) | Interactive HTML app | Model-invoked via tool `_meta.ui.resourceUri` |
| **Tools** (`list_factions`, `spar`, etc.) | Called by both the LLM *and* the app UI | Bidirectional |

**Demo story:** the LLM calls a tool → the host fetches the `ui://` resource → renders the app inline in chat → the app calls tools back on the server (`app.callServerTool`) → renders results richly.

---

## Architecture

```
HTTP server (express + StreamableHTTPServerTransport) on :3001/mcp
├── Tools (model-controlled)
│   ├── list_factions        # existing, unchanged
│   ├── get_faction          # existing, unchanged
│   ├── spar                 # existing, unchanged (text narration)
│   └── spar_arena  [NEW]    # app tool: _meta.ui.resourceUri → triggers UI render
├── Data resources (application-driven context)
│   ├── kungfu://kungfu/roster      [NEW]  static, markdown
│   └── kungfu://factions/{id}       [NEW]  template, markdown, list+complete callbacks
└── UI resource (the app itself)
    └── ui://spar-arena/app.html     [NEW]  bundled HTML, served from dist/
```

### Transport: stdio → HTTP (required for Apps)

MCP Apps require HTTP transport — the host fetches the `ui://` resource and renders it in a sandboxed iframe via postMessage. The current stdio entry (`src/index.ts`) is removed. SDK 1.29.0 provides `StreamableHTTPServerTransport`; `@modelcontextprotocol/ext-apps` 1.7.4 provides the app helpers (`registerAppTool`, `registerAppResource`, client-side `App` class).

---

## Spar Arena UI (`mcp-app.html` + `src/ui/`)

**Layout:**
- Header: "⚔️ Kung Fu Spar Arena"
- Two faction dropdowns (populated via `app.callServerTool("list_factions")` on load), each showing name + color-coded threat level
- "Begin the Spar" button → calls `app.callServerTool("spar", { faction_a, faction_b })`
- Results area: two faction cards facing off (emoji emblems, threat bars), round cards that **fade-in one by one**, verdict banner with winner highlighted + catchphrase
- "View Profile" buttons → call `get_faction`, render inline

**Tech:** React 19 + TSX components (see `docs/specs/react-migration-v2.md`). Uses the official `useApp` hook from `@modelcontextprotocol/ext-apps/react` for connection + `callServerTool`.

---

## Files

| File | Action | Purpose |
|---|---|---|
| `server.ts` | **NEW** | HTTP entry: express + cors + StreamableHTTPServerTransport on :3001/mcp |
| `vite.config.ts` | **NEW** | `viteSingleFile()` plugin, input `mcp-app.html` → `dist/mcp-app.html` |
| `mcp-app.html` | **NEW** | UI entry: dropdowns, arena, styles |
| `src/ui/` | **NEW** | React UI: `useApp` hook, populate dropdowns, call `spar`/`get_faction`, animate rounds (was `src/mcp-app.ts`, migrated per `react-migration-v2.md`) |
| `src/registry.ts` | **NEW** | `registerAll(server)`: all tools + data resources + app tool/resource |
| `src/resources.ts` | **NEW** | `kungfu://kungfu/roster` + `kungfu://factions/{id}` (markdown, English-only) |
| `src/data.ts` | unchanged | Source of truth (keep Chinese here; resources strip it) |
| `src/index.ts` | **DELETE** | stdio entry, no longer needed (HTTP only) |
| `package.json` | edit | +ext-apps, +express, +cors; dev: +vite, +vite-plugin-singlefile, +tsx; new scripts |
| `tsconfig.json` | edit | `moduleResolution: bundler`, include `*.ts` + `src/**/*` |
| `.gitignore` | edit | add `dist/` |
| `README.md` | edit | new build/run/test instructions, basic-host setup |

---

## MCP App wiring (core pattern)

```ts
// src/registry.ts
const resourceUri = "ui://spar-arena/app.html";

// App tool: model calls this → host renders the UI → UI calls spar/get_faction back
registerAppTool(server, "spar_arena", {
  title: "Kung Fu Spar Arena",
  description: "Launch the interactive spar arena. Pick two factions and watch them duel.",
  inputSchema: {},
  _meta: { ui: { resourceUri } },
}, async () => ({ content: [{ type: "text", text: "Arena ready. Select two factions." }] }));

// UI resource: serves the bundled HTML
registerAppResource(server, resourceUri, resourceUri,
  { mimeType: RESOURCE_MIME_TYPE },
  async () => ({ contents: [{ uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: bundledHtml }] }));
```

## Data resources

- `kungfu://kungfu/roster` — static, full roster as markdown
- `kungfu://factions/{id}` — template with `list` + `complete` callbacks, faction profile as markdown
- Content is English-only (Chinese stripped from `data.ts` content at render time; `data.ts` itself unchanged)

---

## `package.json` scripts

```json
"scripts": {
  "build": "tsc && vite build",
  "start": "node build/server.js",
  "dev": "tsx server.ts",
  "inspect": "npx @modelcontextprotocol/inspector"
}
```

## Dependencies to add

- **runtime:** `@modelcontextprotocol/ext-apps`, `express`, `cors`
- **dev:** `vite`, `vite-plugin-singlefile`, `tsx`, `@types/express`, `@types/cors`

---

## Testing

### One-time: set up basic-host (local app host)

The MCP Inspector does not render Apps (it's not an app host). On Linux, use the `basic-host` from the ext-apps repo:

```bash
git clone https://github.com/modelcontextprotocol/ext-apps.git /tmp/opencode/ext-apps
cd /tmp/opencode/ext-apps/examples/basic-host && npm install
```

### Run the server

```bash
cd /home/dcai/dev/kungfu-mcp
npm run build   # tsc (server) + vite build (UI → dist/mcp-app.html)
npm start       # → http://localhost:3001/mcp
```

### Test with basic-host

```bash
# In another terminal
cd /tmp/opencode/ext-apps/examples/basic-host
SERVERS='["http://localhost:3001/mcp"]' npm start
# → open http://localhost:8080, call spar_arena, see the UI render
```

### Alternative: Claude (web/Desktop)

Requires `cloudflared` tunnel + a paid Claude plan (Pro/Max/Team). Documented in README but not the primary local-dev path.

---

## Verification checklist

1. `npm run build` — tsc + vite both succeed, `dist/mcp-app.html` exists
2. `npm start` — server logs "listening on :3001/mcp"
3. MCP Inspector (`npm run inspect` → enter `http://localhost:3001/mcp`):
   - `resources/list` returns roster + 8 faction URIs
   - `resources/templates/list` returns the `kungfu://factions/{id}` template
   - `tools/list` shows `spar_arena` alongside existing tools
   - all tools callable
4. basic-host → call `spar_arena` → arena UI renders → pick factions → spar → animated results
5. README updated with all of the above

---

## Demo flow

1. **Resources** (Inspector/basic-host Resources tab) → browse `kungfu://factions/tang` etc. — *application-driven context*
2. **App** (basic-host) → call `spar_arena` tool → UI renders inline → pick factions → **UI calls `spar` tool back** → animated round-by-round results — *bidirectional*
3. **Punchline**: `ui://spar-arena/app.html` is itself an MCP resource — apps are resources that render

---

## Decisions log

| Decision | Choice | Rationale |
|---|---|---|
| UI concept | Spar Arena | Interactive + showcases bidirectional tool calls + rich rendering |
| Testing host | basic-host | Works on Linux right now, no paid plan needed |
| Transport | HTTP only | Apps require HTTP; drop stdio for simplicity |
| Resource content format | Markdown | Renders nicely in clients; distinct from plain-text tool output; showcases `mimeType` |
| Chinese in resources | Strip | Consistent with README's English-only decision for user-facing surfaces |
| Framework | React 19 (official ext-apps React support) | Migrated per `react-migration-v2.md`; `useApp` hook replaces manual `App` wiring |
| `data.ts` Chinese | Keep unchanged | Source of truth; stripping happens at resource render time |

---

## Addendum — post-build simplification (2026-07-05)

Implemented after the initial build; supersedes the file map and two decisions above:

- `src/registry.ts` was split by primitive: `src/tools.ts` (tools), `src/resources.ts` (data resources), `src/app.ts` (app tool + `ui://` resource). `server.ts` calls the three registrars directly.
- `list_factions` and `spar` now declare an `outputSchema` and return `structuredContent` alongside the humorous text. The app UI consumes the structured data instead of regex-parsing prose, and the server's `winnerId` is the single source of truth for the arena verdict.
- Shared markdown formatting (`threatLabel`, `rosterMarkdown`, `profileMarkdown`) lives in `src/format.ts`, used by tools, resources, and the UI bundle. Tools return the same markdown as resources.
- The "strip Chinese at render time" decision is obsolete: `data.ts` is English-only, so the defensive `stripChinese` pass was removed.
