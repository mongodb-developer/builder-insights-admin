/**
 * Builder Insights - Role-Based Access Control
 * 
 * Roles hierarchy:
 * - admin: Full access, user management, settings
 * - manager: View all data, manage team insights, approve content
 * - advocate: Create/edit own insights, view team data
 * - viewer: Read-only access to insights and events
 */

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  ADVOCATE: 'advocate',
  VIEWER: 'viewer',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 100,
  manager: 75,
  advocate: 50,
  viewer: 25,
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  advocate: 'Advocate',
  viewer: 'Viewer',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin: 'Full access to all features including user management and settings',
  manager: 'View all data, manage team insights, and approve content',
  advocate: 'Create and edit own insights, view team data',
  viewer: 'Read-only access to insights and events',
};

// ============================================================================
// PERMISSION CHECKS
// ============================================================================

/**
 * Check if a role has at least the required level
 */
export function hasRole(userRole: Role | string | undefined, requiredRole: Role): boolean {
  if (!userRole) return false;
  const userLevel = ROLE_HIERARCHY[userRole as Role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole];
  return userLevel >= requiredLevel;
}

/**
 * Check if user is admin
 */
export function isAdmin(role: Role | string | undefined): boolean {
  return role === ROLES.ADMIN;
}

/**
 * Check if user is viewer only (read-only access)
 */
export function isViewerOnly(role: Role | string | undefined): boolean {
  return role === ROLES.VIEWER;
}

/**
 * Check if user can make modifications (advocate or above)
 */
export function canModify(role: Role | string | undefined): boolean {
  return hasRole(role, ROLES.ADVOCATE);
}

/**
 * Check if user is at least a manager
 */
export function isManagerOrAbove(role: Role | string | undefined): boolean {
  return hasRole(role, ROLES.MANAGER);
}

/**
 * Check if user can manage other users
 */
export function canManageUsers(role: Role | string | undefined): boolean {
  return isAdmin(role);
}

/**
 * Check if user can edit insights (their own or others based on role)
 */
export function canEditInsight(
  userRole: Role | string | undefined,
  userId: string | undefined,
  insightCreatorId: string | undefined
): boolean {
  if (!userRole) return false;
  
  // Admins and managers can edit any insight
  if (isManagerOrAbove(userRole)) return true;
  
  // Advocates can edit their own insights
  if (userRole === ROLES.ADVOCATE && userId && insightCreatorId) {
    return userId === insightCreatorId;
  }
  
  return false;
}

/**
 * Check if user can delete insights
 */
export function canDeleteInsight(
  userRole: Role | string | undefined,
  userId: string | undefined,
  insightCreatorId: string | undefined
): boolean {
  // Same rules as editing for now
  return canEditInsight(userRole, userId, insightCreatorId);
}

/**
 * Check if user can create insights
 */
export function canCreateInsight(role: Role | string | undefined): boolean {
  return hasRole(role, ROLES.ADVOCATE);
}

/**
 * Check if user can view analytics
 */
export function canViewAnalytics(role: Role | string | undefined): boolean {
  return hasRole(role, ROLES.VIEWER);
}

/**
 * Check if user can manage events
 */
export function canManageEvents(role: Role | string | undefined): boolean {
  return isManagerOrAbove(role);
}

/**
 * Check if user can access admin pages
 */
export function canAccessAdmin(role: Role | string | undefined): boolean {
  return isAdmin(role);
}

// ============================================================================
// FEATURE FLAGS BY ROLE
// ============================================================================

export interface RolePermissions {
  canViewInsights: boolean;
  canCreateInsights: boolean;
  canEditOwnInsights: boolean;
  canEditAllInsights: boolean;
  canDeleteInsights: boolean;
  canViewEvents: boolean;
  canManageEvents: boolean;
  canViewAnalytics: boolean;
  canViewExecutiveDashboard: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canImportData: boolean;
}

export function getPermissions(role: Role | string | undefined): RolePermissions {
  const r = (role as Role) || ROLES.VIEWER;
  
  return {
    canViewInsights: hasRole(r, ROLES.VIEWER),
    canCreateInsights: hasRole(r, ROLES.ADVOCATE),
    canEditOwnInsights: hasRole(r, ROLES.ADVOCATE),
    canEditAllInsights: isManagerOrAbove(r),
    canDeleteInsights: hasRole(r, ROLES.ADVOCATE),
    canViewEvents: hasRole(r, ROLES.VIEWER),
    canManageEvents: isManagerOrAbove(r),
    canViewAnalytics: hasRole(r, ROLES.VIEWER),
    canViewExecutiveDashboard: isManagerOrAbove(r),
    canManageUsers: isAdmin(r),
    canManageSettings: isAdmin(r),
    canImportData: isManagerOrAbove(r),
  };
}
