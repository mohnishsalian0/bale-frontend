import {
  IconEye,
  IconEdit,
  IconCopy,
  IconX,
  IconShare,
  IconDownload,
  IconPlus,
  IconBasket,
  IconBasketOff,
  IconTrash,
  IconCheck,
} from "@tabler/icons-react";
import type { SalesOrderStatus, PartnerType } from "@/types/database/enums";

export type ContextMenuItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
  hidden?: boolean;
};

// Sales Order Context Menu Items
export interface SalesOrderContextCallbacks {
  onView: () => void;
  onApprove: () => void;
  onCreateOutward: () => void;
  onDuplicate: () => void;
  onShare: () => void;
  onDownload: () => void;
  onComplete: () => void;
  onCancel: () => void;
}

export function getSalesOrderContextMenuItems(
  order: {
    status: SalesOrderStatus;
    expected_delivery_date: string | null;
  },
  callbacks: SalesOrderContextCallbacks,
): ContextMenuItem[] {
  const now = new Date();
  const isOverdue =
    order.expected_delivery_date &&
    new Date(order.expected_delivery_date) < now &&
    order.status === "in_progress";

  const items: ContextMenuItem[] = [
    {
      label: "View details",
      icon: IconEye,
      onClick: callbacks.onView,
    },
    {
      label: "Approve order",
      icon: IconCheck,
      onClick: callbacks.onApprove,
      hidden: order.status !== "approval_pending",
    },
    {
      label: "Create outward",
      icon: IconPlus,
      onClick: callbacks.onCreateOutward,
      hidden: order.status !== "in_progress",
    },
    {
      label: "Duplicate order",
      icon: IconCopy,
      onClick: callbacks.onDuplicate,
    },
    {
      label: "Share",
      icon: IconShare,
      onClick: callbacks.onShare,
    },
    {
      label: "Download PDF",
      icon: IconDownload,
      onClick: callbacks.onDownload,
    },
    {
      label: "Mark as complete",
      icon: IconCheck,
      onClick: callbacks.onComplete,
      hidden:
        order.status !== "in_progress" &&
        !isOverdue &&
        order.status !== "approval_pending",
    },
    {
      label: "Cancel order",
      icon: IconX,
      onClick: callbacks.onCancel,
      variant: "destructive",
      disabled: order.status === "cancelled",
      hidden: order.status === "completed" || order.status === "cancelled",
    },
  ];

  return items.filter((item) => !item.hidden);
}

// Partner Context Menu Items
export interface PartnerContextCallbacks {
  onView: () => void;
  onEdit: () => void;
  onCreateSalesOrder: () => void;
  onCreatePurchaseOrder: () => void;
  onDelete: () => void;
}

export function getPartnerContextMenuItems(
  partner: {
    partner_type: PartnerType;
  },
  callbacks: PartnerContextCallbacks,
): ContextMenuItem[] {
  const isCustomer = partner.partner_type === "customer";
  const isSupplier = partner.partner_type === "supplier";

  const items: ContextMenuItem[] = [
    {
      label: "View details",
      icon: IconEye,
      onClick: callbacks.onView,
    },
    {
      label: "Edit",
      icon: IconEdit,
      onClick: callbacks.onEdit,
    },
    {
      label: "Create sales order",
      icon: IconPlus,
      onClick: callbacks.onCreateSalesOrder,
      hidden: !isCustomer,
    },
    {
      label: "Create purchase order",
      icon: IconPlus,
      onClick: callbacks.onCreatePurchaseOrder,
      hidden: !isSupplier,
    },
    {
      label: "Delete",
      icon: IconTrash,
      onClick: callbacks.onDelete,
      variant: "destructive",
    },
  ];

  return items.filter((item) => !item.hidden);
}

// Product Context Menu Items
export interface ProductContextCallbacks {
  onView: () => void;
  onEdit: () => void;
  onToggleCatalog: () => void;
  onShare: () => void;
  onDelete: () => void;
}

export function getProductContextMenuItems(
  product: {
    show_on_catalog: boolean | null;
  },
  callbacks: ProductContextCallbacks,
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [
    {
      label: "View details",
      icon: IconEye,
      onClick: callbacks.onView,
    },
    {
      label: "Edit",
      icon: IconEdit,
      onClick: callbacks.onEdit,
    },
    {
      label: product.show_on_catalog ? "Hide from catalog" : "Show on catalog",
      icon: product.show_on_catalog ? IconBasketOff : IconBasket,
      onClick: callbacks.onToggleCatalog,
    },
    {
      label: "Share",
      icon: IconShare,
      onClick: callbacks.onShare,
    },
    {
      label: "Delete",
      icon: IconTrash,
      onClick: callbacks.onDelete,
      variant: "destructive",
    },
  ];

  return items;
}
