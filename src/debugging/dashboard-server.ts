/**
 * Debug Dashboard Server
 *
 * Serves a web-based dashboard for real-time agent debugging and observability.
 */

import { EventEmitter } from "node:events";
import * as http from "node:http";
import * as url from "node:url";

import type { DebugCollector } from "./collector.js";
import type { DashboardConfig, DebugSession, DashboardSnapshot } from "./types.js";

export type DashboardServerOptions = {
  collector: DebugCollector;
  config?: DashboardConfig;
};

type WebSocketClient = {
  id: string;
  send: (data: string) => void;
  close: () => void;
};

/**
 * HTTP server for the debug dashboard
 */
export class DashboardServer extends EventEmitter {
  private collector: DebugCollector;
  private config: DashboardConfig;
  private server: http.Server | null = null;
  private wsClients: Map<string, WebSocketClient> = new Map();
  private updateTimer: NodeJS.Timeout | null = null;

  constructor(options: DashboardServerOptions) {
    super();
    this.collector = options.collector;
    this.config = options.config ?? { enabled: true, port: 9999 };

    // Forward collector events to WebSocket clients
    if (this.config.liveUpdates !== false) {
      this.setupEventForwarding();
    }
  }

  /**
   * Start the dashboard server
   */
  async start(): Promise<void> {
    if (!this.config.enabled) return;

    const port = this.config.port ?? 9999;

    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    // Handle WebSocket upgrade (simplified - production would use ws library)
    this.server.on("upgrade", (req, socket, head) => {
      // Note: Real WebSocket handling would require the 'ws' package
      // This is a placeholder showing the structure
      console.log("WebSocket connection attempted - requires ws package for full support");
    });

    await new Promise<void>((resolve, reject) => {
      this.server!.listen(port, () => {
        console.log(`Debug dashboard running at http://localhost:${port}`);
        resolve();
      });
      this.server!.on("error", reject);
    });

    // Start periodic updates if configured
    if (this.config.liveUpdates !== false && this.config.updateInterval) {
      this.startPeriodicUpdates();
    }
  }

