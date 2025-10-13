import { getCurrentUser } from './session';
import { UserRole } from '@/types/database/enums';

/**
 * Check if the current user has admin role
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === 'admin';
}

/**
 * Check if the current user has staff role
 */
export async function isStaff(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === 'staff';
}

/**
 * Get the current user's role
 */
export async function getUserRole(): Promise<UserRole | null> {
  const user = await getCurrentUser();
  return user?.role as UserRole | null;
}

/**
 * Get the current user's company ID
 */
export async function getCompanyId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.company_id || null;
}

/**
 * Get the current user's warehouse ID (staff only)
 */
export async function getWarehouseId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.warehouse_id || null;
}

/**
 * Require admin role - throws error if not admin
 */
export async function requireAdmin() {
  const admin = await isAdmin();
  if (!admin) {
    throw new Error('Admin access required');
  }
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}
