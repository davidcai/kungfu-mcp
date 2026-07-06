import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { KUNGFU_FACTIONS, findFaction } from "./data.js";
import { rosterMarkdown, profileMarkdown } from "./format.js";

const ROSTER_URI = "kungfu://jianghu/roster";
const MARKDOWN_MIME = "text/markdown";

export function registerDataResources(server: McpServer): void {
  // Static resource: full roster as markdown.
  server.registerResource(
    "jianghu-roster",
    ROSTER_URI,
    { description: "The full jianghu faction roster, as markdown.", mimeType: MARKDOWN_MIME },
    async () => ({
      contents: [{ uri: ROSTER_URI, mimeType: MARKDOWN_MIME, text: rosterMarkdown() }],
    }),
  );

  // Template resource: per-faction profile as markdown.
  const factionTemplate = new ResourceTemplate("kungfu://factions/{id}", {
    list: async () => ({
      resources: KUNGFU_FACTIONS.map((f) => ({
        uri: `kungfu://factions/${f.id}`,
        name: `${f.name} profile`,
        description: `Profile for ${f.name} — ${f.faction}`,
        mimeType: MARKDOWN_MIME,
      })),
    }),
    complete: {
      id: () => KUNGFU_FACTIONS.map((f) => f.id),
    },
  });

  server.registerResource(
    "faction-profile",
    factionTemplate,
    { description: "Per-faction profile (markdown). Pass an id like 'shaolin'.", mimeType: MARKDOWN_MIME },
    async (uri) => {
      const id = uri.pathname.split("/").pop() ?? "";
      const faction = findFaction(decodeURIComponent(id));
      if (!faction) {
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: MARKDOWN_MIME,
              text: `# Not found\n\nNo faction with id "${id}" was found in the jianghu.`,
            },
          ],
        };
      }
      return {
        contents: [
          { uri: uri.toString(), mimeType: MARKDOWN_MIME, text: profileMarkdown(faction) },
        ],
      };
    },
  );
}
