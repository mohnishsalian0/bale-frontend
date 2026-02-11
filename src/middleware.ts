import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { checkRoutePermission } from "@/lib/utils/permissions";
import { getUserPermissionsByAuthId } from "@/lib/queries/users";
import type { Database } from "@/types/database/supabase";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session if expired and get user with custom claims
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Define public routes (from (public) route group)
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/invite/") ||
    (pathname.startsWith("/company/") && pathname !== "/company") ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname === "/refund-policy" ||
    pathname === "/shipping-policy";

  // If not authenticated and trying to access protected route
  if (!user && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/login";
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If authenticated and trying to access auth pages, redirect to warehouse selection
  if (user && pathname.includes("auth/login")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/warehouse";
    return NextResponse.redirect(redirectUrl);
  }

  // If authenticated and accessing root, redirect to warehouse
  if (user && pathname === "/") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/warehouse";
    return NextResponse.redirect(redirectUrl);
  }

  // RBAC: Check route permissions for authenticated users on protected routes
  if (user && !isPublic) {
    // Extract warehouse slug from pathname if it's a warehouse route
    let warehouseSlug: string | null = null;
    const warehouseMatch = pathname.match(/^\/warehouse\/([^/]+)/);
    if (warehouseMatch) {
      warehouseSlug = warehouseMatch[1];
    }

    // Get user permissions from database
    const userPermissions = await getUserPermissionsByAuthId(supabase, user.id);

    // Check if user has permission to access this route
    const permissionCheck = checkRoutePermission(
      pathname,
      warehouseSlug,
      userPermissions,
    );

    if (!permissionCheck.allowed && permissionCheck.redirectTo) {
      // User doesn't have permission - redirect to restricted page
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = permissionCheck.redirectTo.split("?")[0];
      redirectUrl.search = permissionCheck.redirectTo.split("?")[1] || "";
      return NextResponse.redirect(redirectUrl);
    }
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
