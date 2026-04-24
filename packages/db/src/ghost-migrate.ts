import { ghost } from "./ghost";

async function migrate() {
  console.log("Running Ghost DB migrations...");

  // Raw SF property records
  await ghost`
    CREATE TABLE IF NOT EXISTS sf_properties (
      id TEXT PRIMARY KEY,
      address TEXT NOT NULL,
      neighborhood TEXT NOT NULL,
      lat FLOAT NOT NULL,
      lng FLOAT NOT NULL,
      property_type TEXT NOT NULL,
      units INT NOT NULL DEFAULT 1,
      year_built INT NOT NULL,
      roof_age_years INT NOT NULL,
      hvac_age_years INT NOT NULL,
      last_permit_year INT
    )
  `;

  // Time-series asset event log (TimescaleDB hypertable)
  await ghost`
    CREATE TABLE IF NOT EXISTS property_events (
      time TIMESTAMPTZ NOT NULL,
      property_id TEXT NOT NULL,
      asset_type TEXT NOT NULL,
      event_type TEXT NOT NULL,
      cost FLOAT,
      notes TEXT
    )
  `;

  // Create hypertable if TimescaleDB extension is available
  try {
    await ghost`SELECT create_hypertable('property_events', 'time', if_not_exists => TRUE)`;
    console.log("  ✓ property_events hypertable created");
  } catch {
    console.log("  ~ property_events: running as plain table (TimescaleDB ext not enabled)");
  }

  await ghost`CREATE INDEX IF NOT EXISTS idx_events_property ON property_events(property_id, time DESC)`;

  console.log("Ghost DB migrations complete.");
  await ghost.end();
}

migrate().catch((err) => {
  console.error("Ghost migration failed:", err.message);
  process.exit(1);
});
