---
summary: "Security Enhancements: RBAC, audit logging, rate limiting, and security policies"
read_when:
  - You want fine-grained access control
  - You need audit trails for compliance
  - You want rate limiting to prevent abuse
---

# Security Enhancements

Comprehensive security features including Role-Based Access Control (RBAC), audit logging, rate limiting, and security policies. Protect your Moltbot deployment with enterprise-grade security.

## Overview

Security Enhancements provide:

- **RBAC**: Fine-grained permission control with role inheritance
- **Audit Logging**: Comprehensive tracking of all security events
- **Rate Limiting**: Configurable limits to prevent abuse
- **Security Policies**: Time-based and context-aware access rules
- **Auto-Approval**: Smart patterns for trusted contacts

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Security System                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │    RBAC     │  │   Audit     │  │    Rate     │              │
│  │   Manager   │  │   Logger    │  │   Limiter   │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│         └────────────────┼────────────────┘                      │
│                          │                                       │
│                          ▼                                       │
│                 ┌─────────────────┐                              │
│                 │Security Manager │                              │
│                 └────────┬────────┘                              │
│                          │                                       │
│                          ▼                                       │
│                 ┌─────────────────┐                              │
│                 │ Policy Engine   │                              │
│                 └─────────────────┘                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Role-Based Access Control (RBAC)

### Built-in Roles

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| `owner` | Full system access | All permissions (`*`) |
| `admin` | Administrative access | Manage users, roles, agents |
| `operator` | Operational access | Execute agents, manage sessions |
| `user` | Standard user | Interact with agents, basic tools |
| `readonly` | Read-only access | View agents, sessions, config |
| `guest` | Limited guest | View agents only |

### Configuration

```json5
{
  "security": {
    "enabled": true,
    "rbac": {
      "enabled": true,
      "defaultRole": "user",

      // Custom roles
      "roles": [
        {
          "id": "developer",
          "name": "Developer",
          "description": "Developer access with code tools",
          "permissions": [
            "agent:read",
            "agent:execute",
            "tool:bash",
            "tool:write",
            "tool:edit",
            "session:*"
          ],
          "inherits": ["user"]  // Inherit from user role
        }
      ],

      // Principal assignments
      "principals": [
        {
          "id": "admin@example.com",
          "type": "user",
          "name": "Admin User",
          "roles": ["admin"]
        },
        {
          "id": "dev@example.com",
          "type": "user",
          "roles": ["developer"],
          "channelRoles": {
            "slack": ["operator"]  // Elevated in Slack
          }
        }
      ]
    }
  }
}
```

### Permission Patterns

```
Category:Action format

agent:create     - Create agents
agent:read       - View agents
agent:update     - Modify agents
agent:delete     - Delete agents
agent:execute    - Execute agent tasks

session:create   - Create sessions
session:read     - View sessions
session:update   - Modify sessions
session:delete   - Delete sessions
session:reset    - Reset sessions

tool:bash        - Use bash tool
tool:write       - Use write tool
tool:edit        - Use edit tool
tool:browser     - Use browser tool
tool:web         - Use web tools
tool:*           - All tools

channel:connect  - Connect channels
channel:send     - Send messages
channel:receive  - Receive messages

config:read      - Read configuration
config:write     - Modify configuration

admin:users      - Manage users
admin:roles      - Manage roles
admin:audit      - View audit logs

*                - All permissions
```

### Programmatic Usage

```typescript
import { RBACManager, BUILTIN_ROLES } from "./security/index.js";

// Initialize RBAC
const rbac = new RBACManager({
  defaultRole: "user",
  principals: [
    { id: "admin@example.com", type: "user", roles: ["admin"] },
  ],
});

// Check permission
if (rbac.hasPermission("admin@example.com", "tool:bash")) {
  // User can use bash
}

// Check with context
if (rbac.hasPermission("dev@example.com", "tool:bash", {
  channel: "slack",
  agentId: "main",
})) {
  // User can use bash in Slack with main agent
}

// Assign roles
rbac.assignRoles("user@example.com", ["developer"]);

// Create custom role
rbac.upsertRole({
  id: "custom-role",
  name: "Custom Role",
  permissions: ["agent:read", "session:*"],
});
```

## Audit Logging

### Configuration

```json5
{
  "security": {
    "audit": {
      "enabled": true,
      "backend": "file",           // memory, file, external
      "logPath": "./logs/audit.log",
      "minSeverity": "info",       // info, warning, error, critical
      "retentionDays": 90,
      "maxMemoryEntries": 10000,

      // External webhook
      "webhookUrl": "https://audit.example.com/ingest"
    }
  }
}
```

