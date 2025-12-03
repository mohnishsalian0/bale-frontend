"use client";

import { useRouter } from "next/navigation";
import { IconBox } from "@tabler/icons-react";
import IconGoodsInward from "@/components/icons/IconGoodsInward";
import IconGoodsOutward from "@/components/icons/IconGoodsOutward";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import { getPartnerName } from "@/lib/utils/partner";
import { useSession } from "@/contexts/session-context";
import type { MeasuringUnit } from "@/types/database/enums";
import { StockUnitWithInwardListView } from "@/types/stock-units.types";
import type { OutwardItemWithOutwardDetailView } from "@/types/stock-flow.types";

interface InwardFlow {
  type: "inward";
  id: string;
  sequence_number: number;
  date: string;
  receiver: string;
  quantity: number;
}

interface OutwardFlow {
  type: "outward";
  id: string;
  sequence_number: number;
  date: string;
  receiver: string;
  quantity: number;
}

type FlowItem = InwardFlow | OutwardFlow;

interface StockFlowTabProps {
  inwardItems: StockUnitWithInwardListView[];
  outwardItems: OutwardItemWithOutwardDetailView[];
  measuringUnit: MeasuringUnit | null;
}

export function StockFlowTab({
  inwardItems,
  outwardItems,
  measuringUnit,
}: StockFlowTabProps) {
  const router = useRouter();
  const { warehouse } = useSession();
  const unitAbbr = getMeasuringUnitAbbreviation(measuringUnit);

  // Transform inward items - group by goods_inward to avoid duplicates
  const inwardMap = new Map<string, InwardFlow>();
  inwardItems
    .filter((item) => item.goods_inward)
    .forEach((item) => {
      const inward = item.goods_inward!;
      const sender = inward.from_warehouse
        ? inward.from_warehouse.name
        : inward.partner
          ? getPartnerName(inward.partner)
          : "Unknown";

      if (inwardMap.has(inward.id)) {
        // Add quantity to existing entry
        const existing = inwardMap.get(inward.id)!;
        existing.quantity += item.initial_quantity || 0;
      } else {
        // Create new entry
        inwardMap.set(inward.id, {
          type: "inward" as const,
          id: inward.id,
          sequence_number: inward.sequence_number,
          date: inward.inward_date,
          receiver: sender,
          quantity: item.initial_quantity || 0,
        });
      }
    });
  const inwardFlows: InwardFlow[] = Array.from(inwardMap.values());

  // Transform outward items - group by goods_outward to avoid duplicates
  const outwardMap = new Map<string, OutwardFlow>();
  outwardItems
    .filter((item) => item.outward)
    .forEach((item) => {
      const outward = item.outward!;
      const receiver = outward.to_warehouse
        ? outward.to_warehouse.name
        : outward.partner
          ? getPartnerName(outward.partner)
          : "Unknown";

      if (outwardMap.has(outward.id)) {
        // Add quantity to existing entry
        const existing = outwardMap.get(outward.id)!;
        existing.quantity += item.quantity_dispatched || 0;
      } else {
        // Create new entry
        outwardMap.set(outward.id, {
          type: "outward" as const,
          id: outward.id,
          sequence_number: outward.sequence_number,
          date: outward.outward_date,
          receiver,
          quantity: item.quantity_dispatched || 0,
        });
      }
    });
  const outwardFlows: OutwardFlow[] = Array.from(outwardMap.values());

  // Combine and sort by date (latest first)
  const allFlows: FlowItem[] = [...inwardFlows, ...outwardFlows].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  if (allFlows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <IconBox className="size-12 text-gray-400 mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          No stock flow
        </h3>
        <p className="text-sm text-gray-500 text-center">
          No inward or outward transactions found for this product
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {allFlows.map((flow) => (
        <button
          key={`${flow.type}-${flow.id}`}
          onClick={() => {
            const path =
              flow.type === "inward"
                ? `/warehouse/${warehouse.slug}/goods-inward/${flow.sequence_number}`
                : `/warehouse/${warehouse.slug}/goods-outward/${flow.sequence_number}`;
            router.push(path);
          }}
          className={`flex items-center gap-4 px-4 py-3 border-t border-gray-200 hover:bg-gray-50 transition-colors ${flow.type === "inward" ? "bg-orange-100" : "bg-green-100"}`}
        >
          {flow.type === "inward" ? (
            <IconGoodsInward className="size-8 fill-gray-500" />
          ) : (
            <IconGoodsOutward className="size-8 fill-gray-500" />
          )}
          <div className="flex-1 flex flex-col items-start min-w-0">
            <p className="text-base font-medium text-gray-900">
              {flow.type === "inward" ? "GI" : "GO"}-{flow.sequence_number}
            </p>
            <p className="text-xs text-left text-gray-600">
              {formatAbsoluteDate(flow.date)} • {flow.receiver}
            </p>
          </div>

          <div>
            <p className="text-base font-semibold text-gray-900 text-right">
              {flow.quantity.toFixed(2)} {unitAbbr}
            </p>
            <p className="text-xs text-gray-600 text-right">
              {flow.type === "inward" ? "received" : "dispatched"}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
