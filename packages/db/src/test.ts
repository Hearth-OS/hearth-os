import { sql } from "./index";

async function test() {
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

  console.log("\n── Phase 1: DB connectivity ──");

  await check("connects to Postgres", async () => {
    const rows = await sql`SELECT 1 AS ok`;
    if (rows[0].ok !== 1) throw new Error("unexpected result");
  });

  await check("properties table exists", async () => {
    const rows = await sql`SELECT COUNT(*)::int AS n FROM properties`;
    console.log(`     ${rows[0].n} properties in DB`);
  });

  await check("maintenance_items table exists", async () => {
    const rows = await sql`SELECT COUNT(*)::int AS n FROM maintenance_items`;
    console.log(`     ${rows[0].n} maintenance items in DB`);
  });

  await check("pricing_rates table exists", async () => {
    const rows = await sql`SELECT COUNT(*)::int AS n FROM pricing_rates`;
    console.log(`     ${rows[0].n} pricing rates in DB`);
  });

  await check("properties have valid lat/lng", async () => {
    const rows = await sql`
      SELECT COUNT(*)::int AS n FROM properties
      WHERE lat BETWEEN 37.70 AND 37.82
      AND lng BETWEEN -122.52 AND -122.34
    `;
    if (rows[0].n === 0) throw new Error("no properties with SF coordinates");
    console.log(`     ${rows[0].n} properties in SF bounds`);
  });

  await check("maintenance items have urgency spread", async () => {
    const rows = await sql`
      SELECT urgency, COUNT(*)::int AS n
      FROM maintenance_items GROUP BY urgency ORDER BY urgency
    `;
    const urgencies = rows.map((r: any) => r.urgency);
    if (!urgencies.includes("red") && !urgencies.includes("yellow") && !urgencies.includes("green")) {
      throw new Error("missing urgency values");
    }
    for (const r of rows as any[]) {
      console.log(`     ${r.urgency}: ${r.n} items`);
    }
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  await sql.end();
  if (failed > 0) process.exit(1);
}

test().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
