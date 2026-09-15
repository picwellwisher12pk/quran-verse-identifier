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

// Services singletons
const arabicMatcher = new ArabicMatcher(getAllVersesForMatching);
const verseMatcher = new VerseMatcher(getVersesWithFingerprints);

export async function initServices() {
  await arabicMatcher.initialize();
  await verseMatcher.loadCache();
}

export async function apiRoutes(fastify, options) {
  /**
   * POST /api/identify
   * Fastify multipart & transcript handler
   */
  fastify.post("/identify", async (req, reply) => {
    const startTime = Date.now();
    let transcript = "";
    let fileName = "transcript-query";
    let fileSize = 0;
    let contentType = "text/plain";

    if (req.isMultipart()) {
      const parts = req.parts();
      for await (const part of parts) {
        if (part.type === "file" && part.fieldname === "file") {
          fileName = part.filename;
          contentType = part.mimetype;
          const buffer = await part.toBuffer();
          fileSize = buffer.length;
        } else if (part.type === "field" && part.fieldname === "transcript") {
          transcript = part.value;
        }
      }
    } else {
      transcript = req.body?.transcript || "";
    }

    if (!fileSize && (!transcript || !transcript.trim())) {
      reply.code(400);
      return {
        detail: "Either an audio file or an Arabic recitation transcript must be provided"
      };
    }

    let textMatches = [];
    let audioMatches = [];

    try {
      if (transcript && transcript.trim()) {
        textMatches = arabicMatcher.matchText(transcript.trim(), 5, 0.35);
      }

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

      return {
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
      };
    } catch (error) {
      const processingTime = Math.round((Date.now() - startTime) / 10) / 100;
      return {
        success: false,
        matches: [],
        file_info: {
          file_name: fileName,
          file_size: fileSize,
          content_type: contentType
        },
        processing_time: processingTime,
        message: `Identification error: ${error.message}`
      };
    }
  });

  /**
   * POST /api/identify/text
   */
  fastify.post("/identify/text", async (req, reply) => {
    const startTime = Date.now();
    const text = req.body?.text || "";
    const limit = req.body?.limit || 5;

    try {
      const matches = arabicMatcher.matchText(text, limit, 0.30);
      const processingTime = Math.round((Date.now() - startTime) / 10) / 100;

      return {
        success: matches.length > 0,
        matches,
        file_info: {
          file_name: "text_query",
          file_size: Buffer.byteLength(text, "utf8"),
          content_type: "text/plain"
        },
        processing_time: processingTime,
        message: `Found ${matches.length} matching verses`
      };
    } catch (error) {
      const processingTime = Math.round((Date.now() - startTime) / 10) / 100;
      return {
        success: false,
        matches: [],
        file_info: {
          file_name: "text_query",
          file_size: 0,
          content_type: "text/plain"
        },
        processing_time: processingTime,
        message: `Search error: ${error.message}`
      };
    }
  });

  /**
   * GET /api/stats
   */
  fastify.get("/stats", async (req, reply) => {
    try {
      return await getDatabaseStats();
    } catch (err) {
      reply.code(500);
      return { detail: "Error retrieving database statistics" };
    }
  });

  /**
   * GET /api/surahs
   */
  fastify.get("/surahs", async (req, reply) => {
    try {
      return await getAllSurahs();
    } catch (err) {
      reply.code(500);
      return { detail: "Error retrieving surahs" };
    }
  });

  /**
   * GET /api/verses/:surahNumber/:ayahNumber
   */
  fastify.get("/verses/:surahNumber/:ayahNumber", async (req, reply) => {
    const surahNumber = parseInt(req.params.surahNumber, 10);
    const ayahNumber = parseInt(req.params.ayahNumber, 10);

    if (isNaN(surahNumber) || surahNumber < 1 || surahNumber > 114) {
      reply.code(400);
      return { detail: "Surah number must be between 1 and 114" };
    }
    if (isNaN(ayahNumber) || ayahNumber < 1) {
      reply.code(400);
      return { detail: "Ayah number must be positive" };
    }

    try {
      const verse = await getVerse(surahNumber, ayahNumber);
      if (!verse) {
        reply.code(404);
        return { detail: `Verse not found: Surah ${surahNumber}, Ayah ${ayahNumber}` };
      }
      return verse;
    } catch (err) {
      reply.code(500);
      return { detail: "Error retrieving verse" };
    }
  });

  /**
   * GET /api/search?q=...&limit=10
   */
  fastify.get("/search", async (req, reply) => {
    const q = req.query.q || "";
    let limit = parseInt(req.query.limit, 10) || 10;
    if (limit < 1 || limit > 50) limit = 10;

    if (q.trim().length < 2) {
      reply.code(400);
      return { detail: "Search query must be at least 2 characters" };
    }

    try {
      const results = await searchVerses(q, limit);
      return {
        query: q,
        results,
        count: results.length
      };
    } catch (err) {
      reply.code(500);
      return { detail: "Error searching verses" };
    }
  });

  /**
   * POST /api/feedback
   */
  fastify.post("/feedback", async (req, reply) => {
    const { verse_id, was_correct } = req.body || {};
    return {
      message: "Feedback received successfully",
      verse_id,
      was_correct
    };
  });

  /**
   * GET /api/health
   */
  fastify.get("/health", async () => {
    return {
      status: "healthy",
      service: "quran-verse-identifier-api-fastify",
      timestamp: Date.now() / 1000
    };
  });

  /**
   * GET /api/version
   */
  fastify.get("/version", async () => {
    return {
      version: "1.0.0",
      framework: "Fastify 5",
      name: "Quran Verse Identifier API",
      description: "High-throughput Fastify API for identifying Quran verses"
    };
  });
}
