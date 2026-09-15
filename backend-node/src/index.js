import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { apiRoutes, initServices } from "./routes/api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({
  logger: {
    level: "info"
  }
});

const PORT = process.env.PORT || 8001;

// CORS setup
await fastify.register(cors, { origin: "*" });

// Multipart support
await fastify.register(multipart, {
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB
  }
});

// Register API routes
await fastify.register(apiRoutes, { prefix: "/api" });

// Root health check
fastify.get("/health", async () => {
  return { status: "healthy", service: "quran-verse-identifier-fastify" };
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
  fastify.log.info(`[Static] Serving frontend from: ${staticDir}`);
  await fastify.register(fastifyStatic, {
    root: staticDir,
    prefix: "/"
  });

  fastify.setNotFoundHandler((req, reply) => {
    if (req.raw.url && req.raw.url.startsWith("/api")) {
      reply.code(404).send({ detail: "Endpoint not found" });
    } else {
      reply.sendFile("index.html");
    }
  });
} else {
  fastify.get("/", async () => {
    return {
      message: "Quran Verse Identifier API (Fastify 5)",
      status: "running",
      endpoints: "/api"
    };
  });
}

// Start server
async function start() {
  try {
    console.log("Initializing ArabicMatcher and VerseMatcher...");
    await initServices();
    await fastify.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`====================================================`);
    console.log(` Quran Verse Identifier Fastify Server Running!`);
    console.log(` Local URL:    http://localhost:${PORT}`);
    console.log(` Health Check: http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
