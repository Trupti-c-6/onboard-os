import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// cn() combines conditional class names and resolves Tailwind conflicts
// e.g. cn("p-2", isActive && "p-4") correctly results in just "p-4", not both
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
