import {
  InwardWithStockUnitListView,
  OutwardWithOutwardItemListView,
} from "@/types/stock-flow.types";
import { getPartnerName } from "./partner";

/**
 * Get formatted name for a sender
 * Returns partner name if received from partner, otherwise warehouse name if warehouse transfer
 */
export function getSenderName(
  inward: Pick<InwardWithStockUnitListView, "partner" | "from_warehouse">,
): string {
  let senderName: string = "Unknown sender";
  if (inward.partner) {
    senderName = getPartnerName(inward.partner);
  } else if (inward.from_warehouse) {
    senderName = inward.from_warehouse.name;
  }

  return senderName;
}

/**
 * Get formatted name for a receiver
 * Returns partner name if sent to partner, otherwise warehouse name if warehouse transfer
 */
export function getReceiverName(
  outward: Pick<OutwardWithOutwardItemListView, "partner" | "to_warehouse">,
): string {
  let receiverName: string = "Unknown receiver";
  if (outward.partner) {
    receiverName = getPartnerName(outward.partner);
  } else if (outward.to_warehouse) {
    receiverName = outward.to_warehouse.name;
  }

  return receiverName;
}
