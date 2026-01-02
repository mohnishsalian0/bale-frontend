"use client";

import { use, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { IconBuildingWarehouse } from "@tabler/icons-react";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { GlowIndicator } from "@/components/ui/glow-indicator";
import { Badge } from "@/components/ui/badge";
import { TabUnderline } from "@/components/ui/tab-underline";
import { Button } from "@/components/ui/button";
import ImageWrapper from "@/components/ui/image-wrapper";
import { getProductIcon } from "@/lib/utils/product";
import { useSession } from "@/contexts/session-context";
import { formatCurrency } from "@/lib/utils/financial";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import { ProductFormSheet } from "../ProductFormSheet";
import type { MeasuringUnit, StockType } from "@/types/database/enums";
import IconStore from "@/components/icons/IconStore";
import {
  useProductWithInventoryByNumber,
  useProductMutations,
} from "@/lib/query/hooks/products";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { toast } from "sonner";
import { ActionsFooter } from "@/components/layouts/actions-footer";
import { getProductActions } from "@/lib/utils/action-menu";

interface LayoutParams {
  params: Promise<{
    warehouse_slug: string;
    product_number: string;
  }>;
  children: React.ReactNode;
}

export default function ProductDetailLayout({
  params,
  children,
}: LayoutParams) {
  const router = useRouter();
  const pathname = usePathname();
  const { product_number, warehouse_slug } = use(params);
  const { warehouse } = useSession();
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Initialize mutations
  const {
    updateCatalogVisibility,
    delete: deleteProduct,
    updateActiveStatus,
  } = useProductMutations();

  // Fetch product using TanStack Query
  const {
    data: product,
    isLoading: productLoading,
    isError: productError,
  } = useProductWithInventoryByNumber(product_number, warehouse.id);

  // Handler for catalog visibility toggle
  const handleToggleCatalogVisibility = () => {
    if (!product) return;

    updateCatalogVisibility.mutate(
      {
        productId: product.id,
        value: !product.show_on_catalog,
      },
      {
        onSuccess: () => {
          toast.success(
            product.show_on_catalog
              ? "Product hidden from catalog"
              : "Product visible on catalog",
          );
        },
        onError: (error: Error) => {
          console.log("Failed to update catalog visibility", error.message);
          toast.error(`Failed to update catalog visibility`);
        },
      },
    );
  };

  // Handler for mark inactive action
  const handleMarkInactive = () => {
    if (!product) return;

    updateActiveStatus.mutate(
      { productId: product.id, value: false },
      {
        onSuccess: () => {
          toast.success("Product marked as inactive");
          setShowDeleteDialog(false);
          router.push(`/warehouse/${warehouse.slug}/inventory`);
        },
        onError: (error: Error) => {
          console.log("Failed to mark product as inactive", error.message);
          toast.error(`Failed to mark product as inactive`);
        },
      },
    );
  };

  // Handler for delete action
  const handleDeleteConfirm = () => {
    if (!product) return;

    deleteProduct.mutate(product.id, {
      onSuccess: () => {
        toast.success("Product deleted successfully");
        setShowDeleteDialog(false);
        router.push(`/warehouse/${warehouse.slug}/inventory`);
      },
      onError: (error: Error) => {
        console.log("Failed to delete product", error.message);
        toast.error(`Failed to delete product`);
      },
    });
  };

  // Determine if product has stock units
  const hasStockUnits = (product?.inventory?.total_units_received ?? 0) > 0;

  // Determine active tab based on pathname
  const getActiveTab = () => {
    if (pathname.endsWith("/summary")) return "summary";
    if (pathname.endsWith("/stock-units")) return "stock-units";
    if (pathname.endsWith("/stock-flow")) return "stock-flow";
    return "summary";
  };

  const handleTabChange = (tab: string) => {
    router.push(`${basePath}/${tab}`);
  };

  if (productLoading) {
    return <LoadingState message="Loading product details..." />;
  }

  if (productError || !product) {
    return (
      <ErrorState
        title="Product not found"
        message="This product does not exist or has been deleted"
        onRetry={() => router.back()}
        actionText="Go back"
      />
    );
  }

  // Get all tags
  const allTags: Array<{ text: string; isPrimary: boolean }> = [];
  if (product.materials) {
    product.materials.forEach((m) => {
      allTags.push({ text: m.name, isPrimary: true });
    });
  }
  if (product.colors) {
    product.colors.forEach((c) => {
      allTags.push({ text: c.name, isPrimary: true });
    });
  }
  if (product.tags) {
    product.tags.forEach((tag) => {
      allTags.push({ text: tag.name, isPrimary: false });
    });
  }

  // Get values for info cards
  const unitAbbr = getMeasuringUnitAbbreviation(
    product.measuring_unit as MeasuringUnit,
  );

  const basePath = `/warehouse/${warehouse_slug}/products/${product_number}`;

  return (
    <div className="flex flex-col grow">
      <div className="relative flex flex-col flex-1">
        {/* Header */}
        <div className="p-4 pb-6">
          <div className="flex items-start gap-4">
            {/* Product Image */}
            <ImageWrapper
              size="xl"
              shape="square"
              imageUrl={product.product_images?.[0]}
              alt={product.name}
              placeholderIcon={getProductIcon(product.stock_type as StockType)}
            />

            <div className="flex-1 flex flex-col gap-2">
              <div className="flex items-start gap-4">
                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <h1
                    className="text-2xl font-bold text-gray-900"
                    title={product.name}
                  >
                    {product.name}
                  </h1>
                  <p className="text-sm text-gray-500">
                    PROD-{product.sequence_number}
                  </p>
                </div>

                {/* Visible on catalog */}
                <GlowIndicator
                  size="md"
                  className="mt-2 mr-2"
                  isActive={product.show_on_catalog || false}
                />
              </div>

              {/* Tags */}
              {allTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag, index) => (
                    <Badge key={index} color={tag.isPrimary ? "blue" : "gray"}>
                      {tag.text}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stock & Sales Info Cards */}
        <div className="grid grid-cols-2 gap-3 px-4 pb-4">
          {/* Total Stock Card */}
          <div className="col-span-2 sm:col-span-1 border border-gray-200 rounded-lg p-4">
            <div className="flex gap-2 mb-2">
              <IconBuildingWarehouse className="size-4 text-gray-500" />
              <span className="text-xs text-gray-500">
                Total stock in inventory
              </span>
            </div>
            <p className="font-semibold text-gray-700 whitespace-pre">
              {`${product.inventory.in_stock_quantity?.toFixed(2) || 0} ${unitAbbr}  •  ₹ ${formatCurrency(product.inventory.in_stock_value || 0)}`}
            </p>
          </div>

          {/* Order Request Card */}
          <div className="col-span-2 sm:col-span-1 border border-gray-200 rounded-lg p-4">
            <div className="flex gap-2 mb-2">
              <IconStore className="size-4 fill-gray-500" />
              <span className="text-xs text-gray-500">
                Order request quantity
              </span>
            </div>
            <p className="font-semibold text-gray-700 whitespace-pre">
              {`0 ${unitAbbr}  •  ₹ 0`}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <TabUnderline
          activeTab={getActiveTab()}
          onTabChange={handleTabChange}
          tabs={[
            { value: "summary", label: "Summary" },
            { value: "stock-units", label: "Stock units" },
            { value: "stock-flow", label: "Stock flow" },
          ]}
        />

        {/* Tab Content */}
        <div className="flex-1 border-r border-border">{children}</div>

        {/* Bottom Action Bar */}
        <ActionsFooter
          items={getProductActions(
            { show_on_catalog: product.show_on_catalog },
            {
              onToggleCatalog: handleToggleCatalogVisibility,
              onDelete: () => setShowDeleteDialog(true),
              onEdit: () => setShowEditProduct(true),
              onShare: () => console.log("Share"),
            },
          )}
          dropdownSide="top"
        />

        {/* Edit Product Sheet */}
        {showEditProduct && product && (
          <ProductFormSheet
            key={product.id}
            open={showEditProduct}
            onOpenChange={setShowEditProduct}
            productToEdit={product}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <ResponsiveDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title={hasStockUnits ? "Cannot delete product" : "Delete product"}
          description={
            hasStockUnits
              ? "This product has inventory history and cannot be deleted. You can mark it as inactive to hide it from active lists."
              : "Are you sure you want to delete this product? This action cannot be undone."
          }
          footer={
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={
                  hasStockUnits ? handleMarkInactive : handleDeleteConfirm
                }
                className="flex-1"
              >
                {hasStockUnits ? "Mark as inactive" : "Confirm delete"}
              </Button>
            </div>
          }
        >
          {hasStockUnits && (
            <p className="text-sm text-gray-500">
              Total units received:{" "}
              <b>{product?.inventory?.total_units_received || 0}</b>
            </p>
          )}
        </ResponsiveDialog>
      </div>
    </div>
  );
}
