import { sql } from "./index";

async function migrate() {
  console.log("Running migrations...");

  await sql`
    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      parcel_id TEXT,
      address TEXT NOT NULL,
      neighborhood TEXT,
      lat FLOAT NOT NULL,
      lng FLOAT NOT NULL,
      property_type TEXT NOT NULL CHECK (property_type IN ('single_family', 'multi_family')),
      units INT NOT NULL DEFAULT 1,
      year_built INT,
      owner_id TEXT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS maintenance_items (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      service TEXT NOT NULL,
      predicted_date DATE NOT NULL,
      urgency TEXT NOT NULL CHECK (urgency IN ('green', 'yellow', 'red')),
      estimated_cost_low FLOAT NOT NULL,
      estimated_cost_high FLOAT NOT NULL,
      market_rate_median FLOAT,
      shapley_discounted_rate FLOAT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pricing_rates (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      service TEXT NOT NULL,
      neighborhood TEXT NOT NULL,
      price_low FLOAT NOT NULL,
      price_high FLOAT NOT NULL,
      price_median FLOAT NOT NULL,
      source TEXT NOT NULL,
      scraped_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_maintenance_property ON maintenance_items(property_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_maintenance_service ON maintenance_items(service)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pricing_service_neighborhood ON pricing_rates(service, neighborhood)`;

  console.log("Migrations complete.");
  await sql.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
