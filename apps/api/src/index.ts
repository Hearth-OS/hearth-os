import express from "express";
import cors from "cors";
import { createClient } from "redis";
import { createYoga, createSchema } from "graphql-yoga";
import { sql } from "@hearth-os/db";
import { ghost } from "@hearth-os/db/src/ghost";

// ── Redis ──────────────────────────────────────────────────────────────────
const redis = createClient({ url: process.env.REDIS_URL });
redis.on("error", (err) => console.error("Redis error:", err));
redis.connect().then(() => console.log("Redis connected"));

async function cacheGet<T>(key: string): Promise<T | null> {
  const v = await redis.get(key);
  return v ? (JSON.parse(v) as T) : null;
}
async function cacheSet(key: string, value: unknown, ttlSeconds = 300) {
  await redis.setEx(key, ttlSeconds, JSON.stringify(value));
}

// ── GraphQL schema ─────────────────────────────────────────────────────────
const typeDefs = /* GraphQL */ `
  type Property {
    id: ID!
    parcel_id: String
    address: String!
    neighborhood: String
    lat: Float!
    lng: Float!
    property_type: String!
    units: Int!
    year_built: Int
    maintenanceItems: [MaintenanceItem!]!
  }

  type MaintenanceItem {
    id: ID!
    property_id: String!
    service: String!
    predicted_date: String!
    urgency: String!
    estimated_cost_low: Float!
    estimated_cost_high: Float!
    market_rate_median: Float
    shapley_discounted_rate: Float
  }

  type PricingRate {
    service: String!
    neighborhood: String!
    price_low: Float!
    price_high: Float!
    price_median: Float!
    source: String!
  }

  type Bundle {
    service: String!
    neighborhood: String!
    property_count: Int!
    cost_low: Float!
    cost_high: Float!
    shapley_discount: Float!
  }

  type GhostProperty {
    id: ID!
    address: String!
    neighborhood: String!
    lat: Float!
    lng: Float!
    property_type: String!
    units: Int!
    year_built: Int!
    roof_age_years: Int!
    hvac_age_years: Int!
    last_permit_year: Int
    recentEvents: [PropertyEvent!]!
  }

  type PropertyEvent {
    time: String!
    property_id: String!
    asset_type: String!
    event_type: String!
    cost: Float
  }

  type Query {
    properties: [Property!]!
    property(id: ID!): Property
    bundles(service: String, neighborhood: String): [Bundle!]!
    pricing(service: String!, neighborhood: String!): [PricingRate!]!
    ghostProperties: [GhostProperty!]!
    ghostProperty(id: ID!): GhostProperty
  }
`;

const resolvers = {
  Query: {
    properties: async () => {
      const cached = await cacheGet("gql:properties");
      if (cached) return cached;
      const rows = await sql`SELECT * FROM properties ORDER BY neighborhood, address`;
      await cacheSet("gql:properties", rows, 60);
      return rows;
    },
    property: async (_: unknown, { id }: { id: string }) => {
      const rows = await sql`SELECT * FROM properties WHERE id = ${id}`;
      return rows[0] ?? null;
    },
    bundles: async (_: unknown, args: { service?: string; neighborhood?: string }) => {
      const key = `gql:bundles:${args.service ?? "*"}:${args.neighborhood ?? "*"}`;
      const cached = await cacheGet(key);
      if (cached) return cached;
      const rows = await sql`
        SELECT m.service, p.neighborhood,
          COUNT(*)::int AS property_count,
          MIN(m.estimated_cost_low) AS cost_low,
          MAX(m.estimated_cost_high) AS cost_high
        FROM maintenance_items m
        JOIN properties p ON p.id = m.property_id
        WHERE (${args.service ?? null}::text IS NULL OR m.service = ${args.service ?? null})
          AND (${args.neighborhood ?? null}::text IS NULL OR p.neighborhood = ${args.neighborhood ?? null})
        GROUP BY m.service, p.neighborhood
        HAVING COUNT(*) >= 3
        ORDER BY COUNT(*) DESC
      `;
      const result = rows.map((r: any) => ({
        ...r,
        shapley_discount:
          r.property_count >= 20 ? 0.20 :
          r.property_count >= 10 ? 0.14 :
          r.property_count >= 5  ? 0.08 : 0,
      }));
      await cacheSet(key, result, 300);
      return result;
    },
    pricing: async (_: unknown, args: { service: string; neighborhood: string }) => {
      const key = `pricing:${args.service}:${args.neighborhood}`;
      const cached = await cacheGet(key);
      if (cached) return cached;
      const rows = await sql`
        SELECT * FROM pricing_rates
        WHERE service = ${args.service} AND neighborhood = ${args.neighborhood}
      `;
      await cacheSet(key, rows, 300);
      return rows;
    },
    ghostProperties: async () => {
      const cached = await cacheGet("gql:ghost:properties");
      if (cached) return cached;
      const rows = await ghost`SELECT * FROM sf_properties ORDER BY neighborhood, address`;
      await cacheSet("gql:ghost:properties", rows, 120);
      return rows;
    },
    ghostProperty: async (_: unknown, { id }: { id: string }) => {
      const rows = await ghost`SELECT * FROM sf_properties WHERE id = ${id}`;
      return rows[0] ?? null;
    },
  },
  Property: {
    maintenanceItems: async (parent: { id: string }) => {
      return sql`
        SELECT * FROM maintenance_items
        WHERE property_id = ${parent.id}
        ORDER BY predicted_date
      `;
    },
  },
  GhostProperty: {
    recentEvents: async (parent: { id: string }) => {
      return ghost`
        SELECT * FROM property_events
        WHERE property_id = ${parent.id}
        ORDER BY time DESC
        LIMIT 10
      `;
    },
  },
};

