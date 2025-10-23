import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
	let supabaseResponse = NextResponse.next({
		request,
	});

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value }) =>
						request.cookies.set(name, value)
					);
					supabaseResponse = NextResponse.next({
						request,
					});
					cookiesToSet.forEach(({ name, value, options }) =>
						supabaseResponse.cookies.set(name, value, options)
					);
				},
			},
		}
	);

	// Refresh session if expired
	const {
		data: { user },
	} = await supabase.auth.getUser();

	const { pathname } = request.nextUrl;

	// Public routes that don't require authentication
	const publicRoutes = ['/invite', '/auth'];
	const isPublicRoute = publicRoutes.some((route) =>
		pathname.startsWith(route)
	);

	// If not authenticated and trying to access protected route
	if (!user && !isPublicRoute) {
		const redirectUrl = request.nextUrl.clone();
		redirectUrl.pathname = '/auth/login';
		redirectUrl.searchParams.set('redirectTo', pathname);
		return NextResponse.redirect(redirectUrl);
	}

	// If authenticated and trying to access auth pages, redirect to dashboard
	if (user && pathname.startsWith('/auth/login')) {
		const redirectUrl = request.nextUrl.clone();
		redirectUrl.pathname = '/dashboard';
		return NextResponse.redirect(redirectUrl);
	}

	return supabaseResponse;
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public assets (images, etc.)
		 */
		'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
	],
};
