# "I Know Kung Fu" — MCP Presentation Preparation Document

> **Purpose of this document:** Source material for generating slides. Each slide entry below has a title, on-slide content (bullets / code / diagram description), and speaker notes. Demo scripts are in the appendix. This is *not* the slide deck itself.

## Talk metadata

| | |
|---|---|
| **Title** | I Know Kung Fu: Plugging Skills into AI Agents with MCP |
| **Audience** | Engineers who have heard of MCP but may not have built with it |
| **Duration** | ~25 minutes (including 2 live demos) + Q&A |
| **Demo vehicle** | This repo — `kungfu-mcp`, a complete MCP server (~630 lines of server code, ~350 lines of React UI) |
| **Goal** | Audience leaves knowing (1) exactly where MCP fits in an agent stack, (2) the building blocks of a server, (3) that MCP can serve interactive UI, not just text, and (4) that building one is a weekend project, not a platform migration |

## Narrative arc & timing map (25 min)

| # | Segment | Time | Beat |
|---|---------|------|------|
| 1 | Cold open + what MCP is | 2 min | The Matrix "I know kung fu" scene → agents can download skills too |
| 2 | MCP ↔ AI agents | 4 min | The agent loop, the M×N integration problem, USB-C analogy |
| 3 | Building blocks | 4 min | Tools, resources, prompts — each shown as real code from this repo |
| 4 | **Live demo 1: Inspector** | 4 min | `list_factions`, `get_faction`, `spar`, browse resources |
| 5 | Augmenting agents | 3 min | Knowledge vs capability; one tool result, two consumers |
| 6 | Beyond text: MCP Apps + **Live demo 2: Spar Arena** | 5 min | `_meta.ui.resourceUri` → iframe → `callServerTool` loop |
| 7 | How to build one + wrap | 3 min | server.ts anatomy, build pipeline, takeaways |

**Total: 25 min.** If running long, compress segment 7 (the wrap slide carries the takeaways). If running short, extend demo 2 with the profile panel and theme toggle.

---

## Segment 1 — Cold open + What is MCP (2 min)

### Slide 1: Title

