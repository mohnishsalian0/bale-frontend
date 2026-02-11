"use client";

import { useState, useMemo } from "react";
import {
  IconSearch,
  IconCheck,
  IconBuildingWarehouse,
} from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { useWarehouses } from "@/lib/query/hooks/warehouses";
import ImageWrapper from "@/components/ui/image-wrapper";

interface WarehouseSelectionStepProps {
  sourceWarehouseId: string;
  selectedWarehouseId: string | null;
  onSelectWarehouse: (warehouseId: string) => void;
}

export function WarehouseSelectionStep({
  sourceWarehouseId,
  selectedWarehouseId,
  onSelectWarehouse,
}: WarehouseSelectionStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: warehouses = [], isLoading: loading } = useWarehouses();

  // Filter and sort warehouses using useMemo
  const filteredWarehouses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    // Filter warehouses (exclude source warehouse)
    let filtered = warehouses.filter((warehouse) => {
      // Exclude source warehouse
      if (warehouse.id === sourceWarehouseId) return false;

      // Search filter (case-insensitive)
      if (query) {
        const name = warehouse.name?.toLowerCase() || "";
        const city = warehouse.city?.toLowerCase() || "";
        const state = warehouse.state?.toLowerCase() || "";

        return (
          name.includes(query) || city.includes(query) || state.includes(query)
        );
      }
      return true;
    });

    // Sort: selected warehouse first, then alphabetically
    filtered.sort((a, b) => {
      if (a.id === selectedWarehouseId) return -1;
      if (b.id === selectedWarehouseId) return 1;
      return a.name.localeCompare(b.name);
    });

    return filtered;
  }, [warehouses, searchQuery, selectedWarehouseId, sourceWarehouseId]);

  // Get warehouse location string
  const getWarehouseLocation = (warehouse: (typeof warehouses)[number]) => {
    const parts = [warehouse.city, warehouse.state].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "No location set";
  };

  return (
    <div className="relative flex flex-col flex-1">
      {/* Header Section */}
      <div className="flex flex-col gap-3 p-4 shrink-0 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Select destination warehouse
          </h3>
        </div>

        {/* Search */}
        <div className="relative">
          <Input
            placeholder="Search for warehouse"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
          <IconSearch className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-gray-700 pointer-events-none" />
        </div>
      </div>

      {/* Warehouse List - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">Loading warehouses...</p>
          </div>
        ) : filteredWarehouses.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">No warehouses available</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredWarehouses.map((warehouse) => {
              const isSelected = warehouse.id === selectedWarehouseId;
              const location = getWarehouseLocation(warehouse);

              return (
                <button
                  key={warehouse.id}
                  onClick={() => onSelectWarehouse(warehouse.id)}
                  className="flex items-center gap-3 p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors text-left"
                >
                  {/* Warehouse Icon */}
                  <ImageWrapper
                    size="md"
                    shape="square"
                    alt={warehouse.name}
                    placeholderIcon={IconBuildingWarehouse}
                  />

                  {/* Warehouse Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      title={warehouse.name}
                      className="text-base font-medium text-gray-700 truncate"
                    >
                      {warehouse.name}
                    </p>
                    <p
                      title={location}
                      className="text-sm text-gray-500 truncate"
                    >
                      {location}
                    </p>
                  </div>

                  {/* Selection Checkmark */}
                  {isSelected && (
                    <div className="flex items-center justify-center size-6 rounded-full bg-primary-500 shrink-0">
                      <IconCheck className="size-4 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