### Audit Events

| Event | Description | Severity |
|-------|-------------|----------|
| `auth.login` | Successful authentication | info |
| `auth.failed` | Failed authentication | warning |
| `authz.granted` | Permission granted | info |
| `authz.denied` | Permission denied | warning |
| `tool.invoked` | Tool executed | info |
| `tool.blocked` | Tool blocked | warning |
| `security.rate_limit_exceeded` | Rate limit hit | warning |
| `admin.gateway_started` | Gateway started | info |

### Programmatic Usage

```typescript
import { AuditLogger } from "./security/index.js";

// Initialize
const audit = new AuditLogger({
  enabled: true,
  backend: "file",
  logPath: "./logs/audit.log",
});

// Log events
await audit.logAuthSuccess({
  principal: { id: "user@example.com", type: "user" },
  method: "telegram",
  channel: "telegram",
});

await audit.logToolInvoked({
  principal: { id: "user@example.com", type: "user" },
  toolName: "bash",
  agentId: "main",
  input: { command: "git status" },
});

// Query audit log
const entries = await audit.query({
  actions: ["auth.failed", "authz.denied"],
  startTime: new Date(Date.now() - 86400000), // Last 24 hours
  limit: 100,
});

// Get security events
const securityEvents = await audit.getRecentSecurityEvents(50);
```

### Audit Entry Structure

```typescript
type AuditEntry = {
  id: string;                    // Unique ID
  timestamp: Date;               // When it occurred
  action: AuditAction;           // Event type
  severity: AuditSeverity;       // info/warning/error/critical
  principal?: {                  // Who performed the action
    id: string;
    type: "user" | "device" | "service" | "channel";
    name?: string;
  };
  resource?: {                   // What was affected
    type: string;
    id: string;
    name?: string;
  };
  channel?: string;              // Channel context
  agentId?: string;              // Agent context
  sessionId?: string;            // Session context
  outcome: "success" | "failure" | "denied";
  details?: Record<string, unknown>;
  error?: string;
  ipAddress?: string;
  requestId?: string;
};
```

## Rate Limiting

### Configuration

```json5
{
  "security": {
    "rateLimit": {
      "enabled": true,
      "rules": [
        {
          "id": "global_requests",
          "name": "Global request limit",
          "scope": "global",
          "resource": "*",
          "limit": 1000,
          "window": "minute",
          "action": "block"
        },
        {
          "id": "bash_per_agent",
          "name": "Bash commands per agent",
          "scope": "agent",
          "resource": "tool:bash",
          "limit": 30,
          "window": "minute",
          "action": "block"
        },
        {
          "id": "messages_per_channel",
          "name": "Messages per channel",
          "scope": "channel",
          "resource": "channel:*",
          "limit": 60,
          "window": "minute",
          "action": "throttle"
        }
      ]
    }
  }
}
```

### Rule Configuration

```typescript
type RateLimitRule = {
  id: string;                    // Unique ID
  name: string;                  // Display name
  description?: string;
  scope: "global" | "channel" | "agent" | "principal" | "ip";
  resource: string;              // What to limit (wildcards allowed)
  limit: number;                 // Max requests
  window: "second" | "minute" | "hour" | "day";
  windowSize?: number;           // e.g., 5 for "5 minutes"
  action: "block" | "throttle" | "warn";
  message?: string;              // Custom message
  enabled?: boolean;
  priority?: number;             // Higher = checked first
};
```

### Programmatic Usage

```typescript
import { RateLimiter, DEFAULT_RATE_LIMIT_RULES } from "./security/index.js";

// Initialize
const limiter = new RateLimiter({
  rules: DEFAULT_RATE_LIMIT_RULES,
});

// Check if allowed
const result = limiter.check({
  resource: "tool:bash",
  scope: {
    channel: "telegram",
    agentId: "main",
    principalId: "user@example.com",
  },
});

if (!result.allowed) {
  console.log(`Rate limited. Retry after ${result.retryAfter}s`);
} else {
  // Record the request
  limiter.record({
    resource: "tool:bash",
    scope: { agentId: "main" },
  });
}

// Check and record in one call
const checkResult = limiter.checkAndRecord({
  resource: "tool:bash",
  scope: { agentId: "main" },
});
```

## Security Policies

### Time-Based Policies

