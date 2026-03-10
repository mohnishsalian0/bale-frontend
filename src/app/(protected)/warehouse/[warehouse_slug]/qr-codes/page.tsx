"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { IconQrcode, IconShare, IconDownload } from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Fab } from "@/components/ui/fab";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ImageWrapper from "@/components/ui/image-wrapper";
import { formatCreatedAt } from "@/lib/utils/date";
import { toast } from "sonner";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { useSession } from "@/contexts/session-context";
import { useQRBatches } from "@/lib/query/hooks/qr-batches";
import type { QRBatchListView } from "@/types/qr-batches.types";
import { useInfiniteProducts } from "@/lib/query/hooks/products";
import { getPageSizeShortDisplay, PageSize } from "@/lib/utils/qr-batches";

export default function QRCodesPage() {
  const router = useRouter();
  const { warehouse } = useSession();
  const [selectedProduct, setSelectedProduct] = useState<string>("all");

  // Fetch data using TanStack Query (with database-level filtering)
  const {
    data: batches = [],
    isLoading: qrBatchesLoading,
    isError: error,
    refetch: refetchBatches,
  } = useQRBatches(warehouse.id, {
    product_id: selectedProduct !== "all" ? selectedProduct : undefined,
  });

  // Fetch products
  const {
    data: productsData,
    isLoading: productsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteProducts(
    {
      is_active: true,
    },
    100,
  );

  const products = productsData?.pages.flatMap((page) => page.data) || [];

  const handleShare = async (batch: QRBatchListView) => {
    try {
      toast.loading("Generating PDF...", { id: "share-pdf" });

      const { generateBatchPDF } =
        await import("@/lib/pdf/batch-pdf-generator");
      const { blob, batchName } = await generateBatchPDF(
        batch.id,
        warehouse.company_id,
      );

      // Check if Web Share API is supported
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], `${batchName}.pdf`, {
          type: "application/pdf",
        });

        // Check if we can share files
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: batchName,
            text: `QR Code Batch: ${batchName}`,
            files: [file],
          });
          toast.success("Shared successfully!", { id: "share-pdf" });
          return;
        }
      }

      // Sharing not supported
      toast.error("Sharing is not supported on this device", {
        id: "share-pdf",
      });
    } catch (error) {
      // User cancelled share or error occurred
      if (error instanceof Error && error.name === "AbortError") {
        toast.dismiss("share-pdf");
        return;
      }
      console.error("Error sharing PDF:", error);
      toast.error("Failed to share PDF", { id: "share-pdf" });
    }
  };

  const handleDownload = async (batch: QRBatchListView) => {
    try {
      toast.loading("Generating PDF...", { id: "download-pdf" });

      const { generateAndDownloadBatchPDF } =
        await import("@/lib/pdf/batch-pdf-generator");
      await generateAndDownloadBatchPDF(batch.id, warehouse.company_id);

      toast.success("PDF downloaded!", { id: "download-pdf" });
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF", { id: "download-pdf" });
    }
  };

  // Loading state
  if (qrBatchesLoading || productsLoading) {
    return <LoadingState message="Loading QR batches..." />;
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        title="Failed to load QR batches"
        message="Unable to fetch QR batches"
        onRetry={() => refetchBatches()}
      />
    );
  }

  return (
    <div className="relative flex flex-col grow">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 p-4 pb-0">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">QR codes</h1>
        </div>

        {/* Mascot */}
        <div className="relative size-25 shrink-0">
          <Image
            src="/illustrations/qr-scanner.png"
            alt="QR Scanner"
            fill
            className="object-contain"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 p-4 overflow-x-auto shrink-0 border-b border-border">
        <Select value={selectedProduct} onValueChange={setSelectedProduct}>
          <SelectTrigger className="w-[140px] h-10 shrink-0">
            <SelectValue placeholder="Product" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All products</SelectItem>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name}
              </SelectItem>
            ))}

            {/* Load more */}
            {hasNextPage && (
              <Button
                variant="ghost"
                size="sm"
                onMouseDown={(e) => e.preventDefault()} // Prevent dropdown from closing
                onClick={() => fetchNextPage()}
                // disabled={isFetchingNextPage}
                className="w-full"
              >
                {isFetchingNextPage ? "Loading..." : "Load More"}
              </Button>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Batch List */}
      <div className="flex flex-col gap-0">
        {batches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-600 mb-2">No QR batches found</p>
            <p className="text-sm text-gray-500">
              {selectedProduct !== "all"
                ? "Try selecting a different product"
                : "Create your first QR batch"}
            </p>
          </div>
        ) : (
          batches.map((batch) => (
            <Card
              key={batch.id}
              className="rounded-none border-0 border-b border-gray-200 shadow-none bg-transparent"
            >
              <CardContent className="p-4 flex gap-4 items-center">
                {/* Batch Image / QR Icon */}
                <ImageWrapper
                  size="lg"
                  shape="square"
                  imageUrl={batch.image_url || undefined}
                  alt={batch.batch_name}
                  placeholderIcon={IconQrcode}
                />

                {/* Batch Info */}
                <div className="flex-1 flex flex-col items-start">
                  <p className="text-base font-medium text-gray-700">
                    {batch.batch_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {batch.item_count}{" "}
                    {batch.item_count === 1 ? "code" : "codes"}
                    <span>{" • "}</span>
                    {formatCreatedAt(batch.created_at)}
                    <span>{" • "}</span>
                    {getPageSizeShortDisplay(batch.page_size as PageSize)}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {/* Share Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShare(batch)}
                  >
                    <IconShare />
                    <span className="hidden md:inline">Share</span>
                  </Button>

                  {/* Download Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(batch)}
                  >
                    <IconDownload />
                    <span className="hidden md:inline">Download</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Floating Action Button */}
      <Fab
        onClick={() =>
          router.push(`/warehouse/${warehouse.slug}/qr-codes/create`)
        }
        className="fixed bottom-20 right-4"
      />
    </div>
  );
}