**On slide:**
- *I Know Kung Fu: Plugging Skills into AI Agents with MCP*
- Speaker name / date
- Suggested visual: the spar arena UI screenshot or a Matrix-style green-on-black title treatment (matches the demo's dark theme, `#001e2b` / `#00ed64`)

**Speaker notes:** Don't explain the title yet — the next slide pays it off.

### Slide 2: "I know kung fu."

**On slide:**
- The Matrix (1999): Neo is strapped into a chair, a program is loaded, seconds later — *"I know kung fu."*
- He didn't train for 10 years. He plugged in a module.
- Today's claim: **AI agents can do exactly this. The plug is MCP.**

**Speaker notes:** This is the whole talk in one image. An LLM out of the box doesn't know your database, your APIs, or — relevantly — the factions of the kung fu world. Connect one MCP server and it suddenly *knows* the domain and can *act* in it. The demo today is literal: a kung fu MCP server, sparring Neo vs Morpheus.

### Slide 3: What MCP actually is

**On slide:**
- **Model Context Protocol** — an open standard for connecting AI applications to external tools and data
- Open-sourced by Anthropic (Nov 2024); now adopted across the ecosystem (Claude, OpenAI, Google DeepMind, IDEs, inspector tooling)
- Under the hood: **JSON-RPC 2.0** over a transport (stdio or HTTP)
- Three roles: **Host** (the AI app) → **Client** (one per connection) → **Server** (yours)
- Spec + SDKs: [modelcontextprotocol.io](https://modelcontextprotocol.io/)

**Speaker notes:** Audience has heard of MCP, so keep this tight — the point is precision, not novelty. Emphasize: it's a *protocol*, not a framework or a library. Anything speaking the protocol interoperates. Today's server is TypeScript, but Python/Kotlin/C#/Java SDKs exist.

---

## Segment 2 — MCP and AI agents (4 min)

### Slide 4: Where MCP fits in an agent

**On slide (diagram):**
- The agent loop: **LLM → decides → calls tool → gets result → reasons → repeats → answers**
- Without tools, an LLM is a very well-read brain in a jar — frozen knowledge, no hands
- MCP is the standardized socket where tools/data plug into that loop
- Labels on the diagram: model = *brain*, MCP tools = *hands*, MCP resources = *reference library*

**Speaker notes:** An "agent" is fundamentally a model calling tools in a loop. The interesting engineering question is: where do the tools come from, and who maintains the glue? That's the setup for the next slide.

### Slide 5: The M×N problem → M+N (the USB-C analogy)

**On slide:**
- Before: M agents × N integrations = **M×N custom adapters** (every app writes its own Slack/GitHub/DB connector)
- After: each app implements MCP once, each integration implements MCP once = **M+N**
- **USB-C for AI**: one port; the laptop doesn't care if you plug in a monitor, a drive, or a keyboard
- Same server works unchanged in Claude, the MCP Inspector, a custom host, your internal agent

**Speaker notes:** This is the core economic argument. In the demo, the *same running server* will be consumed by two completely different hosts (Inspector, then the basic-host with a rich UI) without a single line of server code changing. Call that out when it happens.

### Slide 6: The cast for today

**On slide (architecture diagram):**
```
┌─────────────┐        ┌──────────────────────────┐
│  Host        │  MCP   │  kungfu-mcp server        │
│  (Inspector, │◄──────►│  Express + Streamable     │
│  basic-host, │  HTTP  │  HTTP on :3001/mcp        │
│  Claude, …)  │        │  tools · resources · app  │
└─────────────┘        └──────────────────────────┘
```
- One server, many hosts
- Today's server: catalogs 8 kung fu factions, narrates sparring matches, ships an interactive arena UI

**Speaker notes:** Introduce the demo project properly here: `kungfu-mcp` demonstrates every MCP primitive side by side in ~630 lines. Eight factions (Shaolin, Wudang, Emei, Beggar's Sect, Tang Sect, Ancient Tomb, Ming Cult, Huashan), each with signature techniques carrying threat scores — the data that powers everything else in the talk.

---

## Segment 3 — Building blocks of an MCP server (4 min)

### Slide 7: The three primitives (+ one extension)

**On slide (table):**

| Primitive | Who decides to use it | In kungfu-mcp |
|---|---|---|
| **Tools** | The **model** (function calling) | `list_factions`, `get_faction`, `spar`, `spar_arena` |
| **Resources** | The **application/user** (attached as context) | `kungfu://kungfu/roster`, `kungfu://factions/{id}` |
| **Prompts** | The **user** (slash-command templates) | *(not used here — mention only)* |
| **Apps** *(extension)* | Tool + `ui://` resource → interactive iframe | `spar_arena` + `ui://spar-arena/app.html` |

**Speaker notes:** The control-plane distinction is the thing people get wrong: tools are *model-controlled* (the LLM chooses to call them), resources are *application-driven* (the host or user attaches them as context). Fun detail from this repo: tools and resources render the *same markdown* via a shared formatter ([src/format.ts](../../src/format.ts)) — the primitives differ only in **who decides to fetch the content**.

### Slide 8: Tools — a function signature for the model

**On slide (code, trimmed from [src/tools.ts:9](../../src/tools.ts)):**
```ts
server.registerTool(
  "list_factions",
  {
    description: "List all major kungfu factions known to the kung fu world…",
    inputSchema: {},
    outputSchema: {
      factions: z.array(z.object({
        id: z.string(), name: z.string(), catchphrase: z.string(),
      })),
    },
  },
  async () => ({
    content: [{ type: "text", text: rosterMarkdown() }],
    structuredContent: { factions: /* …typed data… */ },
  }),
);
```

**Speaker notes:** Three parts: a **name**, a **schema contract** (Zod here, serialized to JSON Schema over the wire), and a **handler**. The `description` is not decoration — it's the API documentation *the model reads* to decide when to call the tool. Bad descriptions = tools that never get called. Note the return shape has two fields; hold that thought — slide 13 explains why.

### Slide 9: Resources — context on a URI

**On slide (code, trimmed from [src/resources.ts:20](../../src/resources.ts)):**
```ts
const factionTemplate = new ResourceTemplate("kungfu://factions/{id}", {
  list: async () => ({
    resources: KUNGFU_FACTIONS.map((f) => ({
      uri: `kungfu://factions/${f.id}`,
      name: `${f.name} profile`,
      mimeType: "text/markdown",
    })),
  }),
  complete: { id: () => KUNGFU_FACTIONS.map((f) => f.id) },
});
```
- Static resource: `kungfu://kungfu/roster`
- Template resource: `kungfu://factions/{id}` — enumerable (`list`) and autocompletable (`complete`)
- The URI is the **contract**: rename it and you break every client that references it

