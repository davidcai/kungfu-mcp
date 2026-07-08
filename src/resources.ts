import type { MCPServerResources } from "@mastra/mcp";
import { KUNGFU_FACTIONS, findFaction } from "./data.js";
import { rosterMarkdown, profileMarkdown } from "./format.js";

const ROSTER_URI = "kungfu://kungfu/roster";
const MARKDOWN_MIME = "text/markdown";

export const kungfuResources: MCPServerResources = {
  listResources: async () => [
    {
      uri: ROSTER_URI,
      name: "kungfu-roster",
      description: "The full kung fu faction roster, as markdown.",
      mimeType: MARKDOWN_MIME,
    },
    ...KUNGFU_FACTIONS.map((f) => ({
      uri: `kungfu://factions/${f.id}`,
      name: `${f.name} profile`,
      description: `Profile for ${f.name} — ${f.faction}`,
      mimeType: MARKDOWN_MIME,
    })),
  ],

  getResourceContent: async ({ uri }) => {
    if (uri === ROSTER_URI) {
      return { text: rosterMarkdown() };
    }

    const id = uri.split("/").pop() ?? "";
    const faction = findFaction(decodeURIComponent(id));
    if (!faction) {
      return {
        text: `# Not found\n\nNo faction with id "${id}" was found in the kung fu world.`,
      };
    }
    return { text: profileMarkdown(faction) };
  },
};
