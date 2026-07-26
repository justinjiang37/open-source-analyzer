// Small shared helpers used across UI components.
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Merge conditional class names and resolve Tailwind conflicts (common UI helper).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
