import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import apiRouter, { initServices } from "./routes/api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8001;

// CORS setup
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount API routes
app.use("/api", apiRouter);

// Health check on root /health as well
app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "quran-verse-identifier-node" });
});

// Serve frontend static build if available
const staticCandidates = [
  path.resolve(__dirname, "../../static"),
  path.resolve(__dirname, "../../frontend/build")
];

let staticDir = null;
for (const cand of staticCandidates) {
  if (fs.existsSync(cand) && fs.existsSync(path.join(cand, "index.html"))) {
    staticDir = cand;
    break;
  }
}

if (staticDir) {
  console.log(`[Static] Serving frontend from: ${staticDir}`);
  app.use(express.static(staticDir));
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
      return res.sendFile(path.join(staticDir, "index.html"));
    }
    next();
  });
} else {
  app.get("/", (req, res) => {
    res.json({
      message: "Quran Verse Identifier API (Node.js)",
      status: "running",
      endpoints: "/api"
    });
  });
}

// Start server
async function startServer() {
  try {
    console.log("Initializing ArabicMatcher and VerseMatcher...");
    await initServices();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`====================================================`);
      console.log(` Quran Verse Identifier Node.js Server Running!`);
      console.log(` Local URL:    http://localhost:${PORT}`);
      console.log(` Health Check: http://localhost:${PORT}/api/health`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error("Failed to start Node.js server:", err);
    process.exit(1);
  }
}

startServer();
