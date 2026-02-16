export interface GraphStats {
  created_at: string;
  position: number;
  clicks: number;
  impressions: number;
  page?: string;
}

export interface FormattedData {
  date: string;
  position: number;
  clicks: number;
  impressions: number;
  ctr: number;
  page?: string;
  isComparison?: boolean;
}

export type MetricView = "clicks" | "impressions" | "position" | "ctr";

export interface MetricConfig {
  key: MetricView;
  name: string;
  color: string;
  format: (value: number) => string;
}

export const metrics: MetricConfig[] = [
  {
    key: "clicks",
    name: "Kliks",
    color: "hsl(var(--chart-1))",
    format: (value) => Math.round(value).toLocaleString("da-DK"),
  },
  {
    key: "impressions",
    name: "Eksponeringer",
    color: "hsl(var(--chart-1))",
    format: (value) => Math.round(value).toLocaleString("da-DK"),
  },
  {
    key: "position",
    name: "Position",
    color: "hsl(var(--chart-1))",
    format: (value) =>
      value.toLocaleString("da-DK", { maximumFractionDigits: 1 }),
  },
  {
    key: "ctr",
    name: "CTR",
    color: "hsl(var(--chart-1))",
    format: (value) =>
      `${value.toLocaleString("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`,
  },
];
