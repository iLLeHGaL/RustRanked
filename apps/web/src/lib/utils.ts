import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

export function getKDRatio(kills: number, deaths: number): string {
  if (deaths === 0) return kills.toString();
  return (kills / deaths).toFixed(2);
}
