/**
 * Product Template Configuration
 * Defines 100 fabric product templates across different categories
 * Distribution: 20 silk + 30 cotton + 15 wool + 20 synthetic + 15 specialty = 100 products
 */

import type { MeasuringUnit } from "@/types/database/enums";

export interface ProductTemplate {
  name: string;
  category: string;
  gsmRange: [number, number];
  threadCountRange: [number, number];
  stockType: "roll" | "batch";
  measuringUnit: MeasuringUnit;
  priceRange: [number, number];
  materials: string[];
  colors: string[];
  tags: string[];
}

/**
 * 100 Product Templates
 * Categories: Silk (20), Cotton (30), Wool (15), Synthetic (20), Specialty (15)
 */
export const PRODUCT_TEMPLATES: ProductTemplate[] = [
  // Silk fabrics (20) - All rolls with metre/yard/kilogram
  ...Array.from({ length: 20 }, (_, i) => {
    const measuringUnits: Array<"metre" | "yard" | "kilogram"> = [
      "metre",
      "yard",
      "kilogram",
    ];
    return {
      name: `Silk Fabric ${["Banarasi", "Kanjivaram", "Tussar", "Chanderi", "Mysore"][i % 5]} ${i + 1}`,
      category: "silk",
      gsmRange: [80, 150] as [number, number],
      threadCountRange: [70, 120] as [number, number],
      stockType: "roll" as const,
      measuringUnit: measuringUnits[i % 3],
      priceRange: [2000, 5000] as [number, number],
      materials: ["Silk"],
      colors: ["Red", "White", "Green", "Yellow", "Blue"],
      tags: ["premium", "wedding", "traditional", "luxury", "festive"],
    };
  }),
  // Cotton fabrics (30) - Mix of roll and batch
  ...Array.from({ length: 30 }, (_, i) => {
    const isBatch = i % 3 === 0;
    const rollUnits: Array<"metre" | "yard" | "kilogram"> = [
      "metre",
      "yard",
      "kilogram",
    ];
    return {
      name: `Cotton Fabric ${["Regular", "Organic", "Printed", "Khadi", "Slub"][i % 5]} ${i + 1}`,
      category: "cotton",
      gsmRange: [120, 180] as [number, number],
      threadCountRange: [50, 80] as [number, number],
      stockType: (isBatch ? "batch" : "roll") as "roll" | "batch",
      measuringUnit: (isBatch ? "unit" : rollUnits[i % 3]) as
        | "metre"
        | "yard"
        | "kilogram"
        | "unit",
      priceRange: [300, 800] as [number, number],
      materials: ["Cotton"],
      colors: ["White", "Black", "Blue", "Yellow", "Red"],
      tags: ["summer", "breathable", "casual", "eco-friendly", "printed"],
    };
  }),
  // Wool/Blends (15) - All rolls
  ...Array.from({ length: 15 }, (_, i) => {
    const rollUnits: Array<"metre" | "yard" | "kilogram"> = [
      "metre",
      "yard",
      "kilogram",
    ];
    return {
      name: `Wool Fabric ${["Pure", "Cashmere", "Merino", "Blend", "Fine"][i % 5]} ${i + 1}`,
      category: "wool",
      gsmRange: [180, 300] as [number, number],
      threadCountRange: [40, 65] as [number, number],
      stockType: "roll" as const,
      measuringUnit: rollUnits[i % 3],
      priceRange: [1500, 3500] as [number, number],
      materials: ["Wool"],
      colors: ["Black", "White", "Blue", "Green"],
      tags: ["winter", "warm", "premium", "luxury"],
    };
  }),
  // Synthetic (20) - Mix of roll and batch
  ...Array.from({ length: 20 }, (_, i) => {
    const isBatch = i % 7 === 0;
    const rollUnits: Array<"metre" | "yard" | "kilogram"> = [
      "metre",
      "yard",
      "kilogram",
    ];
    return {
      name: `Synthetic Fabric ${["Polyester", "Nylon", "Rayon", "Lycra"][i % 4]} ${i + 1}`,
      category: "synthetic",
      gsmRange: [140, 220] as [number, number],
      threadCountRange: [55, 85] as [number, number],
      stockType: (isBatch ? "batch" : "roll") as "roll" | "batch",
      measuringUnit: (isBatch ? "unit" : rollUnits[i % 3]) as
        | "metre"
        | "yard"
        | "kilogram"
        | "unit",
      priceRange: [250, 700] as [number, number],
      materials: ["Polyester"],
      colors: ["Blue", "Black", "Red", "Green", "Yellow"],
      tags: ["modern", "formal", "wrinkle-free", "durable"],
    };
  }),
  // Specialty (15) - Mix of roll and batch
  ...Array.from({ length: 15 }, (_, i) => {
    const isBatch = i % 4 === 0;
    const rollUnits: Array<"metre" | "yard" | "kilogram"> = [
      "metre",
      "yard",
      "kilogram",
    ];
    return {
      name: `Specialty Fabric ${["Linen", "Jute", "Bamboo", "Modal", "Hemp"][i % 5]} ${i + 1}`,
      category: "specialty",
      gsmRange: [130, 200] as [number, number],
      threadCountRange: [45, 70] as [number, number],
      stockType: (isBatch ? "batch" : "roll") as "roll" | "batch",
      measuringUnit: (isBatch ? "unit" : rollUnits[i % 3]) as
        | "metre"
        | "yard"
        | "kilogram"
        | "unit",
      priceRange: [600, 1500] as [number, number],
      materials: ["Linen"],
      colors: ["White", "Black", "Green", "Yellow"],
      tags: ["eco-friendly", "summer", "breathable", "modern"],
    };
  }),
];