  /**
   * Stop the dashboard server
   */
  async stop(): Promise<void> {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    // Close all WebSocket connections
    for (const client of this.wsClients.values()) {
      client.close();
    }
    this.wsClients.clear();

    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => resolve());
      });
      this.server = null;
    }
  }

  /**
   * Handle HTTP requests
   */
  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const parsedUrl = url.parse(req.url ?? "/", true);
    const pathname = parsedUrl.pathname ?? "/";

    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    try {
      switch (pathname) {
        case "/":
          this.serveDashboardHTML(res);
          break;
        case "/api/snapshot":
          this.serveJSON(res, this.collector.getSnapshot());
          break;
        case "/api/sessions":
          this.serveJSON(res, this.collector.getAllSessions());
          break;
        case "/api/sessions/active":
          this.serveJSON(res, this.collector.getActiveSessions());
          break;
        case "/api/tools/stats":
          this.serveJSON(res, Object.fromEntries(this.collector.getToolStats()));
          break;
        default:
          // Check for session-specific endpoints
          if (pathname.startsWith("/api/session/")) {
            const sessionId = pathname.replace("/api/session/", "");
            const session = this.collector.getSession(sessionId);
            if (session) {
              this.serveJSON(res, session);
            } else {
              res.writeHead(404);
              res.end(JSON.stringify({ error: "Session not found" }));
            }
          } else {
            res.writeHead(404);
            res.end(JSON.stringify({ error: "Not found" }));
          }
      }
    } catch (error) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: String(error) }));
    }
  }

  /**
   * Serve JSON response
   */
  private serveJSON(res: http.ServerResponse, data: unknown): void {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(200);
    res.end(JSON.stringify(data, this.jsonReplacer, 2));
  }

  /**
   * JSON replacer to handle Maps and Dates
   */
  private jsonReplacer(_key: string, value: unknown): unknown {
    if (value instanceof Map) {
      return Object.fromEntries(value);
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }

  /**
   * Serve the dashboard HTML
   */
  private serveDashboardHTML(res: http.ServerResponse): void {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agent Debug Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: #0f0f0f;
      color: #e0e0e0;
      min-height: 100vh;
    }
    .header {
      background: #1a1a1a;
      border-bottom: 1px solid #333;
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h1 { font-size: 1.25rem; color: #fff; }
    .status-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: #22c55e;
      display: inline-block;
      margin-right: 8px;
    }
    .status-dot.warning { background: #f59e0b; }
    .status-dot.error { background: #ef4444; }
    .container { padding: 1.5rem 2rem; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 1.25rem;
    }
    .stat-label { color: #888; font-size: 0.875rem; }
    .stat-value { font-size: 1.75rem; font-weight: 600; margin-top: 0.25rem; }
    .stat-value.cost { color: #22c55e; }
    .stat-value.warning { color: #f59e0b; }
    .stat-value.error { color: #ef4444; }
    .section { margin-bottom: 2rem; }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .section-title { font-size: 1.125rem; font-weight: 600; }
    .table {
      width: 100%;
      border-collapse: collapse;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      overflow: hidden;
    }
    .table th, .table td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid #333;
    }
    .table th { background: #242424; color: #888; font-weight: 500; font-size: 0.875rem; }
    .table tr:last-child td { border-bottom: none; }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .badge.active { background: #22c55e22; color: #22c55e; }
    .badge.completed { background: #3b82f622; color: #3b82f6; }
    .badge.failed { background: #ef444422; color: #ef4444; }
    .badge.thinking { background: #f59e0b22; color: #f59e0b; }
    .progress-bar {
      width: 100%;
      height: 8px;
      background: #333;
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: #3b82f6;
      transition: width 0.3s;
    }
    .progress-fill.warning { background: #f59e0b; }
    .progress-fill.danger { background: #ef4444; }
    .refresh-btn {
      background: #333;
      border: none;
      color: #fff;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.875rem;
    }
    .refresh-btn:hover { background: #444; }
    .empty { color: #666; font-style: italic; padding: 2rem; text-align: center; }
  </style>
</head>
<body>
  <header class="header">
    <div style="display:flex;align-items:center;">
      <span class="status-dot" id="status-dot"></span>
      <h1>Agent Debug Dashboard</h1>
    </div>
    <button class="refresh-btn" onclick="refresh()">Refresh</button>
  </header>

  <div class="container">
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Active Sessions</div>
        <div class="stat-value" id="active-sessions">-</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Active Executions</div>
        <div class="stat-value" id="active-executions">-</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Tokens Today</div>
        <div class="stat-value" id="tokens-today">-</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Cost Today</div>
        <div class="stat-value cost" id="cost-today">-</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Active Sub-Agents</div>
        <div class="stat-value" id="active-subagents">-</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Recent Errors</div>
        <div class="stat-value" id="recent-errors">-</div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <h2 class="section-title">Active Sessions</h2>
      </div>
      <table class="table" id="sessions-table">
        <thead>
          <tr>
            <th>Session ID</th>
            <th>Agent</th>
            <th>Channel</th>
            <th>Status</th>
            <th>Tokens Used</th>
            <th>Token Budget</th>
            <th>Started</th>
          </tr>
        </thead>
        <tbody id="sessions-body">
          <tr><td colspan="7" class="empty">Loading...</td></tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-header">
        <h2 class="section-title">Tool Usage</h2>
      </div>
      <table class="table" id="tools-table">
        <thead>
          <tr>
            <th>Tool</th>
            <th>Invocations</th>
            <th>Avg Duration</th>
            <th>Error Rate</th>
          </tr>
        </thead>
        <tbody id="tools-body">
          <tr><td colspan="4" class="empty">Loading...</td></tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-header">
        <h2 class="section-title">Top Agents by Usage</h2>
      </div>
      <table class="table" id="agents-table">
        <thead>
          <tr>
            <th>Agent ID</th>
            <th>Tokens Used</th>
          </tr>
        </thead>
        <tbody id="agents-body">
          <tr><td colspan="2" class="empty">Loading...</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <script>
    async function refresh() {
      try {
        const [snapshot, sessions, tools] = await Promise.all([
          fetch('/api/snapshot').then(r => r.json()),
          fetch('/api/sessions/active').then(r => r.json()),
          fetch('/api/tools/stats').then(r => r.json())
        ]);

        // Update stats
        document.getElementById('active-sessions').textContent = snapshot.activeSessions;
        document.getElementById('active-executions').textContent = snapshot.activeExecutions;
        document.getElementById('tokens-today').textContent = formatNumber(snapshot.tokensToday.total);
        document.getElementById('cost-today').textContent = '$' + snapshot.costToday.totalCost.toFixed(4);
        document.getElementById('active-subagents').textContent = snapshot.activeSubAgents;
        document.getElementById('recent-errors').textContent = snapshot.recentErrors;

        // Update status dot
        const dot = document.getElementById('status-dot');
        if (snapshot.recentErrors > 5) {
          dot.className = 'status-dot error';
        } else if (snapshot.recentErrors > 0) {
          dot.className = 'status-dot warning';
        } else {
          dot.className = 'status-dot';
        }

        // Update sessions table
        const sessionsBody = document.getElementById('sessions-body');
        if (sessions.length === 0) {
          sessionsBody.innerHTML = '<tr><td colspan="7" class="empty">No active sessions</td></tr>';
        } else {
          sessionsBody.innerHTML = sessions.map(s => {
            const progress = s.tokenBudget.percentUsed;
            const progressClass = progress > 90 ? 'danger' : progress > 70 ? 'warning' : '';
            return \`<tr>
              <td>\${s.id.slice(0, 8)}...</td>
              <td>\${s.agentId}</td>
              <td>\${s.channel || '-'}</td>
              <td><span class="badge active">Active</span></td>
              <td>\${formatNumber(s.tokenBudget.usedTokens)}</td>
              <td>
                <div class="progress-bar">
                  <div class="progress-fill \${progressClass}" style="width: \${progress}%"></div>
                </div>
              </td>
              <td>\${new Date(s.startedAt).toLocaleTimeString()}</td>
            </tr>\`;
          }).join('');
        }

        // Update tools table
        const toolsBody = document.getElementById('tools-body');
        const toolEntries = Object.entries(tools);
        if (toolEntries.length === 0) {
          toolsBody.innerHTML = '<tr><td colspan="4" class="empty">No tool invocations</td></tr>';
        } else {
          toolsBody.innerHTML = toolEntries.map(([name, stats]) => \`<tr>
            <td>\${name}</td>
            <td>\${stats.count}</td>
            <td>\${stats.avgDuration.toFixed(0)}ms</td>
            <td>\${(stats.errorRate * 100).toFixed(1)}%</td>
          </tr>\`).join('');
        }

        // Update agents table
        const agentsBody = document.getElementById('agents-body');
        if (snapshot.topAgentsByUsage.length === 0) {
          agentsBody.innerHTML = '<tr><td colspan="2" class="empty">No agent usage</td></tr>';
        } else {
          agentsBody.innerHTML = snapshot.topAgentsByUsage.map(a => \`<tr>
            <td>\${a.agentId}</td>
            <td>\${formatNumber(a.tokens)}</td>
          </tr>\`).join('');
        }
      } catch (err) {
        console.error('Refresh failed:', err);
      }
    }

    function formatNumber(n) {
      if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
      if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
      return n.toString();
    }

    // Initial load
    refresh();

    // Auto-refresh every 5 seconds
    setInterval(refresh, 5000);
  </script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html");
    res.writeHead(200);
    res.end(html);
  }

  /**
   * Set up event forwarding to WebSocket clients
   */
  private setupEventForwarding(): void {
    const events = [
      "execution:started",
      "execution:stateChanged",
      "execution:completed",
      "execution:failed",
      "tool:invoked",
      "tool:completed",
      "tool:failed",
      "tokens:updated",
      "tokens:warning",
      "subagent:started",
      "subagent:completed",
      "session:created",
      "session:ended",
      "error",
    ];

    for (const event of events) {
      this.collector.on(event, (data) => {
        this.broadcastToClients({ event, data });
      });
    }
  }

  /**
   * Broadcast message to all WebSocket clients
   */
  private broadcastToClients(message: { event: string; data: unknown }): void {
    const json = JSON.stringify(message, this.jsonReplacer);
    for (const client of this.wsClients.values()) {
      try {
        client.send(json);
      } catch {
        // Ignore send errors
      }
    }
  }

  /**
   * Start periodic snapshot updates
   */
  private startPeriodicUpdates(): void {
    const interval = this.config.updateInterval ?? 1000;

    this.updateTimer = setInterval(() => {
      const snapshot = this.collector.getSnapshot();
      this.broadcastToClients({ event: "snapshot", data: snapshot });
    }, interval);
  }
}
