"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import {
  IconBuildingWarehouse,
  IconPencil,
  IconShare,
} from "@tabler/icons-react";
import { Fab } from "../ui/fab";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { WarehouseFormSheet } from "@/app/(protected)/warehouse/WarehouseFormSheet";
import { useSession } from "@/contexts/session-context";
import { useWarehouses } from "@/lib/query/hooks/warehouses";
import { useUserMutations } from "@/lib/query/hooks/users";
import { getWarehouseFormattedAddress } from "@/lib/utils/warehouse";

interface WarehouseSelectorProps {
  open: boolean;
  currentWarehouse: string;
  onOpenChange: (open: boolean) => void;
}

export default function WarehouseSelector({
  open,
  currentWarehouse,
  onOpenChange,
}: WarehouseSelectorProps) {
  const { user } = useSession();
  const [showCreateWarehouse, setShowCreateWarehouse] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(
    null,
  );
  const pathname = usePathname();
  const router = useRouter();

  const isAdmin = user.role === "admin";

  // Fetch warehouses using TanStack Query
  const { data: warehouses = [], isLoading: loading } = useWarehouses();

  // User mutations hook
  const { updateWarehouse: updateUserWarehouse } = useUserMutations();

  const handleSelect = async (warehouseId: string) => {
    try {
      // If selecting the same warehouse, just close the sheet
      if (warehouseId === currentWarehouse) {
        onOpenChange(false);
        return;
      }

      // Find selected warehouse to get slug
      const selectedWarehouse = warehouses.find((w) => w.id === warehouseId);
      if (!selectedWarehouse) {
        console.error("Warehouse not found");
        return;
      }

      // Update user's selected warehouse using mutation
      await updateUserWarehouse.mutateAsync({
        userId: user.id,
        warehouseId: warehouseId,
      });

      // Determine redirect path - preserve current page if within warehouse context
      let redirectPath = `/warehouse/${selectedWarehouse.slug}/dashboard`;

      // Match pattern: /warehouse/[warehouse_slug]/[...rest]
      const warehouseRouteMatch = pathname.match(/^\/warehouse\/[^/]+\/(.+)$/);
      if (warehouseRouteMatch) {
        // Preserve the page path after the warehouse slug
        const pagePath = warehouseRouteMatch[1];
        redirectPath = `/warehouse/${selectedWarehouse.slug}/${pagePath}`;
      }

      // Redirect to warehouse
      router.push(redirectPath);
    } catch (error) {
      console.error("Error selecting warehouse:", error);
    }
  };

  const handleEdit = (warehouse: Warehouse, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingWarehouse(warehouse);
    setShowCreateWarehouse(true);
  };

  const handleShare = (warehouse: Warehouse, e: React.MouseEvent) => {
    e.stopPropagation();

    // Build address string
    const addressParts = [
      warehouse.name,
      warehouse.address_line1,
      warehouse.address_line2,
      warehouse.city && warehouse.state
        ? `${warehouse.city}, ${warehouse.state}`
        : warehouse.city || warehouse.state,
      warehouse.pin_code ? `- ${warehouse.pin_code}` : "",
      warehouse.country,
    ].filter(Boolean);

    const message = `📍 Warehouse Location\n\n${addressParts.join("\n")}`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");
  };

  const handleFabClick = () => {
    setEditingWarehouse(null);
    setShowCreateWarehouse(true);
  };

  const handleSheetClose = (open: boolean) => {
    setShowCreateWarehouse(open);
    if (!open) {
      setEditingWarehouse(null);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="items-center">
          <div className="w-full max-w-md px-4">
            {/* Header with illustration */}
            <SheetHeader className="flex flex-row flex-1 items-end justify-between mt-10 mb-4 p-0">
              <SheetTitle className="text-3xl text-gray-900">
                Warehouses
              </SheetTitle>
              <div className="relative size-25">
                <Image
                  src="/illustrations/warehouse.png"
                  alt="Warehouse"
                  fill
                  sizes="100px"
                  className="object-contain"
                />
              </div>
            </SheetHeader>

            {/* Warehouse Cards - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Loading warehouses...
                </p>
              ) : warehouses.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No warehouses found
                </p>
              ) : (
                <div className="flex flex-col gap-3 pb-24 overflow-y-auto">
                  {warehouses.map((warehouse) => {
                    const isSelected = warehouse.id === currentWarehouse;
                    const formattedAddress =
                      getWarehouseFormattedAddress(warehouse);

                    return (
                      <div
                        key={warehouse.id}
                        onClick={() => handleSelect(warehouse.id)}
                        className={`flex gap-3 p-4 rounded-lg cursor-pointer select-none transition-all bg-background border ${isSelected ? "border-primary-500 shadow-primary-md" : "border-border shadow-gray-md"}`}
                      >
                        {/* Icon */}
                        <div
                          className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                            isSelected ? "bg-primary-100" : "bg-gray-100"
                          }`}
                        >
                          <IconBuildingWarehouse
                            className={`size-5 ${
                              isSelected ? "text-primary-700" : "text-gray-500"
                            }`}
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                          <div
                            className="text-base font-medium text-gray-900 truncate"
                            title={warehouse.name}
                          >
                            {warehouse.name}
                          </div>
                          <div
                            className="text-sm text-gray-500 line-clamp-2"
                            title={formattedAddress}
                          >
                            {formattedAddress}
                          </div>

                          {/* Action buttons - Only show for admins */}
                          {isAdmin && (
                            <div className="flex items-center gap-2 mt-2 text-sm">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleEdit(warehouse, e)}
                              >
                                <IconPencil />
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleShare(warehouse, e)}
                              >
                                <IconShare />
                                Share
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Floating Action Button - Only show for admins */}
              {isAdmin && (
                <Fab
                  onClick={handleFabClick}
                  className="fixed bottom-4 right-4"
                />
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add/Edit Warehouse Sheet */}
      {showCreateWarehouse && (
        <WarehouseFormSheet
          key={editingWarehouse ? editingWarehouse.id : "new"}
          open={showCreateWarehouse}
          onOpenChange={handleSheetClose}
          warehouse={editingWarehouse}
        />
      )}
    </>
  );
}
