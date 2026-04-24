import { sql } from "./index";

const neighborhoods = ["Mission", "Castro", "Richmond", "Sunset", "SOMA", "Noe Valley"] as const;
const services = ["gutters", "hvac", "roof", "plumbing", "electrical"] as const;

// Rough bounding boxes per SF neighborhood [lat_min, lat_max, lng_min, lng_max]
const bounds: Record<string, [number, number, number, number]> = {
  Mission:    [37.745, 37.770, -122.425, -122.405],
  Castro:     [37.755, 37.768, -122.445, -122.428],
  Richmond:   [37.775, 37.785, -122.490, -122.450],
  Sunset:     [37.748, 37.770, -122.510, -122.480],
  SOMA:       [37.772, 37.785, -122.415, -122.390],
  "Noe Valley": [37.740, 37.758, -122.435, -122.420],
};

const streetNames = [
  "Market St", "Valencia St", "Mission St", "Castro St", "Divisadero St",
  "Haight St", "Fillmore St", "Hayes St", "Grove St", "Fell St",
  "Oak St", "Page St", "Waller St", "Duboce Ave", "Church St",
];

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// urgency based on months until predicted date
function urgency(monthsOut: number): "green" | "yellow" | "red" {
  if (monthsOut <= 3) return "red";
  if (monthsOut <= 9) return "yellow";
  return "green";
}

function addMonths(date: Date, months: number): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

const serviceCosts: Record<string, [number, number]> = {
  gutters:    [150, 400],
  hvac:       [200, 600],
  roof:       [500, 2000],
  plumbing:   [150, 500],
  electrical: [200, 800],
};

async function seed() {
  console.log("Seeding synthetic SF properties...");

  const now = new Date();
  const properties = [];
  const maintenanceItems = [];

  for (let i = 0; i < 30; i++) {
    const neighborhood = pick(neighborhoods);
    const [latMin, latMax, lngMin, lngMax] = bounds[neighborhood];
    const propertyId = `prop-${String(i + 1).padStart(3, "0")}`;

    properties.push({
      id: propertyId,
      parcel_id: `SF-${randInt(1000, 9999)}-${randInt(100, 999)}`,
      address: `${randInt(100, 3999)} ${pick(streetNames)}, San Francisco, CA`,
      neighborhood,
      lat: rand(latMin, latMax),
      lng: rand(lngMin, lngMax),
      property_type: Math.random() > 0.8 ? "multi_family" : "single_family",
      units: Math.random() > 0.8 ? randInt(2, 4) : 1,
      year_built: randInt(1920, 2005),
      owner_id: `owner-${String(i + 1).padStart(3, "0")}`,
    });

    // each property gets 2–4 maintenance items at different time horizons
    const itemCount = randInt(2, 4);
    const assignedServices = [...services].sort(() => Math.random() - 0.5).slice(0, itemCount);

    for (let j = 0; j < assignedServices.length; j++) {
      const service = assignedServices[j];
      // spread items across 1–18 months out so we get a mix of urgencies
      const monthsOut = [2, 5, 11, 16][j] ?? randInt(1, 18);
      const [costLow, costHigh] = serviceCosts[service];

      maintenanceItems.push({
        id: `maint-${propertyId}-${service}`,
        property_id: propertyId,
        service,
        predicted_date: addMonths(now, monthsOut),
        urgency: urgency(monthsOut),
        estimated_cost_low: costLow,
        estimated_cost_high: costHigh,
        market_rate_median: null,
        shapley_discounted_rate: null,
      });
    }
  }

  // upsert properties
  for (const p of properties) {
    await sql`
      INSERT INTO properties ${sql(p)}
      ON CONFLICT (id) DO UPDATE SET
        address = EXCLUDED.address,
        neighborhood = EXCLUDED.neighborhood,
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng
    `;
  }
  console.log(`  ✓ ${properties.length} properties`);

  // upsert maintenance items
  for (const m of maintenanceItems) {
    await sql`
      INSERT INTO maintenance_items ${sql(m)}
      ON CONFLICT (id) DO UPDATE SET
        predicted_date = EXCLUDED.predicted_date,
        urgency = EXCLUDED.urgency
    `;
  }
  console.log(`  ✓ ${maintenanceItems.length} maintenance items`);

  await sql.end();
  console.log("Seed complete.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
