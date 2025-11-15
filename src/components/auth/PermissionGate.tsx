import { ReactNode } from 'react';
import { useSession } from '@/contexts/session-context';
import { toast } from 'sonner';

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

	/**
	 * Mode for handling lack of permission:
	 * - "hide": Don't render anything (default, backward compatible)
	 * - "disable": Render children with grayscale + click overlay
	 * - "fallback": Render fallback content
	 * Default: "hide"
	 */
	mode?: 'hide' | 'disable' | 'fallback';

	/**
	 * Action name for toast message when disabled
	 * Example: "create staff", "delete product"
	 * Used in: "You don't have permission to {actionName}"
	 */
	actionName?: string;
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
	mode = 'hide',
	actionName,
}: PermissionGateProps) {
	const { hasPermission, hasAllPermissions, hasAnyPermission } = useSession();

	// Determine if user has access
	let hasAccess: boolean;
	if (typeof permission === 'string') {
		hasAccess = hasPermission(permission);
	} else {
		hasAccess = requireAll
			? hasAllPermissions(...permission)
			: hasAnyPermission(...permission);
	}

	// If user has access, render children normally
	if (hasAccess) {
		return <>{children}</>;
	}

	// No access - handle based on mode
	if (mode === 'hide') {
		// Hide mode: render nothing (default behavior)
		return null;
	}

	if (mode === 'fallback') {
		// Fallback mode: render fallback content
		return <>{fallback}</>;
	}

	// Disable mode: render children with grayscale + click overlay
	const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
		e.preventDefault();
		e.stopPropagation();
		const message = actionName
			? `You don't have permission to ${actionName}. Contact your administrator.`
			: "You don't have permission to perform this action. Contact your administrator.";
		toast.error(message);
	};

	return (
		<div className="relative inline-block">
			<div className="grayscale opacity-60">
				{children}
			</div>
			<div
				className="absolute inset-0 cursor-not-allowed"
				onClick={handleClick}
				onMouseDown={handleClick}
				onTouchStart={handleClick}
			/>
		</div>
	);
}
