import {
  IconUsers,
  IconShoppingCart,
  IconTruckLoading,
  IconBuildingBank,
  IconCash,
  IconPackage,
  IconFileInvoice,
  IconTrendingUp,
  IconTrendingDown,
  type Icon,
  IconReceiptTax,
} from "@tabler/icons-react";
import type { Database } from "@/types/database/supabase";

type LedgerType = Database["public"]["Enums"]["ledger_type_enum"];

/**
 * Get icon component for ledger type
 */
export function getLedgerIcon(ledgerType: LedgerType): Icon {
  const icons: Record<LedgerType, Icon> = {
    party: IconUsers,
    sales: IconShoppingCart,
    purchase: IconTruckLoading,
    tax: IconReceiptTax,
    bank: IconBuildingBank,
    cash: IconCash,
    asset: IconPackage,
    liability: IconFileInvoice,
    income: IconTrendingUp,
    expense: IconTrendingDown,
  };

  return icons[ledgerType] || IconPackage;
}

/**
 * Get ledger type label (human-readable)
 */
export function getLedgerTypeLabel(ledgerType: LedgerType): string {
  const labels: Record<LedgerType, string> = {
    party: "Party",
    sales: "Sales",
    purchase: "Purchase",
    tax: "Tax",
    bank: "Bank",
    cash: "Cash",
    asset: "Asset",
    liability: "Liability",
    income: "Income",
    expense: "Expense",
  };

  return labels[ledgerType] || ledgerType;
}
