import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import path from "node:path";
import type { AppResources } from "@mastra/mcp";

const APP_RESOURCE_URI = "ui://spar-arena/app.html";

export const sparArenaTool = createTool({
  id: "spar_arena",
  description:
    "Launch the interactive spar arena. Pick two factions and watch them duel. Renders an inline UI; the UI calls list_factions, spar, and get_faction back on this server.",
  inputSchema: z.object({}),
  execute: async () => ({
    message: "Arena ready. Select two factions and begin the spar.",
  }),
  mcp: { _meta: { ui: { resourceUri: APP_RESOURCE_URI } } },
});

export const appResources: AppResources = {
  [APP_RESOURCE_URI]: {
    name: "Spar Arena",
    description: "Interactive spar arena UI.",
    htmlPath: path.resolve(process.cwd(), "dist", "mcp-app.html"),
  },
};
