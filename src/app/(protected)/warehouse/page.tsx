"use client";

import { useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { IconBuildingWarehouse } from "@tabler/icons-react";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { useWarehouses } from "@/lib/query/hooks/warehouses";
import { useCurrentUser, useUserMutations } from "@/lib/query/hooks/users";
import { Warehouse } from "@/types/warehouses.types";

export default function WarehouseSelectionPage() {
  const router = useRouter();

  // Fetch warehouses using TanStack Query
  const {
    data: warehouses = [],
    isLoading: warehousesLoading,
    isError: warehousesError,
    refetch: refetchWarehouses,
  } = useWarehouses();
  const {
    data: user,
    isLoading: userLoading,
    isError: userError,
    refetch: refetchUser,
  } = useCurrentUser();
  const { updateWarehouse } = useUserMutations();
  const autoSelectAttempted = useRef(false);

  const handleWarehouseSelect = useCallback(
    async (warehouse: Warehouse) => {
      try {
        await updateWarehouse.mutateAsync({
          userId: user!.id,
          warehouseId: warehouse.id,
        });
        router.push(`/warehouse/${warehouse.slug}/dashboard`);
      } catch (error) {
        console.error("Error selecting warehouse:", error);
      }
    },
    [router, updateWarehouse, user],
  );

  useEffect(() => {
    if (user && warehouses.length === 1 && !autoSelectAttempted.current) {
      autoSelectAttempted.current = true;
      handleWarehouseSelect(warehouses[0]);
    }
  }, [user, warehouses, handleWarehouseSelect]);

  if (warehousesLoading || userLoading) {
    return <LoadingState />;
  }

  if (warehousesError || userError) {
    return (
      <ErrorState
        title="Failed to load data"
        message={
          warehousesError
            ? "Could not load warehouses. Please try again."
            : "Could not load user data. Please try again."
        }
        onRetry={() => {
          refetchWarehouses();
          refetchUser();
        }}
        actionText="Retry"
      />
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header with illustration */}
        <div className="flex flex-row items-end justify-between mb-6">
          <h1 className="text-3xl font-semibold text-gray-900">
            Select Warehouse
          </h1>
          <div className="relative size-25">
            <Image
              src="/illustrations/warehouse.png"
              alt="Warehouse"
              fill
              sizes="100px"
              className="object-contain"
            />
          </div>
        </div>

        {/* Warehouse Cards */}
        {warehouses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-2">No warehouses assigned</p>
            <p className="text-gray-400 text-sm">
              Contact your admin to assign warehouses
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {warehouses.map((warehouse) => {
              // Build address string
              const addressParts = [
                warehouse.address_line1,
                warehouse.address_line2,
                warehouse.city && warehouse.state
                  ? `${warehouse.city}, ${warehouse.state}`
                  : warehouse.city || warehouse.state,
                warehouse.pin_code,
              ].filter(Boolean);
              const addressString = addressParts.join(", ") || "No address";

              return (
                <div
                  key={warehouse.id}
                  onClick={() => handleWarehouseSelect(warehouse)}
                  className="flex gap-3 p-4 rounded-lg cursor-pointer transition-all bg-background border border-border shadow-gray-md hover:border-primary-500 hover:shadow-primary-md select-none"
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 w-14 h-14 rounded-lg flex items-center justify-center bg-gray-100">
                    <IconBuildingWarehouse className="size-6 text-gray-500" />
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
                      className="text-sm text-gray-500 truncate"
                      title={addressString}
                    >
                      {addressString}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
