import { ReactNode } from 'react';
import { useSession } from '@/contexts/warehouse-context';

interface PermissionGateProps {
	/**
	 * Single permission or array of permissions to check
	 * Examples: 'inventory.products.read', ['sales.orders.create', 'sales.orders.update']
	 */
	permission: string | string[];

	/**
	 * Children to render if permission check passes
	 */
	children: ReactNode;

	/**
	 * If true, requires ALL permissions in array (AND logic)
	 * If false, requires ANY permission in array (OR logic)
	 * Default: false
	 */
	requireAll?: boolean;

	/**
	 * Optional fallback content to render if permission check fails
	 * Default: null (renders nothing)
	 */
	fallback?: ReactNode;
}

/**
 * Conditional rendering component based on user permissions
 *
 * Usage:
 * ```tsx
 * // Single permission
 * <PermissionGate permission="inventory.products.create">
 *   <Button>Create Product</Button>
 * </PermissionGate>
 *
 * // Multiple permissions (OR logic - any one required)
 * <PermissionGate permission={['sales.orders.read', 'sales.orders.create']}>
 *   <OrdersPage />
 * </PermissionGate>
 *
 * // Multiple permissions (AND logic - all required)
 * <PermissionGate
 *   permission={['inventory.products.read', 'inventory.products.update']}
 *   requireAll
 * >
 *   <EditProductForm />
 * </PermissionGate>
 *
 * // With fallback
 * <PermissionGate
 *   permission="admin.settings.view"
 *   fallback={<div>Access Denied</div>}
 * >
 *   <SettingsPage />
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
	permission,
	children,
	requireAll = false,
	fallback = null,
}: PermissionGateProps) {
	const { hasPermission, hasAllPermissions, hasAnyPermission } = useSession();

	// Handle single permission
	if (typeof permission === 'string') {
		return hasPermission(permission) ? <>{children}</> : <>{fallback}</>;
	}

	// Handle multiple permissions
	const hasAccess = requireAll
		? hasAllPermissions(...permission)
		: hasAnyPermission(...permission);

	return hasAccess ? <>{children}</> : <>{fallback}</>;
}