```json5
{
  "security": {
    "rules": [
      {
        "id": "bash-work-hours",
        "name": "Bash only during work hours",
        "action": "tool:bash",
        "timeCondition": {
          "daysOfWeek": [1, 2, 3, 4, 5],  // Mon-Fri
          "startTime": "09:00",
          "endTime": "18:00",
          "timezone": "America/New_York"
        },
        "effect": "deny"  // Deny outside these hours
      }
    ]
  }
}
```

### Context-Based Policies

```json5
{
  "security": {
    "rules": [
      {
        "id": "production-approval",
        "name": "Require approval for production",
        "action": ["tool:bash", "tool:write"],
        "contextCondition": {
          "agentId": ["prod-agent"],
          "requireApproval": true
        },
        "effect": "require_approval"
      },
      {
        "id": "block-external-ips",
        "name": "Block external IPs",
        "contextCondition": {
          "ipBlocklist": ["0.0.0.0/0"],
          "ipAllowlist": ["10.0.0.0/8", "192.168.0.0/16"]
        },
        "effect": "deny"
      }
    ]
  }
}
```

### Combined Policies

```json5
{
  "security": {
    "rules": [
      {
        "id": "sensitive-ops",
        "name": "Sensitive operations policy",
        "action": ["tool:bash", "tool:write"],
        "resource": ["/etc/*", "/var/*"],
        "principals": ["*"],  // All users
        "timeCondition": {
          "daysOfWeek": [1, 2, 3, 4, 5],
          "startTime": "09:00",
          "endTime": "17:00"
        },
        "contextCondition": {
          "requireApproval": true,
          "channel": ["slack", "discord"]
        },
        "effect": "require_approval",
        "notify": {
          "channel": "slack",
          "recipient": "#security-approvals"
        }
      }
    ]
  }
}
```

## Auto-Approval

### Configuration

```json5
{
  "security": {
    "autoApproval": {
      "enabled": true,
      "patterns": [
        {
          "type": "email_domain",
          "pattern": "@company.com",
          "roles": ["operator"]
        },
        {
          "type": "phone_prefix",
          "pattern": "+1555",
          "roles": ["user"]
        },
        {
          "type": "principal_id",
          "pattern": "trusted-*",
          "roles": ["admin"]
        }
      ]
    }
  }
}
```

## Security Manager

### Unified API

```typescript
import { SecurityManager } from "./security/index.js";

// Initialize with full configuration
const security = new SecurityManager({
  enabled: true,
  rbac: { /* ... */ },
  audit: { /* ... */ },
  rateLimit: { /* ... */ },
  rules: [ /* ... */ ],
});

// Check access (combines RBAC, rate limiting, policies)
const result = await security.checkAccess({
  principalId: "user@example.com",
  permission: "tool:bash",
  resource: "/etc/hosts",
  channel: "telegram",
  agentId: "main",
});

if (!result.allowed) {
  if (result.requiresApproval) {
    // Request approval
  } else {
    console.log("Access denied:", result.reason);
  }
}

// Get stats
const stats = security.getStats();
console.log("RBAC:", stats.rbac);
console.log("Rate limits:", stats.rateLimit);
console.log("Audit:", stats.audit);
```

## CLI Commands

```bash
# List roles
moltbot security roles list

# Show role permissions
moltbot security roles show admin

# Create custom role
moltbot security roles create developer --permissions "tool:*,session:*"

# List principals
moltbot security principals list

# Assign role
moltbot security principals assign user@example.com --role developer

# View audit log
moltbot security audit --last 50

# Query audit
moltbot security audit --action auth.failed --since "1 day ago"

# View rate limit status
moltbot security ratelimit status

# Reset rate limit
moltbot security ratelimit reset --rule bash_per_agent --key agent:main
```

## Troubleshooting

### Permission Denied

1. Check user roles:
   ```bash
   moltbot security principals show user@example.com
   ```

2. Verify role permissions:
   ```bash
   moltbot security roles show <role>
   ```

3. Check context-specific roles

### Rate Limit Hit

1. View current limits:
   ```bash
   moltbot security ratelimit status
   ```

2. Check rule configuration

3. Wait for reset or request override

### Audit Log Issues

1. Verify backend is accessible

2. Check disk space for file backend

3. Review webhook connectivity for external backend

## See Also

- [Agent Hooks](/advanced-tutorials/18-agent-hooks-system)
- [Access Control](/configuration#access-control)
- [Pairing](/cli/pairing)