**Speaker notes:** Resources are addressable context. A host can list them, let the user pick one, and inject it into the conversation without the model asking. The template shows two ergonomics wins: `list()` makes every faction discoverable in a picker; `complete.id()` gives you autocomplete in the Inspector — you'll see both in the demo in two minutes.

### Slide 10: Demo 1 setup slide

**On slide:**
- **Live demo:** MCP Inspector → `http://localhost:3001/mcp`
- What to watch for: tool schemas, the `spar` narration, `structuredContent`, resource autocomplete

**Speaker notes:** Transition slide — keep it on screen while switching to the browser. Demo script: **Appendix A, Demo 1**.

---

## Segment 4 — Live demo 1: tools & resources in the Inspector (4 min)

*(No slide — live. Full click-by-click script in Appendix A. Summary of beats:)*

1. **Tools tab → `list_factions`** — point out both the markdown roster *and* the `structuredContent` JSON in one result.
2. **`get_faction` with `id: "shaolin"`** — full profile: techniques with threat levels, practitioners, catchphrase. Also try a bogus id — the error message lists known ids (graceful failure the *model* can recover from).
3. **`spar` with `faction_a: "shaolin"`, `faction_b: "wudang"`** — 3 rounds, random technique picks, threat-score verdict. Run it twice: different rounds each time.
4. **Resources tab** — read `kungfu://kungfu/roster`; browse `kungfu://factions/{id}` and show the id autocomplete.
5. Land the line: *"The Inspector is host #1. Same server, zero changes, meets host #2 in ten minutes."*

---

## Segment 5 — How MCP augments an agent (3 min)

### Slide 11: "I know kung fu" — knowledge *and* capability

**On slide:**
- Before connecting: ask the model about the "Handshake of Regret" → it hallucinates or shrugs
- After connecting, the agent gains:
  - **Knowledge** — 8 faction profiles, techniques, threat scores ([src/data.ts](../../src/data.ts) — the "kung fu download")
  - **Capability** — it can *run* a sparring match (`spar` executes scoring logic, not the model guessing)
- Neo didn't just learn *about* kung fu. He could *do* kung fu. Tools are the doing.

**Speaker notes:** This is the payoff of the title. Distinguish the two augmentations: resources/data extend what the agent *knows*; tools extend what it can *do*. The `spar` tool matters because the match outcome is computed server-side (random technique picks, threat sums — [src/tools.ts:143](../../src/tools.ts)) — deterministic-ish logic the model couldn't reliably fake. Real-world translation: your MCP server's "spar" is running a query, filing a ticket, deploying a service.

### Slide 12: One tool result, two consumers

