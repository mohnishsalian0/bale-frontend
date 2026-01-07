"use client";

import { ReactNode, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { SessionProvider } from "@/contexts/session-context";
import { AppChromeProvider, useAppChrome } from "@/contexts/app-chrome-context";
import { createClient } from "@/lib/supabase/browser";
import { LoadingState } from "@/components/layouts/loading-state";
import TopBar from "@/components/layouts/topbar";
import BottomNav from "@/components/layouts/bottom-nav";
import WarehouseSelector from "@/components/layouts/warehouse-selector";
import { AppSidebar } from "@/components/layouts/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { toast } from "sonner";
import {
  useWarehouseBySlug,
  useWarehouseById,
} from "@/lib/query/hooks/warehouses";
import {
  useCurrentUser,
  useUserMutations,
  useUserPermissions,
} from "@/lib/query/hooks/users";
import { Warehouse } from "@/types/warehouses.types";

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
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to log out");
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

        <div
          id="main-content"
          className="flex flex-col flex-1 overflow-y-auto max-w-4xl"
        >
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
  const warehouseSlug = params.warehouse_slug as string | undefined;

  // Fetch user and permissions
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: permissions, isLoading: permissionsLoading } =
    useUserPermissions(user?.role || null);

  // Fetch warehouse by slug if in URL, otherwise by user's warehouse_id
  const {
    data: warehouseBySlug,
    isLoading: warehouseBySlugLoading,
    error: warehouseBySlugError,
  } = useWarehouseBySlug(warehouseSlug || null);

  const {
    data: warehouseById,
    isLoading: warehouseByIdLoading,
    error: warehouseByIdError,
  } = useWarehouseById(
    !warehouseSlug && user?.warehouse_id ? user.warehouse_id : null,
  );

  // Determine which warehouse to use
  const warehouse = warehouseSlug ? warehouseBySlug : warehouseById;
  const warehouseLoading = warehouseSlug
    ? warehouseBySlugLoading
    : warehouseByIdLoading;
  const warehouseError = warehouseSlug
    ? warehouseBySlugError
    : warehouseByIdError;

  const { updateWarehouse: updateUserWarehouse } = useUserMutations();

  // Handle warehouse updates and redirects
  useEffect(() => {
    // Wait for user and permissions to load
    if (userLoading || permissionsLoading) {
      return;
    }

    // If no user, let auth handle redirect
    if (!user) {
      return;
    }

    // If no warehouse_id and no slug in URL, redirect to warehouse selection
    if (!user.warehouse_id && !warehouseSlug) {
      router.push("/warehouse");
      return;
    }

    // Wait for warehouse query to complete
    if (warehouseLoading) {
      return;
    }

    // If warehouse fetch failed (RLS blocked or doesn't exist), redirect to warehouse selection
    if (warehouseError || !warehouse) {
      console.error("Warehouse not found or access denied");
      router.push("/warehouse");
      return;
    }

    // If warehouse successfully fetched from URL slug, update user.warehouse_id
    if (warehouseSlug && warehouse && user.warehouse_id !== warehouse.id) {
      updateUserWarehouse.mutate(
        {
          userId: user.id,
          warehouseId: warehouse.id,
        },
        {
          onError: (error: Error) => {
            console.error("Error updating user warehouse:", error);
          },
        },
      );
    }
  }, [
    user,
    warehouse,
    warehouseSlug,
    warehouseError,
    userLoading,
    permissionsLoading,
    warehouseLoading,
    router,
    updateUserWarehouse,
  ]);

  // Show loading state
  const loading =
    userLoading ||
    permissionsLoading ||
    warehouseLoading ||
    updateUserWarehouse.isPending;

  if (loading) {
    return <LoadingState />;
  }

  // If no user or no warehouse, return null (redirecting)
  if (!user || !warehouse) {
    return null;
  }

  // Wrap all routes with SessionProvider
  return (
    <SessionProvider
      warehouse={warehouse}
      user={user}
      permissions={permissions || []}
    >
      <AppChromeProvider>
        <ChromeWrapper warehouse={warehouse}>{children}</ChromeWrapper>
      </AppChromeProvider>
    </SessionProvider>
  );
}
