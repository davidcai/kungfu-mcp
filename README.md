# kungfu-mcp

A humorous [Model Context Protocol](https://modelcontextprotocol.io/) server, in TypeScript, that catalogs the major factions of the **jianghu** (the martial-arts underworld) and narrates sparring matches between them.

This build demonstrates the **three MCP primitives side by side**:

- **Tools** (model-controlled) — `list_factions`, `get_faction`, `spar`, and `spar_arena`.
- **Resources** (application-driven context) — `kungfu://jianghu/roster` and `kungfu://factions/{id}` profiles as markdown.
- **Apps** (interactive UI rendered in chat) — `spar_arena` launches an inline arena built on a `ui://` resource. The UI calls tools back on the server (`list_factions`, `spar`, `get_faction`) and renders animated, round-by-round results.

Apps require HTTP transport, so the server runs on `StreamableHTTPServerTransport` over Express. The stdio entry was removed.

## Factions included

| id             | Faction         | Vibe                                                        |
| -------------- | --------------- | ---------------------------------------------------------- |
| `shaolin`      | Shaolin         | Punching your way to enlightenment                         |
| `wudang`       | Wudang          | Defeating you with extreme relaxation                       |
| `emei`         | Emei            | Elite swordswomen & the art of the cold stare              |
| `beggar`       | Beggar's Sect   | Largest sect in the jianghu; bring a stick                 |
| `tang`         | Tang Sect       | Hidden weapons, poison, and apologetic business cards     |
| `ancient-tomb` | Ancient Tomb    | Tragic romance, frozen tears, no brunch                    |
| `ming-cult`    | Ming Cult       | The "evil cult" that leaned into the branding              |
| `huashan`      | Huashan         | A sword school split by a debate that nobody won           |

## Tools exposed

| Tool             | Arguments                  | What it does                                              |
| ---------------- | -------------------------- | -------------------------------------------------------- |
| `list_factions`  | _(none)_                   | Roster as markdown + `structuredContent` (`{ factions }`) for the UI. |
| `get_faction`    | `id: string`               | Returns the full (humorous) profile for one faction as markdown. |
| `spar`           | `faction_a, faction_b: string` | Biased narration + `structuredContent` (`{ rounds, verdict, winnerId }`). |
| `spar_arena`     | _(none)_                   | Launches the interactive Spar Arena UI (MCP App).        |

## Resources exposed

| URI                          | Type       | What it returns                                  |
| ---------------------------- | ---------- | ------------------------------------------------ |
| `kungfu://jianghu/roster`    | static     | The full roster as markdown.                      |
| `kungfu://factions/{id}`     | template   | A per-faction profile as markdown (list + complete callbacks). |
| `ui://spar-arena/app.html`   | app UI     | The bundled Spar Arena HTML (served via `registerAppResource`). |

## Quickstart

```bash
npm install
npm run build   # tsc (server) + tsc -p tsconfig.web.json (UI typecheck) + vite build (UI → dist/mcp-app.html)
npm start       # → http://localhost:3001/mcp
```

The server logs `kungfu-mcp listening on http://localhost:3001/mcp`.

### Build outputs

- `build/server.js` — compiled HTTP server entry (run by `npm start`).
- `dist/mcp-app.html` — single-file UI bundle (inlined JS + CSS), served as the `ui://spar-arena/app.html` resource.

## Inspecting with the MCP Inspector

The Inspector is **not** an app host — it cannot render the `spar_arena` UI — but it is the fastest way to verify tools, resources, and templates:

```bash
npm run inspect
# In the Inspector UI, set Transport Type: HTTP, URL: http://localhost:3001/mcp, Connect.
# - Tools tab: call list_factions / get_faction / spar / spar_arena.
# - Resources tab: browse kungfu://jianghu/roster and kungfu://factions/{id}.
# - The spar_arena tool returns text; its UI renders only inside an app host.
```

## Rendering the Spar Arena UI (app host)

MCP Apps render inside an app host that fetches the `ui://` resource and displays it in a sandboxed iframe. The MCP Inspector does not do this. On Linux, use the `basic-host` from the ext-apps repo:

```bash
# one-time: clone the app host
git clone https://github.com/modelcontextprotocol/ext-apps.git /tmp/ext-apps
cd /tmp/ext-apps/examples/basic-host && npm install

# start the host (it points at your running server)
SERVERS='["http://localhost:3001/mcp"]' npm start
# → open http://localhost:8080, call spar_arena, the arena renders inline
```

In the arena: pick two factions, press **Begin the Spar**, watch the rounds fade in, then open a profile.

### Alternative: Claude (web / Desktop)

Apps can also render in Claude (web/Desktop) which is an app host. This requires a `cloudflared` tunnel exposing `http://localhost:3001/mcp` to the internet plus a paid Claude plan (Pro/Max/Team). Add the tunnel URL as a remote MCP server in Claude's settings. Not the primary local-dev path.

## How it fits together

```
HTTP server (express + StreamableHTTPServerTransport) on :3001/mcp
├── Tools (model-controlled)
│   ├── list_factions        # roster briefing
│   ├── get_faction          # single-faction profile
│   ├── spar                 # text narration
│   └── spar_arena           # app tool: _meta.ui.resourceUri → triggers UI render
├── Data resources (application-driven context)
│   ├── kungfu://jianghu/roster      static, markdown
│   └── kungfu://factions/{id}       template, markdown, list+complete callbacks
└── UI resource (the app itself)
    └── ui://spar-arena/app.html     bundled HTML, served from dist/
```

**Demo flow:** the LLM calls `spar_arena` → the host fetches `ui://spar-arena/app.html` → renders the arena inline → the arena calls `list_factions`, `spar`, and `get_faction` back on the server → renders animated results. The `ui://` resource is itself an MCP resource — **apps are resources that render**.

## Project layout

```
server.ts          # HTTP entry: express + cors + StreamableHTTPServerTransport on :3001/mcp
vite.config.ts     # react() + viteSingleFile(), input mcp-app.html → dist/mcp-app.html
mcp-app.html       # UI shell: #root div + src/web/main.tsx script tag
src/               # one file per MCP primitive:
  tools.ts         #   Tools — list_factions, get_faction, spar (text + structuredContent)
  resources.ts     #   Resources — kungfu://jianghu/roster + kungfu://factions/{id} (markdown)
  app.ts           #   App — spar_arena tool + ui://spar-arena/app.html resource
  web/             # React UI (useApp hook from @modelcontextprotocol/ext-apps/react)
    main.tsx       #   entry: createRoot + arena.css import
    ArenaApp.tsx   #   state owner: factions, spar, profile; renders pickers/arena/profile
    ArenaResult.tsx, FactionCard.tsx, RoundList.tsx, Verdict.tsx, ProfilePanel.tsx
    types.ts, emblems.ts, arena.css
  format.ts        # shared markdown formatting (used by tools, resources, and the UI)
  data.ts          # KungfuFaction[] dataset (the heart of the humor)
```

## Scripts

| Script           | What it does                                              |
| ---------------- | -------------------------------------------------------- |
| `npm run build`  | `tsc` (server → `build/`) + `tsc -p tsconfig.web.json` (UI typecheck) + `vite build` (UI → `dist/mcp-app.html`) |
| `npm start`      | `node build/server.js` → http://localhost:3001/mcp       |
| `npm run dev`    | `tsx server.ts` (run server without building)            |
| `npm run inspect`| Launch the MCP Inspector (point it at the HTTP URL)      |

## Notes

- This is a demo. All factions, fun facts, and spar outcomes are fabricated for entertainment.
- Resource content is English-only markdown. The dataset in `data.ts` is the source of truth.
- `list_factions` and `spar` return **both** humorous text (for the LLM) and `structuredContent` (for the app UI) — one tool result, two consumers. The UI never parses prose.
- Tools and resources render the same markdown via `src/format.ts`; the primitives differ only in who decides to fetch the content.
- The server is HTTP-only (stdio was dropped because Apps require HTTP).
