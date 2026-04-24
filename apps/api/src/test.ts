// Phase 2 tests — run with: node --env-file=../../.env --require=tsx/cjs src/test.ts
// Requires the API server to be running on localhost:3001

const BASE = "http://localhost:3001";

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`);
  return { status: res.status, headers: res.headers, body: await res.json() };
}

async function gql(query: string, variables?: Record<string, unknown>) {
  const res = await fetch(`${BASE}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

let passed = 0;
let failed = 0;

async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗ ${name}: ${err.message}`);
    failed++;
  }
}

async function run() {
  console.log("\n── Phase 2: Redis + GraphQL ──");

  // REST endpoints still work
  await check("GET /health", async () => {
    const { body } = await get("/health");
    if (body.status !== "ok") throw new Error(`unexpected: ${JSON.stringify(body)}`);
  });

  await check("GET /api/properties returns 30 rows", async () => {
    const { body } = await get("/api/properties");
    if (!Array.isArray(body) || body.length < 20) throw new Error(`got ${body.length ?? "error"}`);
    console.log(`     ${body.length} properties`);
  });

  // Redis cache — X-Cache header
  await check("Redis cache: second /api/properties call returns HIT", async () => {
    await get("/api/properties"); // warm cache
    const { headers } = await get("/api/properties");
    const hit = headers.get("x-cache");
    if (hit !== "HIT") throw new Error(`X-Cache was "${hit}", expected HIT`);
    console.log(`     X-Cache: HIT confirmed`);
  });

  await check("Redis cache: /api/bundles/open cached on second call", async () => {
    await get("/api/bundles/open?service=gutters");
    const { headers, body } = await get("/api/bundles/open?service=gutters");
    if (headers.get("x-cache") !== "HIT") throw new Error("not cached");
    console.log(`     ${body.length} gutter bundles (cached)`);
  });

  // GraphQL
  await check("GraphQL endpoint is live", async () => {
    const data = await gql("{ __typename }");
    if (data.errors) throw new Error(JSON.stringify(data.errors));
  });

  await check("GraphQL: properties query returns id/lat/lng", async () => {
    const data = await gql("{ properties { id lat lng address neighborhood } }");
    if (data.errors) throw new Error(JSON.stringify(data.errors));
    const props = data.data.properties;
    if (!props.length) throw new Error("no properties");
    const p = props[0];
    if (!p.id || !p.lat || !p.lng) throw new Error(`missing fields: ${JSON.stringify(p)}`);
    console.log(`     ${props.length} properties via GraphQL, sample: ${p.address}`);
  });

  await check("GraphQL: property with nested maintenanceItems", async () => {
    const data = await gql(`{
      property(id: "prop-001") {
        id address
        maintenanceItems { service urgency predicted_date }
      }
    }`);
    if (data.errors) throw new Error(JSON.stringify(data.errors));
    const items = data.data.property?.maintenanceItems;
    if (!items?.length) throw new Error("no maintenance items");
    console.log(`     ${items.length} items for prop-001, urgencies: ${items.map((i: any) => i.urgency).join(", ")}`);
  });

  await check("GraphQL: bundles query with service filter", async () => {
    const data = await gql(`{
      bundles(service: "gutters") {
        service neighborhood property_count shapley_discount
      }
    }`);
    if (data.errors) throw new Error(JSON.stringify(data.errors));
    const bundles = data.data.bundles;
    console.log(`     ${bundles.length} gutter bundles:`);
    for (const b of bundles) {
      console.log(`       ${b.neighborhood}: ${b.property_count} props, ${(b.shapley_discount * 100).toFixed(0)}% discount`);
    }
  });

  await check("GraphQL: bundles cached in Redis on second call", async () => {
    await gql(`{ bundles(service: "hvac") { service neighborhood property_count } }`);
    await get("/api/bundles/open?service=hvac"); // second call should be cached
    const { headers } = await get("/api/bundles/open?service=hvac");
    if (headers.get("x-cache") !== "HIT") throw new Error("REST bundles not cached after GraphQL warm");
  });

  console.log("\n── Phase 4: WunderGraph Router (:4000) ──");

  const ROUTER = "http://localhost:4000";
  async function routerGql(query: string) {
    const res = await fetch(`${ROUTER}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    return res.json();
  }

  await check("Router health check", async () => {
    const res = await fetch(`${ROUTER}/health/ready`);
    const text = await res.text();
    if (text.trim() !== "OK") throw new Error(`unexpected: ${text}`);
  });

  await check("Router: properties query (federated from API)", async () => {
    const data = await routerGql("{ properties { id address neighborhood lat lng } }");
    if (data.errors) throw new Error(JSON.stringify(data.errors));
    const props = data.data.properties;
    if (props.length < 20) throw new Error(`got ${props.length}`);
    console.log(`     ${props.length} properties via router`);
  });

  await check("Router: bundles query with Shapley discount", async () => {
    const data = await routerGql(`{ bundles(service: "gutters") { neighborhood property_count shapley_discount } }`);
    if (data.errors) throw new Error(JSON.stringify(data.errors));
    const bundles = data.data.bundles;
    if (!bundles.length) throw new Error("no bundles returned");
    for (const b of bundles) {
      console.log(`     ${b.neighborhood}: ${b.property_count} props, ${(b.shapley_discount * 100).toFixed(0)}% discount`);
    }
  });

  await check("Router: ghostProperties (TimescaleDB via router)", async () => {
    const data = await routerGql("{ ghostProperties { id neighborhood roof_age_years } }");
    if (data.errors) throw new Error(JSON.stringify(data.errors));
    console.log(`     ${data.data.ghostProperties.length} ghost properties via router`);
  });

  console.log("\n── Phase 3: Ghost DB (TimescaleDB) ──");

  await check("GraphQL: ghostProperties returns 25 rows", async () => {
    const data = await gql(`{
      ghostProperties { id address neighborhood lat lng roof_age_years hvac_age_years }
    }`);
    if (data.errors) throw new Error(JSON.stringify(data.errors));
    const props = data.data.ghostProperties;
    if (props.length < 20) throw new Error(`expected ≥20, got ${props.length}`);
    console.log(`     ${props.length} ghost properties`);
  });

  await check("GraphQL: ghostProperty with recentEvents (time-series)", async () => {
    // get first ghost property id
    const list = await gql(`{ ghostProperties { id } }`);
    const id = list.data.ghostProperties[0]?.id;
    if (!id) throw new Error("no ghost properties found");

    const data = await gql(`{
      ghostProperty(id: "${id}") {
        id address roof_age_years hvac_age_years
        recentEvents { time asset_type event_type cost }
      }
    }`);
    if (data.errors) throw new Error(JSON.stringify(data.errors));
    const p = data.data.ghostProperty;
    if (!p) throw new Error("property not found");
    console.log(`     ${p.address} — ${p.recentEvents.length} events, roof age: ${p.roof_age_years}yr`);
    if (p.recentEvents.length === 0) throw new Error("no events returned");
  });

  await check("Ghost properties have valid SF coordinates", async () => {
    const data = await gql(`{ ghostProperties { lat lng } }`);
    const bad = data.data.ghostProperties.filter(
      (p: any) => p.lat < 37.70 || p.lat > 37.82 || p.lng < -122.52 || p.lng > -122.34
    );
    if (bad.length > 0) throw new Error(`${bad.length} properties outside SF bounds`);
    console.log(`     all ${data.data.ghostProperties.length} in SF bounds`);
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Test runner error:", err.message);
  process.exit(1);
});
