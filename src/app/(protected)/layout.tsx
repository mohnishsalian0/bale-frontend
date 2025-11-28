"use client";

import { ReactNode, useState, useEffect } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { SessionProvider } from "@/contexts/session-context";
import { AppChromeProvider, useAppChrome } from "@/contexts/app-chrome-context";
import { getCurrentUser } from "@/lib/supabase/client";
import { createClient } from "@/lib/supabase/client";
import { LoadingState } from "@/components/layouts/loading-state";
import TopBar from "@/components/layouts/topbar";
import BottomNav from "@/components/layouts/bottom-nav";
import WarehouseSelector from "@/components/layouts/warehouse-selector";
import { AppSidebar } from "@/components/layouts/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { toast } from "sonner";
import type { Tables } from "@/types/database/supabase";
import { useWarehouseBySlug } from "@/lib/query/hooks/warehouses";
import { useUserMutations } from "@/lib/query/hooks/users";

type Warehouse = Tables<"warehouses">;
type User = Tables<"users">;

/**
 * Chrome Wrapper - Conditionally renders app chrome based on context
 */
function ChromeWrapper({
  children,
  warehouse,
}: {
  children: ReactNode;
  warehouse: Warehouse;
}) {
  const { showChrome } = useAppChrome();
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      router.push("/auth/login");
    } catch (error: any) {
      console.error("Error logging out:", error);
      toast.error(error.message || "Failed to log out");
    }
  };

  if (!showChrome) {
    // Flow mode - no chrome, just content
    return (
      <div className="container max-w-3xl h-dvh mx-auto border-x border-border">
        {children}
      </div>
    );
  }

  // App mode - full chrome
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />

      <SidebarInset>
        <TopBar
          onWarehouseClick={() => setIsSelectorOpen(!isSelectorOpen)}
          onLogoutClick={handleLogout}
          isWarehouseSelectorOpen={isSelectorOpen}
        />

        {isSelectorOpen && (
          <WarehouseSelector
            open={isSelectorOpen}
            currentWarehouse={warehouse.id}
            onOpenChange={setIsSelectorOpen}
          />
        )}

        <div className="flex flex-col flex-1 overflow-y-auto max-w-4xl">
          {children}
        </div>

        <BottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}

/**
 * Protected Layout
 * Handles authentication, warehouse validation, session management, and chrome rendering
 * Wraps all protected routes
 */
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const warehouseSlug = params.warehouse_slug as string | undefined;

  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [authLoading, setAuthLoading] = useState(true);

  const supabase = createClient();

  // Fetch warehouse using TanStack Query if slug exists
  const { data: warehouse, isLoading: warehouseLoading } = useWarehouseBySlug(
    warehouseSlug || "",
  );
  const { updateWarehouse: updateUserWarehouse } = useUserMutations(
    user?.auth_user_id || "",
  );

  const loading = authLoading || (warehouseSlug ? warehouseLoading : false);

  useEffect(() => {
    validateAccess();
  }, [warehouseSlug, pathname, warehouse]);

  const validateAccess = async () => {
    try {
      setAuthLoading(true);

      // Get current user - required for all protected routes
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push(`/auth/login?redirectTo=${encodeURIComponent(pathname)}`);
        return;
      }

      setUser(currentUser);

      // If this is a warehouse route, validate warehouse access
      if (warehouseSlug && !warehouseLoading) {
        if (!warehouse) {
          console.error("Warehouse not found");
          router.push("/warehouse");
          return;
        }

        // Sync user's selected warehouse with URL
        if (currentUser.warehouse_id !== warehouse.id) {
          await updateUserWarehouse.mutateAsync({
            userId: currentUser.id,
            warehouseId: warehouse.id,
          });
        }

        // Load user permissions from database
        const { data: roleData } = await supabase
          .from("roles")
          .select("id")
          .eq("name", currentUser.role)
          .single();

        if (roleData) {
          const { data: permData } = await supabase
            .from("role_permissions")
            .select("permissions!inner(permission_path)")
            .eq("role_id", roleData.id);

          const userPermissions = (permData || [])
            .map((rp: any) => rp.permissions?.permission_path)
            .filter(Boolean);

          setPermissions(userPermissions);
        }
      }
    } catch (error) {
      console.error("Error validating access:", error);
      router.push("/auth/login");
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (!user) {
    return null; // Redirecting to login
  }

  // For warehouse routes, wrap with SessionProvider + AppChromeProvider + ChromeWrapper
  if (warehouse) {
    return (
      <SessionProvider
        warehouse={warehouse}
        user={user}
        permissions={permissions}
      >
        <AppChromeProvider>
          <ChromeWrapper warehouse={warehouse}>{children}</ChromeWrapper>
        </AppChromeProvider>
      </SessionProvider>
    );
  }

  // For non-warehouse protected routes (e.g., /warehouse selection, /company)
  // Just render children without SessionProvider or chrome
  return <AppChromeProvider>{children}</AppChromeProvider>;
}
