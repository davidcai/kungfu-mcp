# kungfu-mcp

A humorous [Model Context Protocol](https://modelcontextprotocol.io/) server, in TypeScript, that catalogs the major factions of the **jianghu** (the martial-arts underworld) and narrates sparring matches between them.

Built for a presentation demo to illustrate the **main building blocks of an MCP server** — tools, schema validation, the stdio transport, and the client/server handshake — without taking itself too seriously.

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
| `list_factions`  | _(none)_                   | Returns the full roster as a compact briefing.           |
| `get_faction`    | `id: string`               | Returns the full (humorous) dossier for one faction.    |
| `spar`           | `faction_a, faction_b: string` | Narrates a biased, non-canonical sparring match.      |

## Quickstart

```bash
npm install
npm run build
```

### Try it with the MCP Inspector

```bash
npm start
```

This launches the official `@modelcontextprotocol/inspector`, where you can call `list_factions`, `get_faction`, and `spar` from a UI.

### Or wire it into an MCP client

Add the following to your client's server config (e.g. `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "kungfu": {
      "command": "node",
      "args": ["/absolute/path/to/kungfu-mcp/build/index.js"]
    }
  }
}
```

## Project layout

```
package.json     # deps, "type":"module", build script
tsconfig.json    # ES2022 / Node16, outDir build
src/
  index.ts       # McpServer instance + 3 tools + stdio transport
  data.ts        # KungfuFaction[] dataset (the heart of the humor)
```

## Notes

- This is a demo. All factions, fun facts, and spar outcomes are fabricated for entertainment.
- The server logs to **stderr** only (stdout is reserved for JSON-RPC, per MCP stdio transport rules).
