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
  IconReceiptRupee,
  IconCurrencyRupee,
  IconFileText,
} from "@tabler/icons-react";
import type { SalesOrderStatus, PartnerType } from "@/types/database/enums";
import type { Invoice } from "@/types/invoices.types";
import type { Payment } from "@/types/payments.types";
import type { AdjustmentNote } from "@/types/adjustment-notes.types";

export type ContextMenuItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: "default" | "destructive" | "outline";
  disabled?: boolean;
  hidden?: boolean;
  size?: "sm" | "icon-sm";
  content?: React.ReactNode;
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
    delivery_due_date: string | null;
    has_outward: boolean;
  },
  callbacks: SalesOrderContextCallbacks,
): ContextMenuItem[] {
  const now = new Date();
  const isOverdue =
    order.delivery_due_date &&
    new Date(order.delivery_due_date) < now &&
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
      hidden:
        order.status === "completed" ||
        order.status === "cancelled" ||
        order.has_outward,
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

// Sales Order Detail Footer Items
export interface SalesOrderDetailFooterCallbacks {
  onApprove: () => void;
  onCreateOutward: () => void;
  onCreateInvoice: () => void;
  onComplete: () => void;
  onShare: () => void;
  onDownload: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

export function getSalesOrderDetailFooterItems(
  displayStatus: SalesOrderStatus | "overdue",
  has_outward: boolean,
  callbacks: SalesOrderDetailFooterCallbacks,
  options?: {
    downloading?: boolean;
  },
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [];

  // Primary CTA (first button - flex-2)
  items.push({
    label: "Approve order",
    icon: IconCheck,
    onClick: callbacks.onApprove,
    variant: "default",
    hidden: !(displayStatus === "approval_pending"),
  });

  items.push({
    label: "Create outward",
    icon: IconPlus,
    onClick: callbacks.onCreateOutward,
    variant: "default",
    hidden: !(displayStatus === "in_progress" || displayStatus === "overdue"),
  });

  // Secondary button (flex-1)
  items.push({
    label: "Create invoice",
    icon: IconReceiptRupee,
    onClick: callbacks.onCreateInvoice,
    variant: "outline",
    hidden:
      displayStatus === "approval_pending" || displayStatus === "cancelled",
  });

  // Dropdown menu items
  items.push({
    label: "Mark as complete",
    icon: IconCheck,
    onClick: callbacks.onComplete,
    hidden: !(displayStatus === "in_progress" || displayStatus === "overdue"),
  });

  items.push({
    label: "Share",
    icon: IconShare,
    onClick: callbacks.onShare,
    variant: "outline",
  });

  items.push({
    label: "Download PDF",
    icon: IconDownload,
    onClick: callbacks.onDownload,
    disabled: options?.downloading,
    content: options?.downloading ? (
      <>
        <IconDownload className="animate-pulse" />
        Downloading...
      </>
    ) : undefined,
  });

  // Delete order
  items.push({
    label: "Delete order",
    icon: IconTrash,
    onClick: callbacks.onDelete,
    variant: "destructive",
    hidden: displayStatus !== "approval_pending",
  });

  // Cancel order
  items.push({
    label: "Cancel order",
    icon: IconX,
    onClick: callbacks.onCancel,
    variant: "destructive",
    hidden:
      displayStatus === "approval_pending" ||
      displayStatus === "completed" ||
      displayStatus === "cancelled" ||
      has_outward,
  });

  return items;
}

// Purchase Order Detail Footer Items
export interface PurchaseOrderDetailFooterCallbacks {
  onApprove: () => void;
  onCreateInward: () => void;
  onCreateInvoice: () => void;
  onComplete: () => void;
  onShare: () => void;
  onDownload: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

export function getPurchaseOrderDetailFooterItems(
  displayStatus: SalesOrderStatus | "overdue",
  has_inward: boolean,
  callbacks: PurchaseOrderDetailFooterCallbacks,
  options?: {
    downloading?: boolean;
  },
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [];

  // Primary CTA (first button - flex-2)
  items.push({
    label: "Approve order",
    icon: IconCheck,
    onClick: callbacks.onApprove,
    variant: "default",
    hidden: !(displayStatus === "approval_pending"),
  });

  items.push({
    label: "Create inward",
    icon: IconPlus,
    onClick: callbacks.onCreateInward,
    variant: "default",
    hidden: !(displayStatus === "in_progress" || displayStatus === "overdue"),
  });

  // Create invoice
  items.push({
    label: "Create invoice",
    icon: IconReceiptRupee,
    onClick: callbacks.onCreateInvoice,
    variant: "outline",
    hidden:
      displayStatus === "approval_pending" || displayStatus === "cancelled",
  });

  // Dropdown menu items
  items.push({
    label: "Mark as complete",
    icon: IconCheck,
    onClick: callbacks.onComplete,
    hidden: !(displayStatus === "in_progress" || displayStatus === "overdue"),
  });

  items.push({
    label: "Share",
    icon: IconShare,
    onClick: callbacks.onShare,
    variant: "outline",
  });

  items.push({
    label: "Download PDF",
    icon: IconDownload,
    onClick: callbacks.onDownload,
    disabled: options?.downloading,
    content: options?.downloading ? (
      <>
        <IconDownload className="animate-pulse" />
        Downloading...
      </>
    ) : undefined,
  });

  // Delete order
  items.push({
    label: "Delete order",
    icon: IconTrash,
    onClick: callbacks.onDelete,
    variant: "destructive",
    hidden: displayStatus !== "approval_pending",
  });

  items.push({
    label: "Cancel order",
    icon: IconX,
    onClick: callbacks.onCancel,
    variant: "destructive",
    hidden:
      displayStatus === "approval_pending" ||
      displayStatus === "completed" ||
      displayStatus === "cancelled",
  });

  return items;
}

// Product Detail Footer Items
export interface ProductDetailFooterCallbacks {
  onToggleCatalog: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onShare: () => void;
}

export function getProductDetailFooterItems(
  product: {
    show_on_catalog: boolean | null;
  },
  callbacks: ProductDetailFooterCallbacks,
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [
    // Primary button (flex-2)
    {
      label: "Share",
      icon: IconShare,
      onClick: callbacks.onShare,
      variant: "outline",
    },
    // Secondary button (flex-1)
    {
      label: "Edit",
      icon: IconEdit,
      onClick: callbacks.onEdit,
      variant: "outline",
    },
    // Dropdown items
    {
      label: product.show_on_catalog ? "Hide from catalog" : "Show on catalog",
      icon: product.show_on_catalog ? IconBasketOff : IconBasket,
      onClick: callbacks.onToggleCatalog,
    },
    {
      label: "Delete",
      icon: IconTrash,
      onClick: callbacks.onDelete,
      variant: "destructive",
      size: "icon-sm",
    },
  ];

  return items;
}

// Partner Detail Footer Items
export interface PartnerDetailFooterCallbacks {
  onDelete: () => void;
  onEdit: () => void;
  onCreateSalesOrder?: () => void;
  onCreatePurchaseOrder?: () => void;
}

export function getPartnerDetailFooterItems(
  partner: {
    partner_type: PartnerType;
  },
  callbacks: PartnerDetailFooterCallbacks,
): ContextMenuItem[] {
  const isCustomer = partner.partner_type === "customer";
  const isSupplier = partner.partner_type === "supplier";

  const items: ContextMenuItem[] = [];

  // Primary button (flex-2) - conditional based on partner type
  if (isCustomer && callbacks.onCreateSalesOrder) {
    items.push({
      label: "Sales order",
      icon: IconPlus,
      onClick: callbacks.onCreateSalesOrder,
      variant: "outline",
    });
  } else if (isSupplier && callbacks.onCreatePurchaseOrder) {
    items.push({
      label: "Purchase order",
      icon: IconPlus,
      onClick: callbacks.onCreatePurchaseOrder,
      variant: "outline",
    });
  }

  // Secondary button (flex-1)
  items.push({
    label: "Edit",
    icon: IconEdit,
    onClick: callbacks.onEdit,
    variant: "outline",
  });

  // Dropdown items
  items.push({
    label: "Delete",
    icon: IconTrash,
    onClick: callbacks.onDelete,
    variant: "destructive",
    size: "icon-sm",
  });

  return items;
}

// Invoice Detail Footer Items
export interface InvoiceDetailFooterCallbacks {
  onMakePayment: () => void;
  onDownload: () => void;
  onCreateAdjustment: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

export function getInvoiceDetailFooterItems(
  invoice: Pick<
    Invoice,
    | "status"
    | "invoice_type"
    | "is_cancelled"
    | "has_payment"
    | "has_adjustment"
    | "exported_to_tally_at"
  >,
  callbacks: InvoiceDetailFooterCallbacks,
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [];

  // Primary CTA (first button - flex-2): Make payment
  items.push({
    label: "Make payment",
    icon: IconCurrencyRupee,
    onClick: callbacks.onMakePayment,
    variant: "default",
    hidden: invoice.status === "settled" || invoice.is_cancelled,
  });

  // Secondary button (flex-1): Download
  items.push({
    label: "Download",
    icon: IconDownload,
    onClick: callbacks.onDownload,
    variant: "outline",
  });

  // Dropdown menu items
  // Create adjustment note: hidden if cancelled
  items.push({
    label:
      invoice.invoice_type === "sales"
        ? "Create credit note"
        : "Create debit note",
    icon: IconFileText,
    onClick: callbacks.onCreateAdjustment,
    hidden: invoice.is_cancelled,
  });

  // Edit: hidden if cancelled or exported to Tally
  items.push({
    label: "Edit",
    icon: IconEdit,
    onClick: callbacks.onEdit,
    hidden:
      invoice.is_cancelled ||
      invoice.has_adjustment ||
      invoice.has_payment ||
      invoice.exported_to_tally_at !== null,
  });

  // Delete: shown only if not cancelled, no payments, no adjustments, not exported
  items.push({
    label: "Delete",
    icon: IconTrash,
    onClick: callbacks.onDelete,
    variant: "destructive",
    hidden:
      invoice.is_cancelled ||
      invoice.has_payment ||
      invoice.has_adjustment ||
      invoice.exported_to_tally_at !== null,
  });

  // Cancel: shown only if not cancelled, no payments, no adjustments
  items.push({
    label: "Cancel",
    icon: IconX,
    onClick: callbacks.onCancel,
    variant: "destructive",
    hidden:
      invoice.is_cancelled || invoice.has_payment || invoice.has_adjustment,
  });

  return items;
}

// Payment Detail Footer Items
export interface PaymentDetailFooterCallbacks {
  onEdit: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

export function getPaymentDetailFooterItems(
  payment: Pick<Payment, "is_cancelled" | "exported_to_tally_at">,
  callbacks: PaymentDetailFooterCallbacks,
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [];

  // Primary button (flex-2): Edit
  // Hidden if cancelled or exported to Tally
  items.push({
    label: "Edit",
    icon: IconEdit,
    onClick: callbacks.onEdit,
    variant: "outline",
    hidden: payment.is_cancelled || payment.exported_to_tally_at !== null,
  });

  // Secondary button (flex-1): Delete
  items.push({
    label: "Delete",
    icon: IconTrash,
    onClick: callbacks.onDelete,
    variant: "destructive",
    hidden: payment.is_cancelled || payment.exported_to_tally_at !== null,
  });

  // Dropdown menu items: Cancel
  items.push({
    label: "Cancel",
    icon: IconX,
    onClick: callbacks.onCancel,
    variant: "destructive",
    hidden: payment.is_cancelled,
  });

  return items;
}

// Adjustment Note Detail Footer Items
export interface AdjustmentNoteDetailFooterCallbacks {
  onEdit: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

export function getAdjustmentNoteDetailFooterItems(
  adjustmentNote: Pick<AdjustmentNote, "is_cancelled" | "exported_to_tally_at">,
  callbacks: AdjustmentNoteDetailFooterCallbacks,
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [];

  // Primary button (flex-2): Edit
  // Hidden if cancelled or exported to Tally
  items.push({
    label: "Edit",
    icon: IconEdit,
    onClick: callbacks.onEdit,
    variant: "outline",
    hidden:
      adjustmentNote.is_cancelled ||
      adjustmentNote.exported_to_tally_at !== null,
  });

  // Secondary button (flex-1): Delete
  items.push({
    label: "Delete",
    icon: IconTrash,
    onClick: callbacks.onDelete,
    variant: "destructive",
    hidden:
      adjustmentNote.is_cancelled ||
      adjustmentNote.exported_to_tally_at !== null,
  });

  // Dropdown menu items: Cancel
  items.push({
    label: "Cancel",
    icon: IconX,
    onClick: callbacks.onCancel,
    variant: "destructive",
    hidden: adjustmentNote.is_cancelled,
  });

  return items;
}
