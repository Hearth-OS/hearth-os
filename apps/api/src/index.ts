// Person A owns this file — InsForge-backed API
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "hearth-os-api" });
});

// TODO Person A: wire InsForge DB client from @hearth-os/db
// TODO Person A: add WunderGraph MCP routes from @hearth-os/graph

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
