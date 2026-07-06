import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";

const APP_RESOURCE_URI = "ui://spar-arena/app.html";

// MCP App: the spar_arena tool points at a ui:// resource via _meta; the host
// fetches that resource and renders it inline. The UI then calls list_factions,
// spar, and get_faction back on this server.
export function registerApp(server: McpServer, bundledHtml: string): void {
  registerAppTool(
    server,
    "spar_arena",
    {
      title: "Kung Fu Spar Arena",
      description:
        "Launch the interactive spar arena. Pick two factions and watch them duel. Renders an inline UI; the UI calls list_factions, spar, and get_faction back on this server.",
      inputSchema: {},
      _meta: { ui: { resourceUri: APP_RESOURCE_URI } },
    },
    async () => ({
      content: [{ type: "text", text: "Arena ready. Select two factions and begin the spar." }],
    }),
  );

  registerAppResource(
    server,
    "Spar Arena",
    APP_RESOURCE_URI,
    { description: "Interactive spar arena UI." },
    async () => ({
      contents: [
        {
          uri: APP_RESOURCE_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: bundledHtml || missingHtmlStub(),
        },
      ],
    }),
  );
}

function missingHtmlStub(): string {
  return [
    "<!doctype html><html><body style='font-family:sans-serif;padding:2rem'>",
    "<h1>Arena not built</h1>",
    "<p>Run <code>npm run build</code> in the kungfu-mcp project, then restart the server.</p>",
    "</body></html>",
  ].join("");
}
