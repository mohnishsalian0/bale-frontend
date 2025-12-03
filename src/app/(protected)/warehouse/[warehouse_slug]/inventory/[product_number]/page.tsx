"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconBuildingWarehouse,
  IconEye,
  IconEyeOff,
  IconShare,
  IconTrash,
} from "@tabler/icons-react";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { TabUnderline } from "@/components/ui/tab-underline";
import { GlowIndicator } from "@/components/ui/glow-indicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ImageWrapper from "@/components/ui/image-wrapper";
import { getProductIcon } from "@/lib/utils/product";
import { useSession } from "@/contexts/session-context";
import { formatCurrency } from "@/lib/utils/financial";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import { SummaryTab } from "./SummaryTab";
import { StockUnitsTab } from "./StockUnitsTab";
import { StockFlowTab } from "./StockFlowTab";
import { ProductFormSheet } from "../ProductFormSheet";
import type { MeasuringUnit, StockType } from "@/types/database/enums";
import IconStore from "@/components/icons/IconStore";
import {
  useProductWithInventoryByNumber,
  useProductMutations,
} from "@/lib/query/hooks/products";
import { useStockUnitsWithInward } from "@/lib/query/hooks/stock-units";
import { useOutwardItemsByProduct } from "@/lib/query/hooks/stock-flow";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { toast } from "sonner";

interface PageParams {
  params: Promise<{
    warehouse_slug: string;
    product_number: string;
  }>;
}

export default function ProductDetailPage({ params }: PageParams) {
  const router = useRouter();
  const { product_number } = use(params);
  const { warehouse } = useSession();
  const [activeTab, setActiveTab] = useState<
    "summary" | "stock_units" | "stock_flow"
  >("summary");
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Initialize mutations
  const {
    toggleCatalogVisibility,
    delete: deleteProduct,
    markInactive,
  } = useProductMutations();

  // Fetch product using TanStack Query
  const {
    data: product,
    isLoading: productLoading,
    isError: productError,
  } = useProductWithInventoryByNumber(product_number, warehouse.id);

  // Fetch stock units with inward details using new hook
  const { data: stockUnits = [], isLoading: stockUnitsLoading } =
    useStockUnitsWithInward(warehouse.id, { product_id: product?.id });

  // Fetch outward items using new hook
  const { data: outwardItems = [], isLoading: outwardItemsLoading } =
    useOutwardItemsByProduct(product?.id || null);

  const loading = productLoading || stockUnitsLoading || outwardItemsLoading;

  // Handler for catalog visibility toggle
  const handleToggleCatalogVisibility = () => {
    if (!product) return;

    toggleCatalogVisibility.mutate(
      {
        productId: product.id,
        currentValue: product.show_on_catalog || false,
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
          toast.error(`Failed to update catalog visibility: ${error.message}`);
        },
      },
    );
  };

  // Handler for mark inactive action
  const handleMarkInactive = () => {
    if (!product) return;

    markInactive.mutate(product.id, {
      onSuccess: () => {
        toast.success("Product marked as inactive");
        setShowDeleteDialog(false);
        router.push(`/warehouse/${warehouse.slug}/inventory`);
      },
      onError: (error: Error) => {
        toast.error(`Failed to mark product as inactive: ${error.message}`);
      },
    });
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
        toast.error(`Failed to delete product: ${error.message}`);
      },
    });
  };

  // Determine if product has stock units
  const hasStockUnits = (product?.inventory?.total_units_received ?? 0) > 0;

  if (loading) {
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

  return (
    <div className="flex flex-col flex-1 overflow-y-auto">
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
        <div className="grid grid-cols-2 gap-3 px-4 pb-6">
          {/* Total Stock Card */}
          <div className="col-span-2 sm:col-span-1 border border-gray-200 rounded-lg p-4">
            <div className="flex gap-2 mb-2">
              <IconBuildingWarehouse className="size-4 text-gray-500" />
              <span className="text-xs text-gray-500">Total stock</span>
            </div>
            <p className="text-lg font-bold text-gray-700 whitespace-pre">
              {`${product.inventory.in_stock_quantity?.toFixed(2) || 0} ${unitAbbr}  •  ₹ ${formatCurrency(product.inventory.in_stock_value || 0)}`}
            </p>
          </div>

          {/* Order Request Card */}
          <div className="col-span-2 sm:col-span-1 border border-gray-200 rounded-lg p-4">
            <div className="flex gap-2 mb-2">
              <IconStore className="size-4 fill-gray-500" />
              <span className="text-xs text-gray-500">Order request</span>
            </div>
            <p className="text-lg font-bold text-gray-700 whitespace-pre">
              {`0 ${unitAbbr}  •  ₹ 0`}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <TabUnderline
          activeTab={activeTab}
          onTabChange={(tab) =>
            setActiveTab(tab as "summary" | "stock_units" | "stock_flow")
          }
          tabs={[
            { value: "summary", label: "Summary" },
            { value: "stock_units", label: "Stock units" },
            { value: "stock_flow", label: "Stock flow" },
          ]}
        />

        {/* Tab Content */}
        <div className="flex-1 border-r border-border">
          {activeTab === "summary" && <SummaryTab product={product} />}
          {activeTab === "stock_units" && (
            <StockUnitsTab stockUnits={stockUnits} product={product} />
          )}
          {activeTab === "stock_flow" && (
            <StockFlowTab
              inwardItems={stockUnits}
              outwardItems={outwardItems}
              measuringUnit={product.measuring_unit as MeasuringUnit}
            />
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="sticky bottom-0 p-4 bg-background border-t border-border flex gap-3 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                •••
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" sideOffset={8}>
              <DropdownMenuItem onClick={handleToggleCatalogVisibility}>
                {product.show_on_catalog ? <IconEyeOff /> : <IconEye />}
                {product.show_on_catalog
                  ? "Hide from catalog"
                  : "Show on catalog"}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <IconTrash />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            onClick={() => setShowEditProduct(true)}
            className="flex-1"
          >
            Edit
          </Button>

          <Button
            variant="outline"
            onClick={() => console.log("Share")}
            className="flex-2"
          >
            <IconShare className="size-5" />
            Share
          </Button>
        </div>

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
