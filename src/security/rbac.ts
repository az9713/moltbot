/**
 * Role-Based Access Control (RBAC)
 *
 * Provides fine-grained permission management with role inheritance.
 */

import { EventEmitter } from "node:events";

import type {
  Permission,
  Principal,
  Role,
  RoleId,
  SecurityEvents,
} from "./types.js";

// ============================================================================
// Built-in Roles
// ============================================================================

export const BUILTIN_ROLES: Role[] = [
  {
    id: "owner",
    name: "Owner",
    description: "Full system access with all permissions",
    permissions: ["*"],
    builtin: true,
  },
  {
    id: "admin",
    name: "Administrator",
    description: "Administrative access excluding owner-only actions",
    permissions: [
      "agent:create",
      "agent:read",
      "agent:update",
      "agent:delete",
      "agent:execute",
      "session:create",
      "session:read",
      "session:update",
      "session:delete",
      "session:reset",
      "tool:bash",
      "tool:write",
      "tool:edit",
      "tool:browser",
      "tool:canvas",
      "tool:message",
      "tool:memory",
      "tool:web",
      "tool:cron",
      "channel:connect",
      "channel:disconnect",
      "channel:send",
      "channel:receive",
      "config:read",
      "config:write",
      "admin:users",
      "admin:roles",
      "admin:audit",
      "elevated:approve",
      "elevated:reject",
    ],
    builtin: true,
  },
  {
    id: "operator",
    name: "Operator",
    description: "Operational access for managing agents and sessions",
    permissions: [
      "agent:read",
      "agent:execute",
      "session:create",
      "session:read",
      "session:update",
      "session:reset",
      "tool:bash",
      "tool:write",
      "tool:edit",
      "tool:browser",
      "tool:canvas",
      "tool:message",
      "tool:memory",
      "tool:web",
      "channel:send",
      "channel:receive",
      "config:read",
      "elevated:approve",
    ],
    builtin: true,
  },
  {
    id: "user",
    name: "User",
    description: "Standard user access for interacting with agents",
    permissions: [
      "agent:read",
      "agent:execute",
      "session:create",
      "session:read",
      "session:reset",
      "tool:message",
      "tool:memory",
      "tool:web",
      "channel:send",
      "channel:receive",
    ],
    builtin: true,
  },
  {
    id: "readonly",
    name: "Read Only",
    description: "Read-only access for monitoring",
    permissions: [
      "agent:read",
      "session:read",
      "config:read",
      "channel:receive",
    ],
    builtin: true,
  },
  {
    id: "guest",
    name: "Guest",
    description: "Limited guest access",
    permissions: [
      "agent:read",
      "channel:receive",
    ],
    builtin: true,
  },
];

// ============================================================================
// RBAC Manager
// ============================================================================

export type RBACOptions = {
  /** Default role for new principals */
  defaultRole?: RoleId;
  /** Custom roles */
  customRoles?: Role[];
  /** Initial principals */
  principals?: Principal[];
};

export class RBACManager extends EventEmitter {
  private roles: Map<string, Role> = new Map();
  private principals: Map<string, Principal> = new Map();
  private defaultRole: RoleId;
  private permissionCache: Map<string, Set<Permission>> = new Map();

  constructor(options: RBACOptions = {}) {
    super();
    this.defaultRole = options.defaultRole ?? "user";

    // Register built-in roles
    for (const role of BUILTIN_ROLES) {
      this.roles.set(role.id, role);
    }

    // Register custom roles
    if (options.customRoles) {
      for (const role of options.customRoles) {
        this.roles.set(role.id, { ...role, builtin: false });
      }
    }

    // Register principals
    if (options.principals) {
      for (const principal of options.principals) {
        this.principals.set(principal.id, principal);
      }
    }
  }

  // ============================================================================
  // Role Management
  // ============================================================================

  /**
   * Get a role by ID
   */
  getRole(roleId: string): Role | undefined {
    return this.roles.get(roleId);
  }

  /**
   * Get all roles
   */
  getAllRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  /**
   * Create or update a custom role
   */
  upsertRole(role: Role): void {
    if (role.builtin) {
      throw new Error("Cannot modify built-in roles");
    }
    this.roles.set(role.id, role);
    this.invalidateCache();
  }

  /**
   * Delete a custom role
   */
  deleteRole(roleId: string): boolean {
    const role = this.roles.get(roleId);
    if (!role) return false;
    if (role.builtin) {
      throw new Error("Cannot delete built-in roles");
    }
    this.roles.delete(roleId);
    this.invalidateCache();
    return true;
  }

  /**
   * Get all permissions for a role (including inherited)
   */
  getRolePermissions(roleId: string): Permission[] {
    const cached = this.permissionCache.get(`role:${roleId}`);
    if (cached) return Array.from(cached);

    const permissions = new Set<Permission>();
    const visited = new Set<string>();

    const collectPermissions = (id: string): void => {
      if (visited.has(id)) return;
      visited.add(id);

      const role = this.roles.get(id);
      if (!role) return;

      for (const perm of role.permissions) {
        permissions.add(perm);
      }

      // Collect inherited permissions
      if (role.inherits) {
        for (const inheritedId of role.inherits) {
          collectPermissions(inheritedId);
        }
      }
    };

    collectPermissions(roleId);

    this.permissionCache.set(`role:${roleId}`, permissions);
    return Array.from(permissions);
  }

  // ============================================================================
  // Principal Management
  // ============================================================================

