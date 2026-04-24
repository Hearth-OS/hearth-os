import { ghost } from "./ghost";

const neighborhoods = ["Mission", "Castro", "Richmond", "Sunset", "SOMA", "Noe Valley"] as const;

const bounds: Record<string, [number, number, number, number]> = {
  Mission:      [37.745, 37.770, -122.425, -122.405],
  Castro:       [37.755, 37.768, -122.445, -122.428],
  Richmond:     [37.775, 37.785, -122.490, -122.450],
  Sunset:       [37.748, 37.770, -122.510, -122.480],
  SOMA:         [37.772, 37.785, -122.415, -122.390],
  "Noe Valley": [37.740, 37.758, -122.435, -122.420],
};

const streets = [
  "24th St", "Valencia St", "Noe St", "Sanchez St", "Guerrero St",
  "Dolores St", "18th St", "Cole St", "Carl St", "Judah St",
  "Irving St", "Lincoln Way", "Balboa St", "Geary Blvd", "Clement St",
];

const assetTypes = ["hvac", "roof", "water_heater", "gutters", "plumbing", "electrical"] as const;
const eventTypes = ["installed", "serviced", "replaced", "inspected"] as const;

function rand(min: number, max: number) { return Math.random() * (max - min) + min; }
function randInt(min: number, max: number) { return Math.floor(rand(min, max + 1)); }
function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function yearsAgo(years: number): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d;
}

async function seed() {
  console.log("Seeding Ghost DB (TimescaleDB)...");

  const properties = [];
  const events = [];

  for (let i = 0; i < 25; i++) {
    const neighborhood = pick(neighborhoods);
    const [latMin, latMax, lngMin, lngMax] = bounds[neighborhood];
    const id = `ghost-prop-${String(i + 1).padStart(3, "0")}`;
    const yearBuilt = randInt(1915, 2000);
    const roofAge = randInt(2, 22);
    const hvacAge = randInt(1, 18);

    properties.push({
      id,
      address: `${randInt(100, 3999)} ${pick(streets)}, San Francisco, CA`,
      neighborhood,
      lat: rand(latMin, latMax),
      lng: rand(lngMin, lngMax),
      property_type: Math.random() > 0.75 ? "multi_family" : "single_family",
      units: Math.random() > 0.75 ? randInt(2, 4) : 1,
      year_built: yearBuilt,
      roof_age_years: roofAge,
      hvac_age_years: hvacAge,
      last_permit_year: Math.random() > 0.4 ? randInt(2010, 2023) : null,
    });

    // Generate 3–6 historical asset events per property
    const eventCount = randInt(3, 6);
    for (let j = 0; j < eventCount; j++) {
      const asset = pick(assetTypes);
      const yearsBack = rand(0.5, 8);
      const eventDate = yearsAgo(yearsBack);

      events.push({
        time: eventDate.toISOString(),
        property_id: id,
        asset_type: asset,
        event_type: pick(eventTypes),
        cost: Math.random() > 0.2 ? randInt(150, 3500) : null,
        notes: null,
      });
    }
  }

  for (const p of properties) {
    await ghost`
      INSERT INTO sf_properties ${ghost(p)}
      ON CONFLICT (id) DO UPDATE SET
        roof_age_years = EXCLUDED.roof_age_years,
        hvac_age_years = EXCLUDED.hvac_age_years
    `;
  }
  console.log(`  ✓ ${properties.length} SF properties`);

  // Insert events in batches
  for (const e of events) {
    await ghost`
      INSERT INTO property_events ${ghost(e)}
    `;
  }
  console.log(`  ✓ ${events.length} property events (time-series)`);

  await ghost.end();
  console.log("Ghost DB seed complete.");
}

seed().catch((err) => {
  console.error("Ghost seed failed:", err.message);
  process.exit(1);
});
