import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Combine les classes conditionnelles puis resout les conflits Tailwind.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
