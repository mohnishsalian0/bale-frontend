"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { IconSearch, IconAlertTriangle } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Fab } from "@/components/ui/fab";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import ImageWrapper from "@/components/ui/image-wrapper";
import { AddProductSheet } from "./AddProductSheet";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/contexts/session-context";
import type { MeasuringUnit, StockType } from "@/types/database/enums";
import { Button } from "@/components/ui/button";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import { getProductIcon, getProductInfo } from "@/lib/utils/product";
import {
  PRODUCT_WITH_ATTRIBUTES_SELECT,
  transformProductWithAttributes,
  getProductAttributeLists,
  type ProductWithAttributes,
  type ProductMaterial,
  type ProductColor,
  type ProductTag,
} from "@/lib/queries/products";

interface Product extends ProductWithAttributes {
  productNumber: string;
  totalQuantity: number;
  imageUrl?: string;
}

export default function InventoryPage() {
  const router = useRouter();
  const { warehouse } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<ProductMaterial[]>([]);
  const [colors, setColors] = useState<ProductColor[]>([]);
  const [tags, setTags] = useState<ProductTag[]>([]);
  const [materialFilter, setMaterialFilter] = useState<string>("all");
  const [colorFilter, setColorFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);

  const supabase = createClient();

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch products with attributes and attribute lists in parallel
      const [productsResult, attributeLists] = await Promise.all([
        supabase
          .from("products")
          .select(
            `
						${PRODUCT_WITH_ATTRIBUTES_SELECT},
						inventory_agg:product_inventory_aggregates!product_id(
							in_stock_quantity
						)
					`,
          )
          .eq("product_inventory_aggregates.warehouse_id", warehouse.id)
          .is("deleted_at", null)
          .order("name", { ascending: true }),
        getProductAttributeLists(),
      ]);

      if (productsResult.error) throw productsResult.error;

      // Transform data to match Product interface
      const transformedProducts: Product[] = (productsResult.data || []).map(
        (p: any) => {
          const productWithAttrs = transformProductWithAttributes(p);
          return {
            ...productWithAttrs,
            productNumber: p.sequence_number?.toString() || "",
            totalQuantity: p.inventory_agg?.[0]?.in_stock_quantity || 0,
            imageUrl: p.product_images?.[0] || undefined,
          };
        },
      );

      setProducts(transformedProducts);
      setMaterials(attributeLists.materials);
      setColors(attributeLists.colors);
      setTags(attributeLists.tags);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = products.filter((product) => {
    // Search filter
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.productNumber.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // Material filter
    if (
      materialFilter !== "all" &&
      !product.materials?.some((m) => m.id === materialFilter)
    ) {
      return false;
    }

    // Color filter
    if (
      colorFilter !== "all" &&
      !product.colors?.some((c) => c.id === colorFilter)
    ) {
      return false;
    }

    // Tag filter
    if (tagFilter !== "all" && !product.tags?.some((t) => t.id === tagFilter)) {
      return false;
    }

    return true;
  });

  // Loading state
  if (loading) {
    return <LoadingState message="Loading inventory..." />;
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        title="Failed to load inventory"
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="relative flex flex-col flex-1 overflow-y-auto">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 p-4 pb-0">
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
            <p className="text-sm text-gray-500">
              <span>3000 items • </span>
              <span className="text-teal-700 font-medium">
                200 order request
              </span>
              <span> • </span>
              <span className="text-yellow-700 font-medium">
                5 low stock products
              </span>
            </p>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Input
              type="text"
              placeholder="Search for product"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
            <IconSearch className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-gray-700" />
          </div>
        </div>

        {/* Mascot */}
        <div className="relative size-25 shrink-0">
          <Image
            src="/illustrations/inventory-shelf.png"
            alt="Inventory"
            fill
            sizes="100px"
            className="object-contain"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 p-4 overflow-x-auto shrink-0 border-b border-border">
        <Button variant="outline" size="icon" className="shrink-0 size-10">
          <IconAlertTriangle className="size-5" />
        </Button>
        <Select value={materialFilter} onValueChange={setMaterialFilter}>
          <SelectTrigger className="max-w-34 h-10 shrink-0">
            <SelectValue placeholder="Material" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Materials</SelectItem>
            {materials.map((material) => (
              <SelectItem key={material.id} value={material.id}>
                {material.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={colorFilter} onValueChange={setColorFilter}>
          <SelectTrigger className="max-w-34 h-10 shrink-0">
            <SelectValue placeholder="Color" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Colors</SelectItem>
            {colors.map((color) => (
              <SelectItem key={color.id} value={color.id}>
                {color.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger className="max-w-34 h-10 shrink-0">
            <SelectValue placeholder="Tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                {tag.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Product List */}
      <div className="flex flex-col gap-3 p-4">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-600 mb-2">No products found</p>
            <p className="text-sm text-gray-500">
              {searchQuery
                ? "Try adjusting your search"
                : "Add your first product"}
            </p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const imageUrl = product.imageUrl;
            const productInfoText = getProductInfo(product);
            const unitAbbreviation = getMeasuringUnitAbbreviation(
              product.measuring_unit as MeasuringUnit | null,
            );

            return (
              <Card
                key={product.id}
                className="border border-border shadow-none bg-transparent cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() =>
                  router.push(
                    `/warehouse/${warehouse.slug}/inventory/${product.productNumber}`,
                  )
                }
              >
                <CardContent className="p-4 flex gap-4 items-center">
                  {/* Product Image */}
                  <ImageWrapper
                    size="lg"
                    shape="square"
                    imageUrl={imageUrl}
                    alt={product.name}
                    placeholderIcon={getProductIcon(
                      product.stock_type as StockType,
                    )}
                  />

                  {/* Product Info */}
                  <div className="flex-1 flex flex-col items-start">
                    <p className="text-base font-medium text-gray-900">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {productInfoText}
                    </p>
                  </div>

                  {/* Quantity */}
                  <div className="flex flex-col items-end">
                    <p className="text-base font-bold text-gray-900">
                      {product.totalQuantity} {unitAbbreviation}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Floating Action Button */}
      <Fab
        onClick={() => setShowAddProduct(true)}
        className="fixed bottom-20 right-4"
      />

      {/* Add Product Sheet */}
      {showAddProduct && (
        <AddProductSheet
          open={showAddProduct}
          onOpenChange={setShowAddProduct}
          onProductAdded={fetchProducts}
        />
      )}
    </div>
  );
}
