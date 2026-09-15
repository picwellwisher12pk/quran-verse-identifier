import express from "express";
import cors from "cors";
import apiRouter, { initServices } from "../backend-node/src/routes/api.js";

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let initialized = false;
app.use(async (req, res, next) => {
  if (!initialized) {
    await initServices();
    initialized = true;
  }
  next();
});

// Mount /api routes
app.use("/api", apiRouter);

// Root health check
app.get("/", (req, res) => {
  res.json({
    message: "Quran Verse Identifier Serverless API",
    status: "running"
  });
});

export default app;
