#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as dotenv from "dotenv";
import { CanvasConfig } from './types.js';
import { CanvasClient } from './canvasClient.js';
import { registerCourseTools } from './tools/courses.js';
import { registerAssignmentTools } from './tools/assignments.js';
import { registerGradeTools } from './tools/grades.js';
import { registerContentTools } from './tools/content.js';
import { registerAnnouncementTools } from './tools/announcements.js';
import { registerPlanningTools } from './tools/planning.js';
import { registerPrompts } from './tools/prompts.js';

// Laad environment variabelen
dotenv.config();

// Maak de MCP server aan
const server = new McpServer({
  name: "Canvas Study Buddy",
  version: "1.0.0"
});

// Lees configuratie uit environment variabelen
const config: CanvasConfig = {
  apiToken: process.env.CANVAS_API_TOKEN || "",
  baseUrl: process.env.CANVAS_BASE_URL || "https://fhict.instructure.com",
};

// Valideer configuratie
if (!config.apiToken) {
  console.error("Fout: CANVAS_API_TOKEN environment variabele is vereist");
  process.exit(1);
}

// Maak de CanvasClient instance aan
const canvas = new CanvasClient(config.baseUrl, config.apiToken);

// Registreer alle tools
registerCourseTools(server, canvas);
registerAssignmentTools(server, canvas);
registerGradeTools(server, canvas);
registerContentTools(server, canvas);
registerAnnouncementTools(server, canvas);
registerPlanningTools(server, canvas);
registerPrompts(server, canvas);

// Start de server
async function startServer() {
  try {
    console.error("Canvas Study Buddy wordt gestart...");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Canvas Study Buddy draait op stdio");
  } catch (error) {
    console.error("Fatale fout:", error);
    process.exit(1);
  }
}

startServer();
