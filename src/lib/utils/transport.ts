import { ComponentType } from "react";
import {
  IconTruck,
  IconTrain,
  IconPlane,
  IconShip,
  IconPackage,
  IconBox,
} from "@tabler/icons-react";

/**
 * Get icon component for transport type
 */
export function getTransportIcon(
  transportType: string | null,
): ComponentType<{ className?: string }> {
  switch (transportType) {
    case "road":
      return IconTruck;
    case "rail":
      return IconTrain;
    case "air":
      return IconPlane;
    case "sea":
      return IconShip;
    case "courier":
      return IconPackage;
    default:
      return IconBox;
  }
}

/**
 * Get display name for transport type
 */
export function getTransportTypeDisplay(transportType: string | null): string {
  if (!transportType) return "Not specified";
  return transportType.charAt(0).toUpperCase() + transportType.slice(1);
}
