import { MockLocation } from "../types";

export const DEFAULT_LOCATION: MockLocation = {
  id: 1,
  team: 1,
  country: "DNK",
  device: "desktop",
  lang_const: "1009",
  geo_const: "2208",
};

export function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function normalizeDomain(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^sc-domain:/i, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

export function normalizeSiteUrl(input: string): string {
  const cleaned = normalizeDomain(input);
  if (cleaned.startsWith("sc-domain:")) {
    return cleaned;
  }
  return `sc-domain:${cleaned.replace(/^www\./, "")}`;
}

export function normalizeTagName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function seededNoise(seed: number, index: number): number {
  const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return (value - Math.floor(value)) * 2 - 1;
}

export function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
