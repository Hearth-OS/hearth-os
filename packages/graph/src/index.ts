// Person A — WunderGraph MCP federation config
// Ref: cosmo-docs.wundergraph.com/router/mcp

export const graphConfig = {
  gateway: process.env.WUNDERGRAPH_API_URL ?? "http://localhost:4000",
  subgraphs: [
    {
      name: "insforge",
      url: process.env.INSFORGE_GRAPHQL_URL ?? "",
    },
    {
      name: "ghost",
      url: process.env.GHOST_GRAPHQL_URL ?? "",
    },
    {
      name: "sf-parcels",
      // SF Open Data assessor endpoint
      url: "https://data.sfgov.org/resource/wv5m-vpq2.json",
    },
  ],
};

export async function queryGraph(query: string, variables?: Record<string, unknown>) {
  // TODO Person A: replace with real WunderGraph cosmo client
  const res = await fetch(`${graphConfig.gateway}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}
