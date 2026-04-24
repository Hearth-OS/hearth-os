// Person A — InsForge DB client + schema types

export interface Property {
  id: string;
  parcelId: string;
  address: string;
  lat: number;
  lng: number;
  propertyType: "single_family" | "multi_family";
  units: number;
  yearBuilt: number;
  ownerId: string;
}

export interface MaintenanceItem {
  id: string;
  propertyId: string;
  service: ServiceCategory;
  predictedDate: string;   // ISO date
  urgency: "green" | "yellow" | "red";
  estimatedCostLow: number;
  estimatedCostHigh: number;
  marketRateMedian?: number;
  shapleyDiscountedRate?: number;
}

export type ServiceCategory =
  | "gutters"
  | "hvac"
  | "roof"
  | "plumbing"
  | "electrical"
  | "painting";

export interface PricingRate {
  service: ServiceCategory;
  neighborhood: string;
  priceLow: number;
  priceHigh: number;
  priceMedian: number;
  source: string;
  scrapedAt: string;
}

// TODO Person A: replace with InsForge client once linked
export const db = {
  properties: [] as Property[],
  maintenanceItems: [] as MaintenanceItem[],
  pricingRates: [] as PricingRate[],
};