  /**
   * Get a principal by ID
   */
  getPrincipal(principalId: string): Principal | undefined {
    return this.principals.get(principalId);
  }

  /**
   * Get all principals
   */
  getAllPrincipals(): Principal[] {
    return Array.from(this.principals.values());
  }

  /**
   * Create or update a principal
   */
  upsertPrincipal(principal: Omit<Principal, "createdAt"> & { createdAt?: Date }): Principal {
    const existing = this.principals.get(principal.id);
    const updated: Principal = {
      ...principal,
      createdAt: existing?.createdAt ?? principal.createdAt ?? new Date(),
    };
    this.principals.set(principal.id, updated);
    this.invalidateCache();
    return updated;
  }

  /**
   * Delete a principal
   */
  deletePrincipal(principalId: string): boolean {
    const deleted = this.principals.delete(principalId);
    if (deleted) {
      this.invalidateCache();
    }
    return deleted;
  }

  /**
   * Assign roles to a principal
   */
  assignRoles(principalId: string, roles: RoleId[]): boolean {
    const principal = this.principals.get(principalId);
    if (!principal) return false;

    principal.roles = Array.from(new Set([...principal.roles, ...roles]));
    this.invalidateCache();
    return true;
  }

  /**
   * Remove roles from a principal
   */
  removeRoles(principalId: string, roles: RoleId[]): boolean {
    const principal = this.principals.get(principalId);
    if (!principal) return false;

    const roleSet = new Set(roles);
    principal.roles = principal.roles.filter((r) => !roleSet.has(r));
    this.invalidateCache();
    return true;
  }

  /**
   * Get all permissions for a principal
   */
  getPrincipalPermissions(principalId: string, context?: { channel?: string; agentId?: string }): Permission[] {
    const cacheKey = `principal:${principalId}:${context?.channel ?? ""}:${context?.agentId ?? ""}`;
    const cached = this.permissionCache.get(cacheKey);
    if (cached) return Array.from(cached);

    const principal = this.principals.get(principalId);
    if (!principal) return [];

    const permissions = new Set<Permission>();

    // Collect permissions from all roles
    for (const roleId of principal.roles) {
      for (const perm of this.getRolePermissions(roleId)) {
        permissions.add(perm);
      }
    }

    // Add context-specific roles
    if (context?.channel && principal.channelRoles?.[context.channel]) {
      for (const roleId of principal.channelRoles[context.channel]) {
        for (const perm of this.getRolePermissions(roleId)) {
          permissions.add(perm);
        }
      }
    }

    if (context?.agentId && principal.agentRoles?.[context.agentId]) {
      for (const roleId of principal.agentRoles[context.agentId]) {
        for (const perm of this.getRolePermissions(roleId)) {
          permissions.add(perm);
        }
      }
    }

    // Add custom permissions
    if (principal.permissions) {
      for (const perm of principal.permissions) {
        permissions.add(perm);
      }
    }

    // Remove denied permissions
    if (principal.deniedPermissions) {
      for (const perm of principal.deniedPermissions) {
        permissions.delete(perm);
      }
    }

    this.permissionCache.set(cacheKey, permissions);
    return Array.from(permissions);
  }

  // ============================================================================
  // Authorization
  // ============================================================================

  /**
   * Check if a principal has a specific permission
   */
  hasPermission(
    principalId: string,
    permission: Permission,
    context?: { channel?: string; agentId?: string; resource?: string },
  ): boolean {
    const permissions = this.getPrincipalPermissions(principalId, context);

    // Check for wildcard
    if (permissions.includes("*")) {
      this.emit("authz:granted", { principalId, permission, resource: context?.resource });
      return true;
    }

    // Check exact match
    if (permissions.includes(permission)) {
      this.emit("authz:granted", { principalId, permission, resource: context?.resource });
      return true;
    }

    // Check prefix match (e.g., "tool:*" matches "tool:bash")
    const [category] = permission.split(":");
    if (permissions.includes(`${category}:*` as Permission)) {
      this.emit("authz:granted", { principalId, permission, resource: context?.resource });
      return true;
    }

    this.emit("authz:denied", { principalId, permission, resource: context?.resource });
    return false;
  }

  /**
   * Check multiple permissions (all must be granted)
   */
  hasAllPermissions(
    principalId: string,
    permissions: Permission[],
    context?: { channel?: string; agentId?: string },
  ): boolean {
    return permissions.every((p) => this.hasPermission(principalId, p, context));
  }

  /**
   * Check multiple permissions (any must be granted)
   */
  hasAnyPermission(
    principalId: string,
    permissions: Permission[],
    context?: { channel?: string; agentId?: string },
  ): boolean {
    return permissions.some((p) => this.hasPermission(principalId, p, context));
  }

  /**
   * Create a principal with default role if not exists
   */
  ensurePrincipal(params: {
    id: string;
    type: Principal["type"];
    name?: string;
  }): Principal {
    let principal = this.principals.get(params.id);
    if (!principal) {
      principal = {
        id: params.id,
        type: params.type,
        name: params.name,
        roles: [this.defaultRole],
        createdAt: new Date(),
      };
      this.principals.set(params.id, principal);
    }
    return principal;
  }

  /**
   * Invalidate permission cache
   */
  private invalidateCache(): void {
    this.permissionCache.clear();
  }
}

// Type augmentation for EventEmitter
export interface RBACManager {
  on<K extends keyof SecurityEvents>(event: K, listener: (data: SecurityEvents[K]) => void): this;
  emit<K extends keyof SecurityEvents>(event: K, data: SecurityEvents[K]): boolean;
}
