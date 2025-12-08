"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { InventoryProductListStep } from "./InventoryProductListStep";
import { getProducts, getProductAttributeLists } from "@/lib/queries/products";
import {
  type ProductListView,
  type ProductAttribute,
} from "@/types/products.types";

interface SelectInventorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductSelect?: (product: ProductListView) => void;
}

export function SelectInventorySheet({
  open,
  onOpenChange,
  onProductSelect,
}: SelectInventorySheetProps) {
  const [products, setProducts] = useState<ProductListView[]>([]);
  const [materials, setMaterials] = useState<ProductAttribute[]>([]);
  const [colors, setColors] = useState<ProductAttribute[]>([]);
  const [tags, setTags] = useState<ProductAttribute[]>([]);
  const [loading, setLoading] = useState(false);

  // Load products on mount
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch products and attributes in parallel
      const [productsData, attributeLists] = await Promise.all([
        getProducts(),
        getProductAttributeLists(),
      ]);

      setProducts(productsData.data);
      setMaterials(attributeLists.materials);
      setColors(attributeLists.colors);
      setTags(attributeLists.tags);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (product: ProductListView) => {
    if (onProductSelect) {
      onProductSelect(product);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {/* Header */}
        <SheetHeader>
          <SheetTitle>Select from inventory</SheetTitle>
        </SheetHeader>

        {/* Product List - Scrollable */}
        <div className="flex flex-col h-full overflow-hidden">
          <InventoryProductListStep
            products={products}
            materials={materials}
            colors={colors}
            tags={tags}
            loading={loading}
            onProductSelect={handleProductSelect}
          />

          {/* Footer */}
          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="w-full"
            >
              Cancel
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
