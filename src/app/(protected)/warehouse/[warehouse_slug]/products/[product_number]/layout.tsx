"use client";

import { use, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { IconAlertTriangle } from "@tabler/icons-react";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { GlowIndicator } from "@/components/ui/glow-indicator";
import { Badge } from "@/components/ui/badge";
import { TabUnderline } from "@/components/ui/tab-underline";
import { Button } from "@/components/ui/button";
import ImageWrapper from "@/components/ui/image-wrapper";
import { getProductIcon, getAvailableStockText } from "@/lib/utils/product";
import { useSession } from "@/contexts/session-context";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import { ProductFormSheet } from "../ProductFormSheet";
import type { MeasuringUnit, StockType } from "@/types/database/enums";
import {
  useProductWithInventoryAndOrdersByNumber,
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
  } = useProductWithInventoryAndOrdersByNumber(product_number, warehouse.id);

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
    if (pathname.endsWith("/overview")) return "overview";
    if (pathname.endsWith("/stock-units")) return "stock-units";
    if (pathname.endsWith("/activity")) return "activity";
    if (pathname.endsWith("/orders")) return "orders";
    return "overview";
  };

  const basePath = `/warehouse/${warehouse_slug}/products/${product_number}`;

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

  const unitAbbr = getMeasuringUnitAbbreviation(
    product.measuring_unit as MeasuringUnit,
  );

  // Status badge values
  const orderRequest = product.sales_orders?.active_pending_quantity ?? 0;
  const purchasePending = product.purchase_orders?.active_pending_quantity ?? 0;
  const qrPending = product.inventory.pending_qr_units ?? 0;
  const inTransit = product.inventory.in_transit_quantity ?? 0;
  const processing = product.inventory.processing_quantity ?? 0;

  // Low stock alert
  const lowStock =
    product.min_stock_alert &&
    (product.min_stock_threshold ?? 0) >=
      (product.inventory.available_quantity ?? 0);

  // Compact attribute string: Material1, Material2 • Color1, Color2
  const attributeParts: string[] = [];
  if (product.materials?.length) {
    attributeParts.push(product.materials.map((m) => m.name).join(", "));
  }
  if (product.colors?.length) {
    attributeParts.push(product.colors.map((c) => c.name).join(", "));
  }
  const attributeText = attributeParts.join(" • ");

  return (
    <div className="flex flex-col grow">
      <div className="relative flex flex-col flex-1">
        {/* Header */}
        <div className="p-4 pb-2">
          <div className="flex items-start gap-3">
            {/* Catalog live indicator — left of image */}
            <GlowIndicator
              size="sm"
              className="absolute top-2 left-2"
              isActive={product.show_on_catalog || false}
            />

            {/* Product Image */}
            <ImageWrapper
              size="xl"
              shape="square"
              imageUrl={product.product_images?.[0]}
              alt={product.name}
              placeholderIcon={getProductIcon(product.stock_type as StockType)}
            />

            {/* Middle: name + compact attributes + status badges */}
            <div className="flex-1 min-w-0">
              <h1
                className="text-xl font-bold text-gray-900 truncate"
                title={product.name}
              >
                {product.name}
              </h1>
              <p className="text-sm text-gray-500 truncate mt-0.5">
                PROD-{product.sequence_number}
                {attributeText ? ` • ${attributeText}` : ""}
              </p>

              {/* Status badges — only rendered when non-zero */}
              {(orderRequest > 0 ||
                purchasePending > 0 ||
                qrPending > 0 ||
                inTransit > 0 ||
                processing > 0) && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {orderRequest > 0 && (
                    <Badge color="blue">
                      Order: {orderRequest} {unitAbbr}
                    </Badge>
                  )}
                  {purchasePending > 0 && (
                    <Badge color="green">
                      Purchase: {purchasePending} {unitAbbr}
                    </Badge>
                  )}
                  {qrPending > 0 && <Badge color="gray">QR: {qrPending}</Badge>}
                  {inTransit > 0 && (
                    <Badge color="yellow">
                      In transit: {inTransit} {unitAbbr}
                    </Badge>
                  )}
                  {processing > 0 && (
                    <Badge color="orange">
                      Processing: {processing} {unitAbbr}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Right: available quantity */}
            <div className="flex flex-col items-end shrink-0">
              <p className="flex items-center gap-1">
                {lowStock && (
                  <IconAlertTriangle className="size-4 text-yellow-700" />
                )}
                <span
                  className={`text-sm font-semibold ${
                    lowStock ? "text-yellow-700" : "text-gray-700"
                  }`}
                >
                  {getAvailableStockText(product)}
                </span>
              </p>
              <p className="text-xs text-gray-500">available</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <TabUnderline
          activeTab={getActiveTab()}
          onTabChange={handleTabChange}
          tabs={[
            { value: "overview", label: "Overview" },
            { value: "stock-units", label: "Stock units" },
            { value: "activity", label: "Activity" },
            { value: "orders", label: "Orders" },
          ]}
        />

        {/* Tab Content */}
        <div className="flex-1">{children}</div>

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
