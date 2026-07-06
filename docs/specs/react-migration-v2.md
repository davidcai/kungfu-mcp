# kungfu-mcp: Migrate MCP App UI to React (v2)

**Status:** Approved (pending build)
**Date:** 2026-07-05
**Supersedes:** `react-migration.md` — same base plan, merged with three agreed deltas: `src/web/` layout, UI typechecking in the build, and an animation-replay fix the v1 spec missed.

---

## Goal

Render the Spar Arena MCP App with React + TSX components instead of vanilla TS DOM manipulation, using the official `useApp` hook from `@modelcontextprotocol/ext-apps/react`. The server contract is unchanged: Vite still emits a single self-contained `dist/mcp-app.html`, served as-is at `ui://spar-arena/app.html`.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Styling | Plain CSS file (`src/web/arena.css`) | Current `<style>` lifted verbatim; zero new deps; singlefile re-inlines it. |
| Host theme | Keep hardcoded dark theme | Intentional aesthetic. No `useHostStyles`. |
| React version | ^19 | Within ext-apps peer range (`^17 \|\| ^18 \|\| ^19`). |
| Layout | `src/web/` subdirectory | Isolates browser code; server tsc excludes one dir; `build/` stays free of UI helpers. (Delta from v1's flat `src/`.) |
| UI typechecking | `tsconfig.web.json` + `tsc -p` in build | Vite transpiles without typechecking — TSX errors would ship silently. (v1 deferred this.) |
| Profile fetch | In click handler, not `useEffect` on id | Re-clicking the same profile button refetches, matching vanilla behavior. |
| Server contract | Unchanged | `server.ts`, `src/app.ts`, `src/tools.ts`, `src/resources.ts`, `src/format.ts`, `src/data.ts` untouched. |

## Research findings (carried from v1 + verified)

- `@modelcontextprotocol/ext-apps/react` exports `useApp({ appInfo, capabilities, … })` → `{ app, isConnected, error }`; auto-connects via `PostMessageTransport` and auto-resizes by default — matches current `new App()` + `connect()` defaults.
- `@vitejs/plugin-react@6.x` requires vite ^8; `vite-plugin-singlefile@2.3.3` supports vite ^8 — both compatible with repo's vite 8.1.3.
- React production builds are CSP-safe (no `unsafe-eval`). Bundle grows ~45 KB gzip — acceptable.
- Official precedent: `examples/basic-server-react` in the ext-apps repo.

## Behavior to preserve 1:1 (from `src/mcp-app.ts`)

1. **Init**: status "Connecting to the jianghu…"; connect failure → `Failed to connect to host: {msg}` (error style). Then `list_factions`; throw → `list_factions failed: {msg}`; empty → "No factions returned by the server."; success → selects populated (A defaults `factions[0]`, B `factions[1]`), pickers + button revealed, status "Ready. Choose your champions."
2. **Spar**: same faction → error "Pick two different factions." Else disable button, status "The arena falls silent. A chicken flees…", call `spar {faction_a, faction_b}`. `result.isError` → `content[0].text` as error; success → arena from `structuredContent` `{rounds, verdict, winnerId}`, clear status; throw → `Spar failed: {msg}`. Button re-enabled in all paths. Cards use factions captured at click time.
3. **Arena**: two cards (emblem from `EMBLEM` map, fallback 🥋; name; `threatLabel(threat)`; threat bar width `threat/10*100%`; catchphrase). Winner `.winner` / other `.loser`; no winner → neither + verdict `.draw`. Rounds staggered `animation-delay: 0.3 + i*0.7`s; verdict `0.3 + rounds.length*0.7 + 0.2`s.
4. **Profile**: "View {name} profile" buttons → "Loading profile…" → `get_faction {id}` → `{name} — Profile` heading + raw markdown rendered as escaped text (pre-wrap CSS). Throw → `.profile.err`. Panel persists across spars.
5. React auto-escapes text children → `escapeHtml` disappears; no `dangerouslySetInnerHTML`, no markdown parser.
6. **Animation-replay fix (new in v2)**: CSS `fadeIn` fires on element *mount*. React reuses round/verdict DOM nodes across spars, so a second spar wouldn't animate (vanilla `innerHTML` replaced nodes each time). Fix: incrementing `sparId` keyed on the result block — `<ArenaResult key={sparId} …/>` — forces remount per spar.

---

## Plan

### 1. Dependencies (`package.json`)

- Runtime: `react@^19.0.0`, `react-dom@^19.0.0`
- Dev: `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`
- Build script: `"build": "tsc && tsc -p tsconfig.web.json && vite build"`

### 2. Vite config (`vite.config.ts`)

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: "mcp-app.html",
      output: {
        entryFileNames: "mcp-app.js",
        assetFileNames: "mcp-app[extname]",
      },
    },
  },
});
```

### 3. TypeScript configs

**Root `tsconfig.json`** — exclude swap only (no `jsx` needed; server tsc never sees TSX):

```jsonc
"include": ["server.ts", "src/**/*.ts"],
"exclude": ["node_modules", "src/web", "vite.config.ts"]
```

**New `tsconfig.web.json`** (browser config; root stays NodeNext for the server):

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src/web"]
}
```

`moduleResolution: "Bundler"` resolves the shared `../format.js` → `format.ts` import (same cross-import the vanilla app uses for `threatLabel`).

### 4. HTML entry (`mcp-app.html`)

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Jianghu Spar Arena</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/web/main.tsx"></script>
  </body>
</html>
```

Current `<style>` contents move verbatim to `src/web/arena.css` (imported by `main.tsx`; singlefile re-inlines). Id selectors (`#spar-btn`, `#status`, …) kept — JSX uses the same ids.

