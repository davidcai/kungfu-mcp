# kungfu-mcp

> 🎬 **Live presentation:** https://davidcai.github.io/kungfu-mcp/presentations/

A humorous [Model Context Protocol](https://modelcontextprotocol.io/) server, in TypeScript, that catalogs the major factions of the **kung fu world** (the martial-arts underworld) and narrates sparring matches between them.

It demonstrates the **three MCP primitives side by side**:

- **Tools** (model-controlled) — `list_factions`, `get_faction`, `spar`, `spar_arena`.
- **Resources** (application-driven context) — `kungfu://kungfu/roster` and `kungfu://factions/{id}` profiles as markdown.
- **Apps** (interactive UI rendered in chat) — `spar_arena` launches an inline arena built on a `ui://` resource that calls tools back on the server.

The server runs on `WebStandardStreamableHTTPServerTransport` over Hono (Apps require HTTP transport).

---

## Starting the MCP server

```bash
npm install
npm start       # builds (server + UI), then serves → http://localhost:3001/mcp
```

The server logs `kungfu-mcp listening on http://localhost:3001/mcp`.

**Fast iteration (no build):**

```bash
npm run dev     # tsx server.ts — runs the server directly
```

> Note: `npm run dev` skips the UI build. Tools and resources work immediately; the `spar_arena` **UI** returns an error until `npm run build` has produced `dist/mcp-app.html` at least once.

| Script            | What it does                                                                 |
| ----------------- | --------------------------------------------------------------------------- |
| `npm run build`   | `tsc` (server → `build/`) + `tsc -p tsconfig.ui.json` (UI typecheck) + `vite build` (UI → `dist/mcp-app.html`) |
| `npm start`       | `npm run build && node build/server.js` → http://localhost:3001/mcp          |
| `npm run dev`     | `tsx server.ts` (run the server without building)                            |
| `npm run inspect` | Launch the MCP Inspector                                                     |

---

## Inspecting the MCP server

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) is the fastest way to verify tools, resources, and templates. It is **not** an app host — it cannot render the `spar_arena` UI — but everything else is testable.

With the server running (`npm start`), in another terminal:

```bash
npm run inspect
```

In the Inspector UI:

1. **Transport Type:** `HTTP`
2. **URL:** `http://localhost:3001/mcp`
3. **Connect**

Then exercise each primitive:

- **Tools tab** — call `list_factions`, `get_faction` (`id: "shaolin"`), `spar` (`faction_a: "shaolin", faction_b: "wudang"`), `spar_arena`.
- **Resources tab** — read `kungfu://kungfu/roster`; browse the `kungfu://factions/{id}` template (id autocompletes).

`list_factions` and `spar` return **both** humorous text (for the LLM) and `structuredContent` (for the UI) in a single result.

---

## Using kungfu-mcp in Cursor

[Cursor](https://cursor.com/) 2.6+ is a native MCP Apps host — point it at the running server and `spar_arena` renders inline in the chat as an interactive iframe. Add the server to `~/.cursor/mcp.json` (or project `.cursor/mcp.json`):

```json
{ "mcpServers": { "kungfu": { "type": "http", "url": "http://localhost:3001/mcp" } } }
```

Then call `spar_arena`, pick two factions (e.g. Neo vs. Morpheus), and press **Begin the Spar**.

> Progressive enhancement: hosts without MCP Apps support just get `spar_arena`'s text result, so the server stays usable everywhere. Other app-capable hosts (e.g. Claude web/Desktop via a `cloudflared` tunnel + paid plan) also render the arena.

---

## What the server exposes

**Tools**

| Tool            | Arguments                       | What it does                                                          |
| --------------- | ------------------------------- | -------------------------------------------------------------------- |
| `list_factions` | _(none)_                        | Roster markdown + `structuredContent` (`{ factions }`).              |
| `get_faction`   | `id: string`                    | Full profile for one faction as markdown.                            |
| `spar`          | `faction_a, faction_b: string`, optional `champion_a, champion_b: string` | Biased narration + `structuredContent` (`{ rounds, verdict, winnerId }`). Each round randomly picks a signature technique per side; the winner has the higher sum of picked techniques' threats. Champion names (e.g. "Neo") replace faction names in the narration. |
| `spar_arena`    | _(none)_                        | Launches the interactive Spar Arena UI (MCP App).                   |

**Resources**

| URI                        | Type     | What it returns                                          |
| -------------------------- | -------- | ------------------------------------------------------- |
| `kungfu://kungfu/roster`   | static   | The full roster as markdown.                            |
| `kungfu://factions/{id}`   | template | Per-faction profile as markdown (list + complete).      |
| `ui://spar-arena/app.html` | app UI   | The bundled Spar Arena HTML.                            |

---

## Project layout

```
server.ts          # HTTP entry: hono + @hono/node-server + WebStandardStreamableHTTPServerTransport on :3001/mcp
vite.config.ts     # react() + viteSingleFile(), input mcp-app.html → dist/mcp-app.html
mcp-app.html       # UI shell: #root div + src/ui/main.tsx script tag
src/               # one file per MCP primitive:
  tools.ts         #   Tools — list_factions, get_faction, spar
  resources.ts     #   Resources — kungfu://kungfu/roster + kungfu://factions/{id}
  app.ts           #   App — spar_arena tool + ui://spar-arena/app.html resource
  ui/              # React UI (useApp hook from @modelcontextprotocol/ext-apps/react)
  format.ts        # shared markdown formatting (tools, resources, and the UI)
  data.ts          # KungfuFaction[] dataset (the heart of the humor)
```

**Build outputs:** `build/server.js` (run by `npm start`) and `dist/mcp-app.html` (the `ui://` resource).

---

## Notes

- A demo. All factions, fun facts, and spar outcomes are fabricated for entertainment.
- Tools and resources render the same markdown via `src/format.ts`; the primitives differ only in who decides to fetch the content.
- The server is HTTP-only (stdio was dropped because Apps require HTTP).
