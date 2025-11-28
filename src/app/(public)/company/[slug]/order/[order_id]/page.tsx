"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  IconCheck,
  IconDownload,
  IconArrowLeft,
  IconPackage,
  IconUser,
  IconMapPin,
  IconNote,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/layouts/loading-state";
import { OrderConfirmationPDF } from "@/components/pdf/OrderConfirmationPDF";
import { pdf } from "@react-pdf/renderer";
import { toast } from "sonner";
import { Section } from "@/components/layouts/section";
import ImageWrapper from "@/components/ui/image-wrapper";
import { getProductIcon } from "@/lib/utils/product";
import { SalesOrderStatus, StockType } from "@/types/database/enums";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import { getFormattedAddress, getPartnerName } from "@/lib/utils/partner";
import { DisplayStatus, getOrderDisplayStatus } from "@/lib/utils/sales-order";
import { CatalogOrderStatusBadge } from "@/components/ui/catalog-order-status-badge";
import { useCatalogCompany, useCatalogOrder } from "@/lib/query/hooks/catalog";

export default function OrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const orderId = params.order_id as string;

  const [downloading, setDownloading] = useState(false);

  // Fetch data using TanStack Query
  const { data: company, isLoading: companyLoading } = useCatalogCompany(slug);
  const { data: order, isLoading: orderLoading } = useCatalogOrder(
    company?.id || "",
    orderId,
  );

  const loading = companyLoading || orderLoading;

  // Handle redirects
  if (!companyLoading && !company) {
    router.push("/");
    return null;
  }

  if (!orderLoading && company && !order) {
    toast.error("Order not found");
    router.push(`/company/${slug}/store/products`);
    return null;
  }

  const handleDownloadPDF = async () => {
    if (!company || !order) return;

    try {
      setDownloading(true);
      const blob = await pdf(
        <OrderConfirmationPDF company={company} order={order} />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `order-${order.sequence_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading order details..." />;
  }

  if (!company || !order) {
    return null;
  }

  // Compute display status (includes 'overdue' logic) using utility
  const displayStatus: DisplayStatus = getOrderDisplayStatus(
    order.status as SalesOrderStatus,
    order.expected_delivery_date,
  );

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center size-20 bg-green-100 rounded-full mb-4">
          <IconCheck className="size-12 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Order Confirmed!
        </h1>
        <p className="text-gray-500">
          Thank you for your order. We&apos;ll get back to you soon.
        </p>
        <div className="flex items-center justify-center gap-3 mt-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Order #{order.sequence_number}
          </h2>
          <CatalogOrderStatusBadge status={displayStatus} />
        </div>
      </div>

      {/* Order Details */}
      <div className="flex flex-col gap-3">
        {/* Order Items */}
        <Section
          title="Items"
          subtitle={`${order.sales_order_items?.length || 0} item(s)`}
          icon={IconPackage}
        >
          <div className="space-y-3">
            {order.sales_order_items?.map((item: any) => (
              <div key={item.id} className="flex gap-3">
                <ImageWrapper
                  size="xl"
                  shape="rectangle"
                  imageUrl={item.product?.product_images?.[0]}
                  alt={item.product?.name || ""}
                  placeholderIcon={getProductIcon(
                    item.product?.stock_type as StockType,
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500">
                    PROD-{item.product?.sequence_number}
                  </p>
                  <p
                    className="text-lg font-medium text-gray-700 truncate"
                    title={item.product?.name}
                  >
                    {item.product?.name}
                  </p>
                  <p className="text-sm font-medium text-gray-700 mt-0.5">
                    Qty: {item.required_quantity}{" "}
                    {getMeasuringUnitAbbreviation(
                      item.product?.measuring_unit as any,
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Customer Information */}
        <Section
          title="Contact Details"
          subtitle={order.customer ? getPartnerName(order.customer) : "-"}
          icon={IconUser}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Name</p>
              <p className="text-gray-700 font-medium">
                {order.customer?.first_name} {order.customer?.last_name}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Email</p>
              <p className="text-gray-700 font-medium">
                {order.customer?.email || "-"}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Phone</p>
              <p className="text-gray-700 font-medium">
                {order.customer?.phone_number}
              </p>
            </div>
            <div>
              <p className="text-gray-500">GSTIN</p>
              <p className="text-gray-700 font-medium">
                {order.customer?.gst_number || "-"}
              </p>
            </div>
          </div>
        </Section>

        {/* Address */}
        <Section
          title="Delivery Address"
          subtitle={`${order.customer?.city || ""}, ${order.customer?.state || ""}`}
          icon={IconMapPin}
        >
          <div className="text-sm text-gray-700">
            {order.customer &&
              getFormattedAddress(order.customer).map((addrLine, index) => (
                <p key={index}>{addrLine}</p>
              ))}
          </div>
        </Section>

        {/* Special Instructions */}
        <Section
          title="Special Instructions"
          subtitle="Additional notes"
          icon={IconNote}
        >
          <p className="text-sm text-gray-600">{order.notes || "-"}</p>
        </Section>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4">
        <Button
          variant="outline"
          onClick={() => router.push(`/company/${slug}/store/products`)}
        >
          <IconArrowLeft className="size-4" />
          Back to Store
        </Button>
        <Button onClick={handleDownloadPDF} disabled={downloading}>
          {downloading ? (
            <>
              <IconDownload className="size-4 animate-pulse" />
              Downloading...
            </>
          ) : (
            <>
              <IconDownload className="size-4" />
              Download PDF
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
