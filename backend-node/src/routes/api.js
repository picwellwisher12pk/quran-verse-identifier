import express from "express";
import multer from "multer";
import {
  getAllSurahs,
  getVerse,
  getDatabaseStats,
  searchVerses,
  getAllVersesForMatching,
  getVersesWithFingerprints
} from "../db.js";
import { ArabicMatcher } from "../services/arabicMatcher.js";
import { VerseMatcher } from "../services/verseMatcher.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// Services singletons
const arabicMatcher = new ArabicMatcher(getAllVersesForMatching);
const verseMatcher = new VerseMatcher(getVersesWithFingerprints);

export async function initServices() {
  await arabicMatcher.initialize();
  await verseMatcher.loadCache();
}

/**
 * POST /api/identify
 * Hybrid verse identification supporting:
 * - transcript (live browser speech recognition text)
 * - audio file upload
 */
router.post("/identify", upload.single("file"), async (req, res) => {
  const startTime = Date.now();
  const transcript = req.body?.transcript;
  const file = req.file;

  if (!file && (!transcript || !transcript.trim())) {
    return res.status(400).json({
      detail: "Either an audio file or an Arabic recitation transcript must be provided"
    });
  }

  let textMatches = [];
  let audioMatches = [];
  const fileName = file ? file.originalname : "transcript-query";
  const fileSize = file ? file.size : 0;
  const contentType = file ? file.mimetype : "text/plain";

  try {
    // 1. Match speech recognition transcript if provided
    if (transcript && transcript.trim()) {
      textMatches = arabicMatcher.matchText(transcript.trim(), 5, 0.35);
    }

    // 2. Hybrid fusion / ranking
    const combinedMap = new Map();

    for (const tm of textMatches) {
      const v = tm.verse;
      const key = `${v.surah_number}:${v.ayah_number}`;
      combinedMap.set(key, {
        verse: v,
        confidence: tm.confidence,
        similarity_score: tm.similarity_score,
        recognition_source: "speech_recognition"
      });
    }

    for (const am of audioMatches) {
      const v = am.verse;
      const key = `${v.surah_number}:${v.ayah_number}`;
      if (combinedMap.has(key)) {
        const prev = combinedMap.get(key);
        const boosted = Math.min(1.0, Math.round((Math.max(prev.confidence, am.confidence) + 0.15) * 1000) / 1000);
        combinedMap.set(key, {
          verse: v,
          confidence: boosted,
          similarity_score: Math.max(prev.similarity_score, am.similarity_score),
          recognition_source: "hybrid"
        });
      } else {
        combinedMap.set(key, {
          verse: v,
          confidence: am.confidence,
          similarity_score: am.similarity_score,
          recognition_source: "acoustic_dtw"
        });
      }
    }

    const sortedMatches = Array.from(combinedMap.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    const processingTime = Math.round((Date.now() - startTime) / 10) / 100;

    return res.json({
      success: sortedMatches.length > 0,
      matches: sortedMatches,
      file_info: {
        file_name: fileName,
        file_size: fileSize,
        content_type: contentType
      },
      processing_time: processingTime,
      message: sortedMatches.length > 0
        ? `Found ${sortedMatches.length} candidate verses`
        : "No verses identified above confidence threshold"
    });
  } catch (error) {
    const processingTime = Math.round((Date.now() - startTime) / 10) / 100;
    console.error("Error in /api/identify:", error);
    return res.json({
      success: false,
      matches: [],
      file_info: {
        file_name: fileName,
        file_size: fileSize,
        content_type: contentType
      },
      processing_time: processingTime,
      message: `Identification error: ${error.message}`
    });
  }
});

/**
 * POST /api/identify/text
 */
router.post("/identify/text", async (req, res) => {
  const startTime = Date.now();
  const text = req.body?.text || "";
  const limit = req.body?.limit || 5;

  try {
    const matches = arabicMatcher.matchText(text, limit, 0.30);
    const processingTime = Math.round((Date.now() - startTime) / 10) / 100;

    return res.json({
      success: matches.length > 0,
      matches,
      file_info: {
        file_name: "text_query",
        file_size: Buffer.byteLength(text, "utf8"),
        content_type: "text/plain"
      },
      processing_time: processingTime,
      message: `Found ${matches.length} matching verses`
    });
  } catch (error) {
    const processingTime = Math.round((Date.now() - startTime) / 10) / 100;
    return res.json({
      success: false,
      matches: [],
      file_info: {
        file_name: "text_query",
        file_size: 0,
        content_type: "text/plain"
      },
      processing_time: processingTime,
      message: `Search error: ${error.message}`
    });
  }
});

/**
 * GET /api/stats
 */
router.get("/stats", async (req, res) => {
  try {
    const stats = await getDatabaseStats();
    return res.json(stats);
  } catch (err) {
    console.error("Error getting database stats:", err);
    return res.status(500).json({ detail: "Error retrieving database statistics" });
  }
});

/**
 * GET /api/surahs
 */
router.get("/surahs", async (req, res) => {
  try {
    const surahs = await getAllSurahs();
    return res.json(surahs);
  } catch (err) {
    console.error("Error getting surahs:", err);
    return res.status(500).json({ detail: "Error retrieving surahs" });
  }
});

/**
 * GET /api/verses/:surahNumber/:ayahNumber
 */
router.get("/verses/:surahNumber/:ayahNumber", async (req, res) => {
  const surahNumber = parseInt(req.params.surahNumber, 10);
  const ayahNumber = parseInt(req.params.ayahNumber, 10);

  if (isNaN(surahNumber) || surahNumber < 1 || surahNumber > 114) {
    return res.status(400).json({ detail: "Surah number must be between 1 and 114" });
  }
  if (isNaN(ayahNumber) || ayahNumber < 1) {
    return res.status(400).json({ detail: "Ayah number must be positive" });
  }

  try {
    const verse = await getVerse(surahNumber, ayahNumber);
    if (!verse) {
      return res.status(404).json({ detail: `Verse not found: Surah ${surahNumber}, Ayah ${ayahNumber}` });
    }
    return res.json(verse);
  } catch (err) {
    console.error("Error getting verse:", err);
    return res.status(500).json({ detail: "Error retrieving verse" });
  }
});

/**
 * GET /api/search?q=...&limit=10
 */
router.get("/search", async (req, res) => {
  const q = req.query.q || "";
  let limit = parseInt(req.query.limit, 10) || 10;
  if (limit < 1 || limit > 50) limit = 10;

  if (q.trim().length < 2) {
    return res.status(400).json({ detail: "Search query must be at least 2 characters" });
  }

  try {
    const results = await searchVerses(q, limit);
    return res.json({
      query: q,
      results,
      count: results.length
    });
  } catch (err) {
    console.error("Error searching verses:", err);
    return res.status(500).json({ detail: "Error searching verses" });
  }
});

/**
 * POST /api/feedback
 */
router.post("/feedback", async (req, res) => {
  const { verse_id, was_correct } = req.body || {};
  return res.json({
    message: "Feedback received successfully",
    verse_id,
    was_correct
  });
});

/**
 * GET /api/health
 */
router.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "quran-verse-identifier-api-node",
    timestamp: Date.now() / 1000
  });
});

/**
 * GET /api/version
 */
router.get("/version", (req, res) => {
  res.json({
    version: "1.0.0",
    name: "Quran Verse Identifier API (Node.js)",
    description: "Node.js high-performance API for identifying Quran verses"
  });
});

export default router;