### 5. UI source (`src/mcp-app.ts` → `src/web/`)

Delete `src/mcp-app.ts`. Create:

| File | Responsibility |
|---|---|
| `src/web/main.tsx` | Entry: `createRoot(document.getElementById("root")!).render(<ArenaApp />)`; imports `arena.css`. No `<StrictMode>` — dev double-mount would double-fire the initial `list_factions` effect. |
| `src/web/ArenaApp.tsx` | Top-level state owner. `useApp({ appInfo: { name: "spar-arena", version: "1.0.0" }, capabilities: {} })`. State via `useState`: `factions`, `status {message, isError}`, `selA`/`selB` (controlled selects), `sparring` (button disabled), `result {a, b, outcome, sparId} \| null`, `profile: loading \| loaded{name,text} \| error{message} \| null`. Effects: `[isConnected, app]` → `list_factions` init flow; `[error]` → connect-failure status. Handlers: `beginSpar()`, `showProfile(f)`. Renders header, status, pickers, spar button, `{result && <ArenaResult key={result.sparId} …/>}`, `{profile && <ProfilePanel …/>}` (conditional rendering replaces `hidden` attrs). |
| `src/web/ArenaResult.tsx` | `.arena` grid (FactionCard / `.center-vs` / FactionCard) + RoundList + Verdict + profile buttons; computes winner/loser card variants. |
| `src/web/FactionCard.tsx` | Emblem, name, `threatLabel(threat)`, threat bar (`style={{ width }}`), catchphrase. |
| `src/web/RoundList.tsx` | Rounds with staggered `animationDelay` inline style (`0.3 + i*0.7`s). |
| `src/web/Verdict.tsx` | `.verdict` (+ `.draw`), delay `0.3 + rounds*0.7 + 0.2`s, winner-name span. |
| `src/web/ProfilePanel.tsx` | Presentational three-way render (loading/loaded/error); loaded: `<h4>{name} — Profile</h4>{text}` with pre-wrap CSS. |
| `src/web/types.ts` | `Faction`, `SparOutcome`, `textOf(result)` helper. |
| `src/web/emblems.ts` | `EMBLEM` map + `emblem()` helper. |
| `src/web/arena.css` | Current inline `<style>` from `mcp-app.html`, verbatim. |

### 6. Docs

- `README.md:118` — project-layout line (`mcp-app.ts` → `src/web/*`).
- `docs/specs/mcp-app-and-resources.md` — file-map entry (~line 69) and "vanilla, no framework" notes (~lines 58, 192) → React 19 + ext-apps React hooks.
- `docs/presentations/mcp-deck.html` — no change.

### 7. Implementation order

1. `npm i react react-dom && npm i -D @vitejs/plugin-react @types/react @types/react-dom`
2. Add `tsconfig.web.json`; root tsconfig exclude swap.
3. `vite.config.ts` — add `react()` before `viteSingleFile()`.
4. `src/web/arena.css` (lift verbatim).
5. `src/web/types.ts`, `emblems.ts`, components, `ArenaApp.tsx`, `main.tsx`.
6. Slim `mcp-app.html`; delete `src/mcp-app.ts`.
7. `package.json` build script; docs updates.

### 8. Verification

1. `npm run build` — server tsc (must not see TSX), web tsc, vite build all pass.
2. `dist/mcp-app.html` single-file: `grep -E 'src=|href=' dist/mcp-app.html` → no external refs; one inline `<script>` + one inline `<style>`.
3. `npm run dev` — server boots, logs `kungfu-mcp listening on http://localhost:3001/mcp`.
4. Live (basic-host / Claude / `npm run inspect`): `spar_arena` renders; dropdowns 8 factions defaulting to first two; status transitions per behavior items 1–2; same-faction error; spar → staggered rounds → verdict; **spar twice** → animations replay (the `key={sparId}` check); winner/loser/draw styling; profile shows raw markdown pre-wrapped and persists after a new spar; auto-resize works.
5. `rg "mcp-app.ts" --glob '!node_modules' --glob '!.git' --glob '!build'` → nothing.

### 9. Commit

Single commit on `add-mcp-app-spec`:

```
Render MCP app UI with React (useApp hook, TSX components)
```

---

## Files touched (summary)

| File | Action |
|---|---|
| `package.json` | edit — deps + build script |
| `vite.config.ts` | edit — add `react()` plugin |
| `tsconfig.json` | edit — exclude `src/web` (replaces `src/mcp-app.ts`) |
| `tsconfig.web.json` | **new** — browser typecheck config |
| `mcp-app.html` | edit — strip to `#root` + script tag |
| `src/mcp-app.ts` | **delete** |
| `src/web/main.tsx` | **new** |
| `src/web/ArenaApp.tsx` | **new** |
| `src/web/ArenaResult.tsx` | **new** |
| `src/web/FactionCard.tsx` | **new** |
| `src/web/RoundList.tsx` | **new** |
| `src/web/Verdict.tsx` | **new** |
| `src/web/ProfilePanel.tsx` | **new** |
| `src/web/types.ts` | **new** |
| `src/web/emblems.ts` | **new** |
| `src/web/arena.css` | **new** (moved from `mcp-app.html` `<style>`) |
| `README.md` | edit — project-layout line |
| `docs/specs/mcp-app-and-resources.md` | edit — file map + framework notes |
| `server.ts`, `src/app.ts`, `src/tools.ts`, `src/resources.ts`, `src/format.ts`, `src/data.ts` | unchanged |
