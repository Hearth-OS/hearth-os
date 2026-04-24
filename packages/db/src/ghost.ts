import postgres from "postgres";

if (!process.env.GHOST_DATABASE_URL) {
  throw new Error("GHOST_DATABASE_URL is not set");
}

export const ghost = postgres(process.env.GHOST_DATABASE_URL, {
  ssl: "require",
  max: 5,
  idle_timeout: 20,
});

// Raw SF property record as stored in Ghost (TimescaleDB)
export interface GhostProperty {
  id: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  property_type: "single_family" | "multi_family";
  units: number;
  year_built: number;
  roof_age_years: number;
  hvac_age_years: number;
  last_permit_year: number | null;
}

// Asset lifecycle event stored in the hypertable
export interface PropertyEvent {
  time: string;       // ISO timestamp — partition key
  property_id: string;
  asset_type: string; // hvac, roof, water_heater, gutters, plumbing, electrical
  event_type: string; // installed, serviced, replaced, inspected
  cost: number | null;
  notes: string | null;
}
