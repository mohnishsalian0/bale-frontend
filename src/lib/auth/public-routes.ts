/**
 * Public Routes Configuration
 *
 * Routes that don't require authentication.
 * Used by middleware and auth callback for access control.
 */

export const PUBLIC_ROUTES = [
	// Root
	'/',

	// Auth routes
	'/auth/login',
	'/auth/callback',

	// Invite acceptance
	'/invite',

	// Public catalog and store
	'/company',
] as const;

/**
 * Check if a given pathname matches any public route pattern
 * Supports wildcard matching (e.g., /invite/* matches /invite/abc123)
 *
 * @param pathname - The pathname to check
 * @returns true if the pathname is public, false otherwise
 */
export function isPublicRoute(pathname: string): boolean {
	// Exact match check
	if (PUBLIC_ROUTES.includes(pathname as any)) {
		return true;
	}

	// Pattern matching for dynamic routes
	const publicPatterns = [
		/^\/auth\/.+$/,              // /auth/*
		/^\/invite\/.+$/,            // /invite/*
		/^\/company\/[^\/]+\/store/, // /company/*/store/*
		/^\/company\/[^\/]+\/order/, // /company/*/order/*
	];

	return publicPatterns.some(pattern => pattern.test(pathname));
}

/**
 * Get the auth redirect URL for a protected route
 *
 * @param pathname - Current pathname
 * @returns URL to redirect to (typically /auth/login with redirectTo param)
 */
export function getAuthRedirectUrl(pathname: string): string {
	// Don't redirect if already on a public route
	if (isPublicRoute(pathname)) {
		return pathname;
	}

	// Redirect to login with the original path as redirectTo param
	return `/auth/login?redirectTo=${encodeURIComponent(pathname)}`;
}
