"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { useParams, useRouter, notFound } from "next/navigation";
import {
  IconShoppingCart,
  IconArrowRight,
  IconSearch,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCart } from "@/contexts/cart-context";
import { ProductCard } from "./ProductCard";
import { ProductQuantitySheet } from "../ProductQuantitySheet";
import { LoadingState } from "@/components/layouts/loading-state";
import type { PublicProduct } from "@/lib/queries/catalog";
import {
  usePublicCompany,
  usePublicProducts,
} from "@/lib/query/hooks/catalog";

export default function StorePage() {
  const params = useParams();
  const router = useRouter();
  const { items: cartItems, addItem, removeItem } = useCart();
  const slug = params.slug as string;

  // Fetch data using TanStack Query
  const { data: company, isLoading: companyLoading } = usePublicCompany(slug);
  const { data: products = [], isLoading: productsLoading } = usePublicProducts(
    company?.id || null,
  );

  const loading = companyLoading || productsLoading;

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [materialFilter, setMaterialFilter] = useState<string>("all");
  const [colorFilter, setColorFilter] = useState<string>("all");

  // Quantity sheet state
  const [showQuantitySheet, setShowQuantitySheet] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<PublicProduct | null>(
    null,
  );

  // Extract filter options from products
  const { materials, colors } = useMemo(() => {
    const m = new Set<string>();
    const c = new Set<string>();

    for (const p of products) {
      // Extract materials from array
      if (p.materials) {
        for (const material of p.materials) {
          m.add(material.name);
        }
      }
      // Extract colors from array
      if (p.colors) {
        for (const color of p.colors) {
          c.add(color.name);
        }
      }
    }

    return {
      materials: Array.from(m).sort(),
      colors: Array.from(c).sort(),
    };
  }, [products]);

  // Filter products based on search and filters
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      // Get material and color names for searching
      const materialNames =
        product.materials?.map((m) => m.name.toLowerCase()) || [];
      const colorNames = product.colors?.map((c) => c.name.toLowerCase()) || [];

      // Search filter
      if (
        query &&
        !(
          product.name.toLowerCase().includes(query) ||
          materialNames.some((m) => m.includes(query)) ||
          colorNames.some((c) => c.includes(query)) ||
          `PROD-${product.sequence_number}`.toLowerCase().includes(query)
        )
      )
        return false;

      // Material filter
      if (
        materialFilter !== "all" &&
        !materialNames.includes(materialFilter.toLowerCase())
      )
        return false;

      // Color filter
      if (
        colorFilter !== "all" &&
        !colorNames.includes(colorFilter.toLowerCase())
      )
        return false;

      return true;
    });
  }, [products, searchQuery, materialFilter, colorFilter]);

  const handleAddToCart = (product: PublicProduct) => {
    setSelectedProduct(product);
    setShowQuantitySheet(true);
  };

  // Get quantity for a product from cart
  const getProductQuantity = (productId: string): number => {
    const item = cartItems.find((item) => item.product.id === productId);
    return item?.quantity || 0;
  };

  const handleConfirmQuantity = (quantity: number) => {
    if (selectedProduct) {
      addItem(selectedProduct, quantity);
    }
  };

  const handleCheckout = () => {
    router.push(`/company/${slug}/store/checkout`);
  };

  if (loading) {
    return <LoadingState message="Loading store..." />;
  }

  if (!company) {
    notFound();
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 py-6">
      {/* Header Section */}
      <div className="flex items-end justify-between gap-4">
        <div className="flex-1 flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-gray-900">Fabric store</h1>

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

        {/* Illustration */}
        <div className="relative size-25 shrink-0">
          <Image
            src="/illustrations/store.png"
            alt="Store"
            fill
            sizes="100px"
            className="object-contain"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 py-4 overflow-x-auto shrink-0">
        <Select value={materialFilter} onValueChange={setMaterialFilter}>
          <SelectTrigger className="w-[140px] h-10 shrink-0">
            <SelectValue placeholder="Material" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All materials</SelectItem>
            {materials.map((material) => (
              <SelectItem key={material} value={material}>
                {material}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={colorFilter} onValueChange={setColorFilter}>
          <SelectTrigger className="w-[140px] h-10 shrink-0">
            <SelectValue placeholder="Color" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All colors</SelectItem>
            {colors.map((color) => (
              <SelectItem key={color} value={color}>
                {color}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-gray-600 mb-2">No products found</p>
          <p className="text-sm text-gray-500">
            {searchQuery || materialFilter !== "all" || colorFilter !== "all"
              ? "Try adjusting your search or filters"
              : "Check back soon for new items"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              quantity={getProductQuantity(product.id)}
              onAddToCart={handleAddToCart}
              onRemove={removeItem}
            />
          ))}
        </div>
      )}

      {/* Cart Footer */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-lg">
          <div className="container max-w-7xl mx-auto px-4 py-4">
            <Button
              onClick={handleCheckout}
              className="w-full flex items-center justify-between gap-3"
              size="lg"
            >
              <div className="flex items-center gap-2 flex-1">
                <IconShoppingCart className="size-5" />
                <span>
                  {cartItems.length}{" "}
                  {cartItems.length === 1 ? "product" : "products"} in cart
                </span>
              </div>
              <span>Checkout</span>
              <IconArrowRight className="size-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Add padding at bottom to account for fixed footer */}
      <div className="h-20" />

      {/* Quantity Sheet */}
      {showQuantitySheet && (
        <ProductQuantitySheet
          open={showQuantitySheet}
          onOpenChange={setShowQuantitySheet}
          product={selectedProduct}
          initialQuantity={
            selectedProduct ? getProductQuantity(selectedProduct.id) : 0
          }
          onConfirm={handleConfirmQuantity}
        />
      )}
    </div>
  );
}
