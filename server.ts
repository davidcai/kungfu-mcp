import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
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

type Session = { server: McpServer; transport: WebStandardStreamableHTTPServerTransport };
const sessions = new Map<string, Session>();

const app = new Hono();
// exposeHeaders is required so browser-based hosts (like basic-host) can read
// the mcp-session-id response header and send it back on subsequent requests.
app.use("*", cors({ exposeHeaders: ["mcp-session-id"] }));

app.post("/mcp", async (c) => {
  const sessionId = c.req.header("mcp-session-id");

  if (sessionId && sessions.has(sessionId)) {
    return sessions.get(sessionId)!.transport.handleRequest(c.req.raw);
  }

  if (sessionId) {
    return c.json({ error: "Unknown session id. Re-initialize." }, 400);
  }

  // Pre-generate the session id and register in the map BEFORE handling the
  // request. handleRequest sends the response (with the session id header) to
  // the client, which may immediately send a follow-up request with that id —
  // so the map must be populated first to avoid a race-condition 400.
  const newSessionId = randomUUID();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => newSessionId,
  });
  const server = new McpServer({ name: "kungfu-mcp", version: "1.0.0" });
  registerTools(server);
  registerDataResources(server);
  registerApp(server, bundledHtml);
  sessions.set(newSessionId, { server, transport });
  await server.connect(transport);
  return transport.handleRequest(c.req.raw);
});

function requireSession(c: Context): Session | undefined {
  const sessionId = c.req.header("mcp-session-id");
  return sessionId ? sessions.get(sessionId) : undefined;
}

app.get("/mcp", async (c) => {
  const session = requireSession(c);
  if (!session) return c.json({ error: "Invalid or missing session id for GET." }, 400);
  return session.transport.handleRequest(c.req.raw);
});

app.delete("/mcp", async (c) => {
  const session = requireSession(c);
  if (!session) return c.json({ error: "Invalid or missing session id for DELETE." }, 400);
  const response = await session.transport.handleRequest(c.req.raw);
  await session.server.close();
  sessions.delete(c.req.header("mcp-session-id")!);
  return response;
});

serve({ fetch: app.fetch, port: PORT }, () => {
  console.error(`kungfu-mcp listening on http://localhost:${PORT}/mcp`);
});
