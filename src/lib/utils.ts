import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Unit } from "@/types/lottery";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUnitLabel(unit: Pick<Unit, "apartment" | "block">) {
  return unit.block?.trim() ? `${unit.block.trim()}-${unit.apartment}` : unit.apartment;
}
