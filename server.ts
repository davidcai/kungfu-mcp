import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerTools } from "./src/tools.js";
import { registerDataResources } from "./src/resources.js";
import { registerApp } from "./src/app.js";

const PORT = 3001;
const distHtmlPath = path.resolve(process.cwd(), "dist", "mcp-app.html");

async function loadBundledHtml(): Promise<string> {
  try {
    return await readFile(distHtmlPath, "utf-8");
  } catch {
    console.warn(
      `[kungfu-mcp] dist/mcp-app.html not found at ${distHtmlPath}. Run "npm run build" first. The spar_arena UI resource will return an error until the UI is built.`,
    );
    return "";
  }
}

const bundledHtml = await loadBundledHtml();

type Session = { server: McpServer; transport: StreamableHTTPServerTransport };
const sessions = new Map<string, Session>();

const app = express();
// exposedHeaders is required so browser-based hosts (like basic-host) can read
// the mcp-session-id response header and send it back on subsequent requests.
app.use(cors({ exposedHeaders: ["mcp-session-id"] }));
app.use(express.json());

app.post("/mcp", async (req, res) => {
  const sessionId = req.header("mcp-session-id") as string | undefined;

  if (sessionId && sessions.has(sessionId)) {
    await sessions.get(sessionId)!.transport.handleRequest(req, res, req.body);
    return;
  }

  if (sessionId) {
    res.status(400).json({ error: "Unknown session id. Re-initialize." });
    return;
  }

  // Pre-generate the session id and register in the map BEFORE handling the
  // request. handleRequest sends the response (with the session id header) to
  // the client, which may immediately send a follow-up request with that id —
  // so the map must be populated first to avoid a race-condition 400.
  const newSessionId = randomUUID();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => newSessionId,
  });
  const server = new McpServer({ name: "kungfu-mcp", version: "1.0.0" });
  registerTools(server);
  registerDataResources(server);
  registerApp(server, bundledHtml);
  sessions.set(newSessionId, { server, transport });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

function requireSession(req: express.Request, res: express.Response): Session | undefined {
  const sessionId = req.header("mcp-session-id");
  const session = sessionId ? sessions.get(sessionId) : undefined;
  if (!session) {
    res.status(400).json({ error: `Invalid or missing session id for ${req.method}.` });
  }
  return session;
}

app.get("/mcp", async (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  await session.transport.handleRequest(req, res);
});

app.delete("/mcp", async (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  await session.transport.handleRequest(req, res);
  await session.server.close();
  sessions.delete(req.header("mcp-session-id")!);
});

app.listen(PORT, () => {
  console.error(`kungfu-mcp listening on http://localhost:${PORT}/mcp`);
});
