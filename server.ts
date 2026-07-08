import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { MCPServer } from "@mastra/mcp";
import { listFactionsTool, getFactionTool, sparTool } from "./src/tools.js";
import { kungfuResources } from "./src/resources.js";
import { sparArenaTool, appResources } from "./src/app.js";

const PORT = 3001;

const mcpServer = new MCPServer({
  name: "kungfu-mcp",
  version: "1.0.0",
  tools: {
    list_factions: listFactionsTool,
    get_faction: getFactionTool,
    spar: sparTool,
    spar_arena: sparArenaTool,
  },
  resources: kungfuResources,
  appResources,
});

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, mcp-session-id, Accept",
  );
  res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");
}

const httpServer = createServer(
  async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === "OPTIONS") {
      setCorsHeaders(res);
      res.writeHead(204);
      res.end();
      return;
    }

    setCorsHeaders(res);

    const url = new URL(req.url ?? "", `http://localhost:${PORT}`);
    if (url.pathname === "/mcp") {
      await mcpServer.startHTTP({
        url,
        httpPath: "/mcp",
        req,
        res,
      });
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    }
  },
);

httpServer.listen(PORT, () => {
  console.error(`kungfu-mcp listening on http://localhost:${PORT}/mcp`);
});
