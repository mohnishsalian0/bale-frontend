"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { useSession } from "@/contexts/session-context";
import {
  QuickActionButton,
  type QuickAction,
} from "@/components/ui/quick-action-button";
import {
  IconShirt,
  IconQrcode,
  IconScan,
  IconTruckLoading,
} from "@tabler/icons-react";
import IconGoodsInward from "@/components/icons/IconGoodsInward";
import IconGoodsOutward from "@/components/icons/IconGoodsOutward";
import { Fab } from "@/components/ui/fab";
import { DashboardScannerModal } from "./DashboardScannerModal";
import { useDashboardData } from "@/lib/query/hooks/dashboard";
import { PartnersSection } from "./PartnersSection";
import { ActiveSalesOrdersSection } from "./ActiveSalesOrdersSection";
import { LowStockProductsSection } from "./LowStockProductsSection";
import { PendingQRCodesSection } from "./PendingQRCodesSection";
import { ProductFormSheet } from "../inventory/ProductFormSheet";

export default function DashboardPage() {
  const router = useRouter();
  const { user, warehouse } = useSession();

  // Fetch dashboard data using TanStack Query
  const {
    data,
    isLoading: loading,
    isError: error,
    refetch,
  } = useDashboardData(warehouse.id);

  const salesOrders = data.salesOrders;
  const lowStockProducts = data.lowStockProducts;
  const pendingQRProducts = data.pendingQRProducts;
  const recentCustomers = data.recentCustomers;
  const recentSuppliers = data.recentSuppliers;

  // Sheet states
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);

  // Quick actions array
  const quickActions: QuickAction[] = [
    {
      icon: IconShirt,
      label: "Create product",
      href: `/warehouse/${warehouse.slug}/inventory?action=add`,
    },
    {
      icon: IconGoodsInward,
      label: "Goods inward",
      href: `/warehouse/${warehouse.slug}/goods-inward/create`,
    },
    {
      icon: IconTruckLoading,
      label: "Purchase order",
      href: `/warehouse/${warehouse.slug}/purchase-orders`,
    },
    {
      icon: IconQrcode,
      label: "QR code batch",
      href: `/warehouse/${warehouse.slug}/qr-codes/create`,
    },
    {
      icon: IconGoodsOutward,
      label: "Goods outward",
      href: `/warehouse/${warehouse.slug}/goods-outward/create`,
    },
  ];

  // Loading state
  if (loading) {
    return <LoadingState message="Loading dashboard..." />;
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        title="Failed to load dashboard"
        message="Unable to fetch dashboard data"
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="relative flex flex-col grow">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 px-4 pt-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {user.first_name}!
          </h1>
        </div>

        {/* Mascot */}
        <div className="relative size-25 shrink-0">
          <Image
            src="/mascot/dashboard-wave.png"
            alt="Dashboard mascot waving"
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
              if (action.label === "Create product") {
                setShowCreateProduct(true);
              } else {
                router.push(action.href);
              }
            }}
          />
        ))}
      </div>

      {/* Customers Section */}
      <div className="mt-6">
        <PartnersSection
          title="Customers"
          newButtonLabel="New customer"
          partnerType="customer"
          partners={recentCustomers}
        />
      </div>

      {/* Suppliers Section */}
      <div className="mt-6">
        <PartnersSection
          title="Suppliers"
          newButtonLabel="New supplier"
          partnerType="supplier"
          partners={recentSuppliers}
        />
      </div>

      {/* Sales Orders Section */}
      <ActiveSalesOrdersSection
        orders={salesOrders}
        warehouseSlug={warehouse.slug}
        onNavigate={(path) => router.push(path)}
      />

      {/* Low Stock Products Section */}
      <LowStockProductsSection
        products={lowStockProducts}
        warehouseSlug={warehouse.slug}
        onNavigate={(path) => router.push(path)}
      />

      {/* Pending QR Codes Section */}
      <PendingQRCodesSection
        products={pendingQRProducts}
        warehouseSlug={warehouse.slug}
        onNavigate={(path) => router.push(path)}
      />

      {/* Add Product Sheet */}
      {showCreateProduct && (
        <ProductFormSheet
          key="new"
          open={showCreateProduct}
          onOpenChange={setShowCreateProduct}
        />
      )}

      {/* Scanner Modal */}
      {showScannerModal && (
        <DashboardScannerModal
          open={showScannerModal}
          onOpenChange={setShowScannerModal}
        />
      )}

      {/* FAB */}
      <Fab
        icon={IconScan}
        onClick={() => setShowScannerModal(true)}
        className="fixed bottom-20 right-4"
      />
    </div>
  );
}
