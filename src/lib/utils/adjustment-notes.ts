import type { AdjustmentNoteItemListView } from "@/types/adjustment-notes.types";
import type { MeasuringUnit } from "@/types/database/enums";
import { getMeasuringUnitAbbreviation } from "./measuring-units";

export function getAdjustmentItemSummary(
  items: AdjustmentNoteItemListView[],
): string {
  if (!items || items.length === 0) {
    return "No items";
  }

  const summaryParts = items.map((item) => {
    const productName = item.product?.name || "Unknown Product";
    const quantity = item.quantity;
    const unit = item.product?.measuring_unit as MeasuringUnit;

    const unitAbbreviation = getMeasuringUnitAbbreviation(unit);

    return `${productName} (${quantity} ${unitAbbreviation})`;
  });

  return summaryParts.join(", ");
}
