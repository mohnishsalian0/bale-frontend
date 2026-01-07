"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useSession } from "@/contexts/session-context";
import {
  QuickActionButton,
  type QuickAction,
} from "@/components/ui/quick-action-button";
import {
  IconReceiptRupee,
  IconCurrencyRupee,
  IconReceiptRefund,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { ActiveInvoicesSection } from "./ActiveInvoicesSection";
import { PartnerOutstandingSection } from "./PartnerOutstandingSection";
import { useIsMobile } from "@/hooks/use-mobile";
import { PaymentTypeDialog } from "../payments/PaymentTypeDialog";
import type { VoucherType } from "@/types/database/enums";
import { useInvoiceAggregates } from "@/lib/query/hooks/aggregates";
import { formatCurrency } from "@/lib/utils/currency";

export default function AccountingPage() {
  const router = useRouter();
  const { warehouse } = useSession();
  const isMobile = useIsMobile();

  // Payment modal state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentVoucherType, setPaymentVoucherType] =
    useState<VoucherType | null>(null);

  // Fetch invoice aggregates for sales and purchase
  const { data: salesInvoiceStats } = useInvoiceAggregates({
    filters: {
      warehouse_id: warehouse.id,
      invoice_type: "sales",
    },
  });

  const { data: purchaseInvoiceStats } = useInvoiceAggregates({
    filters: {
      warehouse_id: warehouse.id,
      invoice_type: "purchase",
    },
  });

  // Calculate totals
  const totalOpenInvoices =
    (salesInvoiceStats?.count || 0) + (purchaseInvoiceStats?.count || 0);
  const totalOutstanding =
    (salesInvoiceStats?.total_outstanding || 0) +
    (purchaseInvoiceStats?.total_outstanding || 0);

  // Quick actions array
  const quickActions: QuickAction[] = [
    {
      icon: IconReceiptRupee,
      label: "Sales invoice",
      href: `/warehouse/${warehouse.slug}/invoices/create/sales`,
    },
    {
      icon: IconReceiptRupee,
      label: "Purchase invoice",
      href: `/warehouse/${warehouse.slug}/invoices/create/purchase`,
    },
    {
      icon: IconCurrencyRupee,
      label: "Record receipt",
      onClick: () => {
        setPaymentVoucherType("receipt");
        setShowPaymentDialog(true);
      },
    },
    {
      icon: IconCurrencyRupee,
      label: "Record payment",
      onClick: () => {
        setPaymentVoucherType("payment");
        setShowPaymentDialog(true);
      },
    },
    {
      icon: IconReceiptRefund,
      label: "Credit note",
      href: `/warehouse/${warehouse.slug}/adjustment-notes/create/credit`,
    },
    {
      icon: IconReceiptRefund,
      label: "Debit note",
      href: `/warehouse/${warehouse.slug}/adjustment-notes/create/debit`,
    },
  ];

  return (
    <div className="relative flex flex-col grow">
      {/* Header */}
      <div
        className={`flex items-end justify-between gap-4 p-4 pb-0 ${isMobile && "flex-col-reverse items-start"}`}
      >
        <div className={`${isMobile ? "w-full" : "flex-1"}`}>
          <div className="mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              Bills & Payments
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              <span className="text-teal-700 font-medium">
                {totalOpenInvoices}
              </span>
              <span> open invoices</span>
              <span> • </span>
              <span className="text-teal-700 font-medium">
                {formatCurrency(totalOutstanding)}
              </span>
              <span className="text-gray-500"> outstanding</span>
            </p>
          </div>
        </div>

        {/* Mascot */}
        <div className="relative size-25 shrink-0">
          <Image
            src="/illustrations/cash-register.png"
            alt="Bills & Payments"
            fill
            sizes="100px"
            className="object-contain"
            priority
            quality={85}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 md:grid-cols-6 px-2 mt-6">
        {quickActions.map((action) => (
          <QuickActionButton
            key={action.label}
            action={action}
            onClick={() => {
              if (action.onClick) {
                action.onClick();
              } else if (action.href) {
                router.push(action.href);
              }
            }}
          />
        ))}
      </div>

      {/* Secondary Actions */}
      <div className="flex flex-wrap gap-2 gap-y-3 px-4 mt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/warehouse/${warehouse.slug}/invoices`)}
        >
          View all invoices
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/warehouse/${warehouse.slug}/payments`)}
        >
          View all payments
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            router.push(`/warehouse/${warehouse.slug}/adjustment-notes`)
          }
        >
          View all adjustments
        </Button>
      </div>

      {/* Active Sales Invoices Section */}
      <ActiveInvoicesSection
        title={`Active sales invoices ${salesInvoiceStats?.count ? `(${salesInvoiceStats.count})` : ""}`}
        invoiceType="sales"
        warehouseSlug={warehouse.slug}
      />

      {/* Active Purchase Invoices Section */}
      <ActiveInvoicesSection
        title={`Active purchase invoices ${purchaseInvoiceStats?.count ? `(${purchaseInvoiceStats.count})` : ""}`}
        invoiceType="purchase"
        warehouseSlug={warehouse.slug}
      />

      {/* Highest Receipt Due (Customers who owe us) */}
      <PartnerOutstandingSection
        title="Highest receipt due"
        subtitle="Customers who owe us"
        partnerType="customer"
        warehouseSlug={warehouse.slug}
      />

      {/* Highest Payment Due (Suppliers we owe) */}
      <PartnerOutstandingSection
        title="Highest payment due"
        subtitle="Suppliers we owe"
        partnerType="supplier"
        warehouseSlug={warehouse.slug}
      />

      {/* Payment Type Dialog */}
      {paymentVoucherType && (
        <PaymentTypeDialog
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          voucherType={paymentVoucherType}
        />
      )}
    </div>
  );
}