// ── Express + Yoga ─────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

const yoga = createYoga({
  schema: createSchema({ typeDefs, resolvers }),
  graphqlEndpoint: "/graphql",
  logging: false,
});
app.use("/graphql", yoga);

// ── REST endpoints (Person C uses these directly) ─────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "hearth-os-api" });
});

app.get("/api/properties", async (_req, res) => {
  try {
    const cached = await cacheGet("rest:properties");
    if (cached) { res.setHeader("X-Cache", "HIT"); return res.json(cached); }
    const rows = await sql`SELECT * FROM properties ORDER BY neighborhood, address`;
    await cacheSet("rest:properties", rows, 60);
    res.setHeader("X-Cache", "MISS");
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get("/api/properties/:id/timeline", async (req, res) => {
  try {
    const rows = await sql`
      SELECT * FROM maintenance_items
      WHERE property_id = ${req.params.id}
      ORDER BY predicted_date
    `;
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get("/api/bundles/open", async (req, res) => {
  const { service, neighborhood } = req.query as Record<string, string>;
  try {
    const key = `rest:bundles:${service ?? "*"}:${neighborhood ?? "*"}`;
    const cached = await cacheGet(key);
    if (cached) { res.setHeader("X-Cache", "HIT"); return res.json(cached); }
    const rows = await sql`
      SELECT m.service, p.neighborhood,
        COUNT(*)::int AS property_count,
        MIN(m.estimated_cost_low) AS cost_low,
        MAX(m.estimated_cost_high) AS cost_high
      FROM maintenance_items m
      JOIN properties p ON p.id = m.property_id
      WHERE (${service ?? null}::text IS NULL OR m.service = ${service ?? null})
        AND (${neighborhood ?? null}::text IS NULL OR p.neighborhood = ${neighborhood ?? null})
      GROUP BY m.service, p.neighborhood
      HAVING COUNT(*) >= 3
      ORDER BY COUNT(*) DESC
    `;
    const bundles = rows.map((r: any) => ({
      ...r,
      shapley_discount:
        r.property_count >= 20 ? 0.20 :
        r.property_count >= 10 ? 0.14 :
        r.property_count >= 5  ? 0.08 : 0,
    }));
    await cacheSet(key, bundles, 300);
    res.setHeader("X-Cache", "MISS");
    res.json(bundles);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

const PRICING_CACHE_TTL = 300;
const AGENT_SESSION_TTL = 86_400; // 24h — demo agent + LangCache-style dedup share one Redis
const SESSION_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

app.get("/api/pricing", async (req, res) => {
  const { service, neighborhood } = req.query as Record<string, string>;
  if (!service || !neighborhood) {
    return res.status(400).json({ error: "service and neighborhood are required" });
  }
  const key = `pricing:${service}:${neighborhood}`;
  try {
    res.setHeader("X-Cache-Key", key);
    const cached = await cacheGet(key);
    if (cached) { res.setHeader("X-Cache", "HIT"); return res.json(cached); }
    const rows = await sql`
      SELECT * FROM pricing_rates WHERE service = ${service} AND neighborhood = ${neighborhood}
    `;
    await cacheSet(key, rows, PRICING_CACHE_TTL);
    res.setHeader("X-Cache", "MISS");
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── Agent memory (Redis) — homeowner / agent session blob for demo + tool continuity ──
app.get("/api/agent/sessions/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!SESSION_ID_RE.test(id)) {
      return res.status(400).json({ error: "invalid session id" });
    }
    const raw = await redis.get(`agent:session:${id}`);
    if (raw == null) return res.json({ state: null });
    res.json({ state: JSON.parse(raw) });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.put("/api/agent/sessions/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!SESSION_ID_RE.test(id)) {
      return res.status(400).json({ error: "invalid session id" });
    }
    const body = req.body;
    if (body == null || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({ error: "body must be a JSON object" });
    }
    const key = `agent:session:${id}`;
    const existingRaw = await redis.get(key);
    const existing = existingRaw ? (JSON.parse(existingRaw) as Record<string, unknown>) : {};
    const merged = { ...existing, ...body, updatedAt: new Date().toISOString() };
    await redis.setEx(key, AGENT_SESSION_TTL, JSON.stringify(merged));
    res.json({ state: merged });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/agent/sessions/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!SESSION_ID_RE.test(id)) {
      return res.status(400).json({ error: "invalid session id" });
    }
    await redis.del(`agent:session:${id}`);
    res.status(204).end();
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`API    → http://localhost:${PORT}`);
  console.log(`GraphQL → http://localhost:${PORT}/graphql`);
});
