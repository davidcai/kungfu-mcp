# CLAUDE.md

Guidance for editing this repo. **`README.md` is the source of truth** for what the server is, its commands, layout, and the tool/resource catalog — read it first. This file covers only what's non-obvious when changing code.

## Two separate TypeScript build targets — keep them apart

- **Server** (`tsconfig.json`): NodeNext, emits to `build/`. Includes `server.ts` + `src/**/*.ts`, **excludes `src/ui`**. Server-side imports use `.js` extensions (`import { registerTools } from "./src/tools.js"`).
- **UI** (`tsconfig.ui.json`): Bundler resolution, `noEmit` (typecheck only), `jsx: react-jsx`. Includes `src/ui` only; Vite does the actual bundling.

`npm run build` runs both plus `vite build`. See README for the command table.

## Editing rules

- **Two-consumer tool results:** `list_factions` and `spar` return both `content` (text for the LLM) and `structuredContent` (typed data for the UI). One result, two consumers — the UI never parses prose. Keep both in sync.
- **`src/format.ts` is shared** by tools and resources — change markdown there once, not per-primitive.
- **`src/data.ts` (`KUNGFU_FACTIONS`) is the single source of truth** for faction data.
- **Resource URIs are the MCP contract** (`kungfu://kungfu/roster`, `kungfu://factions/{id}`, `ui://spar-arena/app.html`). Renaming one breaks external references — do it deliberately and update all code + docs in lockstep.
- **`mcp-app.html` stays at repo root** (Vite entry convention), not under `src/ui/`.
- **Build before relying on the App UI:** the server reads `dist/mcp-app.html` at startup; `npm run dev` leaves it stale.

## How the App wiring works

`spar_arena` (`src/app.ts`) carries `_meta.ui.resourceUri = "ui://spar-arena/app.html"`. The host fetches that resource → renders the React app (`src/ui/`) in an iframe → the UI calls `list_factions` / `spar` / `get_faction` back on the server via `app.callServerTool`.

## Verify

`npm run build` (both tsc targets + vite must pass), then `npm run inspect` — see README's Inspecting section for connect steps.
