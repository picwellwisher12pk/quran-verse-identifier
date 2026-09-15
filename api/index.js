import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { apiRoutes, initServices } from "../backend-node/src/routes/api.js";

const fastify = Fastify({ logger: false });

await fastify.register(cors, { origin: "*" });
await fastify.register(multipart, { limits: { fileSize: 25 * 1024 * 1024 } });
await fastify.register(apiRoutes, { prefix: "/api" });

fastify.get("/", async () => {
  return {
    message: "Quran Verse Identifier Fastify Serverless API",
    status: "running"
  };
});

let readyPromise = null;

export default async function handler(req, res) {
  if (!readyPromise) {
    readyPromise = (async () => {
      console.log("[Vercel Serverless] Initializing Quran database & matcher services...");
      const start = Date.now();
      await initServices();
      await fastify.ready();
      console.log(`[Vercel Serverless] Services initialized successfully in ${Date.now() - start}ms.`);
    })();
  }
  await readyPromise;
  fastify.server.emit("request", req, res);
}
