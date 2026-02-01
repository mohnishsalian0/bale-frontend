"use client";

import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { IconMapPin } from "@tabler/icons-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { useSession } from "@/contexts/session-context";
import { useWarehouses } from "@/lib/query/hooks/warehouses";
import { useUserMutations } from "@/lib/query/hooks/users";
import {
  getWarehouseContactDetails,
  getWarehouseFormattedAddress,
} from "@/lib/utils/warehouse";
import { toast } from "sonner";

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
  const pathname = usePathname();
  const router = useRouter();

  // Fetch warehouses using TanStack Query
  const { data: warehouses = [], isLoading: loading } = useWarehouses();

  // User mutations hook
  const { updateWarehouse: updateUserWarehouse } = useUserMutations();

  const handleSelect = (warehouseId: string) => {
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
    updateUserWarehouse.mutate(
      {
        userId: user.id,
        warehouseId: warehouseId,
      },
      {
        onSuccess: () => {
          let redirectPath = `/warehouse/${selectedWarehouse.slug}/dashboard`;

          const warehouseRouteMatch = pathname.match(
            /^\/warehouse\/[^/]+\/(.+)$/,
          );
          if (warehouseRouteMatch) {
            const pagePath = warehouseRouteMatch[1];
            redirectPath = `/warehouse/${selectedWarehouse.slug}/${pagePath}`;
          }

          router.push(redirectPath);
          onOpenChange(false);
        },
        onError: (error) => {
          console.log("Error updating warehouse: ", error);
          toast.error("Failed to update warehouse");
        },
      },
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="items-center max-h-[90vh] overflow-y-auto scrollbar-hide"
        >
          <div className="w-full max-w-md">
            {/* Header with illustration */}
            <SheetHeader className="flex flex-row flex-1 items-end justify-between mt-10 mb-4 py-0">
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
            {loading ? (
              <p className="text-sm text-gray-500 text-center py-4">
                Loading warehouses...
              </p>
            ) : warehouses.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No warehouses found
              </p>
            ) : (
              <div className="flex flex-col mb-24 overflow-y-auto border-x border-b border-gray-300">
                {warehouses.map((warehouse) => {
                  const isSelected = warehouse.id === currentWarehouse;
                  const formattedAddress =
                    getWarehouseFormattedAddress(warehouse);
                  const contactDetails = getWarehouseContactDetails(warehouse);

                  return (
                    <div
                      key={warehouse.id}
                      onClick={() => handleSelect(warehouse.id)}
                      className={`flex gap-3 p-4 cursor-pointer select-none transition-all bg-background border-t border-border ${isSelected && "bg-primary-100 border border-primary-500"}`}
                    >
                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col">
                        <p
                          className="text-base font-medium text-gray-700 truncate"
                          title={warehouse.name}
                        >
                          {warehouse.name}
                        </p>
                        <p
                          className="text-sm text-gray-500"
                          title={formattedAddress}
                        >
                          {formattedAddress}
                        </p>
                        {contactDetails && (
                          <p
                            className="text-sm font-medium text-gray-500"
                            title={contactDetails}
                          >
                            {contactDetails}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <IconMapPin className="size-5 text-primary-700" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
