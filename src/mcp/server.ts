import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools, defaultDeps } from "./tools.ts";

export function createServer(deps = defaultDeps): McpServer {
  const server = new McpServer({ name: "prestocks-pulse", version: "0.1.0" });

  registerTools(server, deps);

  return server;
}