**On slide (code, trimmed from the `spar` handler, [src/tools.ts:125](../../src/tools.ts)):**
```ts
return {
  content: [{ type: "text", text: sparNarration(a, b, nameA, nameB, outcome) }],
  structuredContent: outcome, // { rounds, verdict, winnerId }
};
```
- `content` → prose **for the LLM** to read and reason about
- `structuredContent` → typed JSON **for programmatic consumers** (validated against the tool's `outputSchema`)
- One call, no prose-parsing, no drift between what the model sees and what the UI renders

**Speaker notes:** Design pattern worth stealing. The narration ("The crowd gasps. A chicken flees.") is what the model summarizes to the user; `{ rounds, verdict, winnerId }` is what the arena UI animates. The UI never regex-parses prose. This dual-return is also the bridge into the next section — because the next consumer of `structuredContent` is an app running *inside the chat*.

---

## Segment 6 — Beyond text: MCP Apps (5 min incl. demo 2)

### Slide 13: Can MCP serve more than text? Yes — full interactive UI

**On slide:**
- MCP Apps: an official protocol **extension** ([modelcontextprotocol/ext-apps](https://github.com/modelcontextprotocol/ext-apps)) — servers ship interactive HTML UIs that hosts render inline in chat, sandboxed in an iframe
- The trick: a UI is *just a resource* with a `ui://` URI and an HTML mime type
- The kicker: the iframe can call tools **back on the same server**

**Speaker notes:** Reframe expectations: most people think MCP = text in, text out. Apps make a server's answer *renderable and interactive*. Requires HTTP transport (this server is HTTP-only for exactly that reason) and an app-capable host.

### Slide 14: The wiring — three moving parts

**On slide (code, trimmed from [src/app.ts:14](../../src/app.ts)):**
```ts
registerAppTool(server, "spar_arena", {
  title: "Kung Fu Spar Arena",
  inputSchema: {},
  _meta: { ui: { resourceUri: "ui://spar-arena/app.html" } },  // ← the hook
}, async () => ({
  content: [{ type: "text", text: "Arena ready. Select two factions…" }],
}));

registerAppResource(server, "Spar Arena", "ui://spar-arena/app.html",
  { description: "Interactive spar arena UI." },
  async () => ({ contents: [{ uri: APP_RESOURCE_URI,
    mimeType: RESOURCE_MIME_TYPE, text: bundledHtml }] }));
```
**Flow:** tool call → host sees `_meta.ui.resourceUri` → fetches the `ui://` resource → renders HTML in a sandboxed iframe

**Speaker notes:** Note how little ceremony there is: a tool that points at a resource, and a resource that returns HTML. The HTML is a single self-contained file (React app + CSS, bundled by Vite to ~487 KB) so the host needs exactly one fetch.

### Slide 15: The loop back — the UI is an MCP client too

**On slide (code, from [src/ui/ArenaApp.tsx:87](../../src/ui/ArenaApp.tsx)):**
```tsx
const res = await app.callServerTool({
  name: "spar",
  arguments: { faction_a: a.id, faction_b: b.id,
               champion_a: "Neo", champion_b: "Morpheus" },
});
setResult({ …, outcome: res.structuredContent as SparOutcome });
```
**On slide (round-trip diagram):**
```
LLM/user calls spar_arena ─► host renders ui:// iframe
        ▲                          │
        │            iframe calls list_factions / spar /
        └── same server ◄── get_faction via callServerTool
```

**Speaker notes:** This closes the architecture: the React app uses the `useApp` hook from `@modelcontextprotocol/ext-apps/react`, and on load calls `list_factions` to populate its dropdowns — the same tool the LLM called five minutes ago in the Inspector. Single source of truth ([src/data.ts](../../src/data.ts)); no duplicated data layer in the frontend. The `structuredContent` from slide 12 is what drives the round-by-round animation.

### Slide 16: Demo 2 setup slide

**On slide:**
- **Live demo:** basic-host (`http://localhost:8080`) → call `spar_arena` → Neo vs Morpheus
- What to watch for: inline iframe render, faction dropdowns filled via `list_factions`, animated rounds from `structuredContent`, profile panel via `get_faction`

**Speaker notes:** Demo script: **Appendix A, Demo 2**. Beats: call `spar_arena`, arena renders inline; pick factions for Neo and Morpheus; **Begin the Spar** → rounds animate in one by one, verdict lands with the winning faction's catchphrase; click **View Profile** → live `get_faction` call renders markdown in-panel. If time allows: theme toggle (Matrix dark mode), re-run spar to show fresh randomness. Land the line: *"Same 8 factions, same spar logic — but now the server brought its own UI to the chat."*

---

## Segment 7 — How to build an MCP server + wrap (3 min)

### Slide 17: Anatomy — the whole server on one slide

**On slide (annotated, from [server.ts:54](../../server.ts)):**
```ts
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => newSessionId,
});
const server = new McpServer({ name: "kungfu-mcp", version: "1.0.0" });
registerTools(server);          // src/tools.ts    — 4 tools
registerDataResources(server);  // src/resources.ts — roster + profiles
registerApp(server, bundledHtml); // src/app.ts    — arena tool + ui:// resource
await server.connect(transport);
```
- Express + CORS (must expose the `mcp-session-id` header for browser hosts)
- One `McpServer` + transport **per session**, tracked in a `Map`
- Total: **92-line entrypoint, ~630 lines of server code, ~350 lines of React**

**Speaker notes:** File-per-primitive layout is deliberate and worth copying: `tools.ts`, `resources.ts`, `app.ts`, shared `data.ts` + `format.ts`. One subtle production lesson in this file: the session id is generated and registered in the map *before* handling the request — otherwise the client's immediate follow-up request races the map insert and 400s ([server.ts:50](../../server.ts)).

### Slide 18: The recipe

**On slide:**
1. `npm i @modelcontextprotocol/sdk zod` — pick your SDK (TS/Python/Kotlin/…)
2. Define tools: name + description + schema + handler (`server.registerTool`)
3. Add resources for context that users/apps attach (`server.registerResource`)
4. Pick a transport — stdio for local CLIs, **Streamable HTTP** for anything remote or app-capable
5. Verify with the **MCP Inspector** before touching any real host
6. Optional level-up: bundle a UI, register it as a `ui://` resource (`@modelcontextprotocol/ext-apps`)

**Speaker notes:** Point at this repo as the reference implementation: `npm install && npm start` gives you everything shown today. Mention the build shape briefly if asked: two TypeScript targets (server → `build/`, UI typecheck) + Vite single-file bundle → `dist/mcp-app.html`, which the server reads at startup and serves as the resource.

### Slide 19: Takeaways

**On slide:**
- MCP is **USB-C for agents** — implement the port once, plug in anything (M+N, not M×N)
- Servers augment agents two ways: **knowledge** (resources/data) and **capability** (tools) — *"I know kung fu"*
- Return **`content` + `structuredContent`** — prose for the model, typed data for machines; one result, two consumers
- MCP is **not text-only**: a `ui://` resource + `_meta` turns a tool into an interactive app that calls the server back
- The entire demo is ~1,000 lines — **github.com/davidcai/kungfu-mcp** — clone it, spar with it

**Speaker notes:** Close on the Matrix bookend: *"Neo needed a chair, a spike in the back of his head, and Laurence Fishburne. Your agents just need a URL. Show them kung fu."* → Q&A.

---

## Appendix A — Demo scripts

### Pre-talk checklist (do this 30+ min before)

```bash
# 1. Server (terminal 1)
cd ~/dev/kungfu-mcp
npm install
npm start                      # builds server + UI, serves http://localhost:3001/mcp
# confirm log line: "kungfu-mcp listening on http://localhost:3001/mcp"

# 2. Inspector (terminal 2)
npm run inspect                # opens MCP Inspector in browser
# In Inspector: Transport = HTTP, URL = http://localhost:3001/mcp → Connect
# Leave connected.

# 3. App host (terminal 3)
git clone https://github.com/modelcontextprotocol/ext-apps.git /tmp/ext-apps
cd /tmp/ext-apps/examples/basic-host && npm install
SERVERS='["http://localhost:3001/mcp"]' npm start    # → http://localhost:8080
# Open http://localhost:8080, verify the server is listed. Leave the tab open.

# 4. Do one full dry run of both demos.
# 5. Fallback: screenshot/screen-record the dry run (see "If the demo gods frown").
```

### Demo 1 — Inspector (tools & resources), ~4 min

| Step | Action | Say |
|---|---|---|
| 1 | Inspector, **Tools** tab → **List Tools** | "Four tools, each with a schema the model reads." |
| 2 | Call `list_factions` | Point at the markdown roster, then scroll to `structuredContent` — "one result, two consumers." |
| 3 | Call `get_faction`, `id: "shaolin"` | Techniques with threat scores, practitioners, catchphrase. |
| 4 | Call `get_faction`, `id: "crane-style"` (bogus) | Error text lists valid ids — "errors the *model* can recover from." |
| 5 | Call `spar`, `faction_a: "shaolin"`, `faction_b: "wudang"` | Read one round aloud. Run again — different techniques, possibly different winner. |
| 6 | **Resources** tab → read `kungfu://kungfu/roster` | "Same markdown as the tool — different primitive, different controller." |
| 7 | Browse `kungfu://factions/{id}` template; type in the `id` field | Show autocomplete (from `complete.id()`); open `emei` or `ming-cult`. |
| 8 | (Optional) call `spar_arena` in Inspector | Returns only "Arena ready…" text — "the Inspector isn't an app host. Which brings us to…" |

### Demo 2 — Spar Arena app (basic-host), ~3 min inside segment 6

| Step | Action | Say |
|---|---|---|
| 1 | Switch to `http://localhost:8080` tab | "A minimal chat host that speaks the Apps extension." |
| 2 | Invoke `spar_arena` | Arena iframe renders inline. "That HTML came over MCP as a `ui://` resource." |
| 3 | Point at the filled dropdowns | "The iframe already called `list_factions` back on the server." |
| 4 | Pick factions (e.g., Neo → Shaolin, Morpheus → Wudang) → **Begin the Spar** | Rounds animate in one by one; verdict lands with the winner's catchphrase — all driven by `structuredContent`. |
| 5 | Click **View Profile** on a faction | Live `get_faction` call, markdown rendered in-panel. |
| 6 | (Time permitting) toggle dark mode; re-run the spar | Matrix palette; fresh random rounds. |

### If the demo gods frown (fallback)

- **Inspector won't connect:** restart server (`npm start`), reconnect. Worst case: talk over pre-taken screenshots.
- **Arena shows "Arena not built":** `dist/mcp-app.html` missing — run `npm run build`, restart server ([src/app.ts:46](../../src/app.ts) serves this stub deliberately).
- **basic-host fails:** fall back to the pre-recorded dry-run video/screenshots; the Inspector demo alone still covers tools + resources.
- Keep the screenshots/recording in the same folder as the deck.

## Appendix B — Facts to keep straight (grounding cheat-sheet)

- 8 factions in [src/data.ts](../../src/data.ts): `shaolin`, `wudang`, `emei`, `beggar`, `tang`, `ancient-tomb`, `ming-cult`, `huashan`.
- Spar mechanics ([src/tools.ts:143](../../src/tools.ts)): 3 rounds; each round randomly picks one signature technique per side; scores are summed threat values; higher total wins; ties are declared "a classic."
- Champion names (`champion_a`/`champion_b`, e.g. Neo/Morpheus) replace faction names in narration only — scoring is per-faction.
- Resource URIs (the MCP contract — quote exactly): `kungfu://kungfu/roster`, `kungfu://factions/{id}`, `ui://spar-arena/app.html`.
- Transport: Streamable HTTP only (`StreamableHTTPServerTransport`); stdio was dropped because Apps require HTTP.
- Line counts: server ~630 lines (entrypoint 92), UI ~350 lines; bundled UI ~487 KB single file.
- MCP: open standard, open-sourced by Anthropic Nov 2024; JSON-RPC 2.0; SDKs in TypeScript, Python, and more; spec at modelcontextprotocol.io.
- MCP Apps: official extension, repo `modelcontextprotocol/ext-apps`; host renders `ui://` resources in a sandboxed iframe; UI uses the `useApp` React hook and `app.callServerTool`.
