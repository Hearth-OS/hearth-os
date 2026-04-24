import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export const sql = postgres(process.env.DATABASE_URL, {
  ssl: "require",
  max: 10,
  idle_timeout: 20,
});

export interface Property {
  id: string;
  parcel_id: string | null;
  address: string;
  neighborhood: string | null;
  lat: number;
  lng: number;
  property_type: "single_family" | "multi_family";
  units: number;
  year_built: number | null;
  owner_id: string | null;
}

export interface MaintenanceItem {
  id: string;
  property_id: string;
  service: ServiceCategory;
  predicted_date: string;
  urgency: "green" | "yellow" | "red";
  estimated_cost_low: number;
  estimated_cost_high: number;
  market_rate_median: number | null;
  shapley_discounted_rate: number | null;
}

export type ServiceCategory =
  | "gutters"
  | "hvac"
  | "roof"
  | "plumbing"
  | "electrical"
  | "painting";

export interface PricingRate {
  id: string;
  service: ServiceCategory;
  neighborhood: string;
  price_low: number;
  price_high: number;
  price_median: number;
  source: string;
  scraped_at: string;
}
