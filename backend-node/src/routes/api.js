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
  // Global route error handler for informative error messages
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);
    const statusCode = error.statusCode || 500;
    const clientMessage =
      error.message ||
      (statusCode === 500
        ? "Internal server processing error. Please try reciting again or check your audio file."
        : "An error occurred while processing your request.");

    reply.code(statusCode).send({
      success: false,
      detail: clientMessage,
      error: error.name || "ServerError",
      statusCode
    });
  });

  /**
   * POST /api/identify
   * Fastify multipart & transcript handler with clear error responses
   */
  fastify.post("/identify", async (req, reply) => {
    const startTime = Date.now();
    let transcript = "";
    let fileName = "transcript-query";
    let fileSize = 0;
    let contentType = "text/plain";

    try {
      if (req.isMultipart()) {
        try {
          const parts = req.parts();
          for await (const part of parts) {
            if (part.type === "file" && part.fieldname === "file") {
              fileName = part.filename || "audio.wav";
              contentType = part.mimetype || "audio/wav";
              const buffer = await part.toBuffer();
              fileSize = buffer.length;
            } else if (part.type === "field" && part.fieldname === "transcript") {
              transcript = part.value || "";
            }
          }
        } catch (mpErr) {
          fastify.log.warn("[Identify] Multipart parse warning: " + mpErr.message);
        }
      } else if (req.body) {
        transcript = req.body.transcript || "";
      }

      console.log(`[API:Identify] Processing request: fileName="${fileName}", fileSize=${fileSize} bytes, transcript="${transcript || ''}"`);

      if (!fileSize && (!transcript || !transcript.trim())) {
        console.warn("[API:Identify] Rejected: Neither audio file nor transcript provided");
        reply.code(400);
        return {
          success: false,
          detail: "Either an audio recitation recording or an Arabic speech transcript must be provided."
        };
      }

      let textMatches = [];
      let audioMatches = [];

      if (transcript && transcript.trim()) {
        const textMatchStart = Date.now();
        textMatches = arabicMatcher.matchText(transcript.trim(), 5, 0.35);
        console.log(`[API:Identify] Arabic text matcher finished in ${Date.now() - textMatchStart}ms: ${textMatches.length} candidates found`);
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
      console.log(`[API:Identify] Completed in ${processingTime}s: ${sortedMatches.length} candidate(s)${sortedMatches[0] ? ` (Top: ${sortedMatches[0].verse.surah_name_english} ${sortedMatches[0].verse.surah_number}:${sortedMatches[0].verse.ayah_number} - confidence ${sortedMatches[0].confidence})` : ''}`);

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
          : "No verses matched above the confidence threshold. Try reciting more clearly or closer to the microphone."
      };
    } catch (error) {
      const processingTime = Math.round((Date.now() - startTime) / 10) / 100;
      console.error(`[API:Identify ERROR] Failed in ${processingTime}s:`, error);
      reply.code(500);
      return {
        success: false,
        detail: `Identification error: ${error.message || "Failed to process audio recording."}`,
        file_info: {
          file_name: fileName,
          file_size: fileSize,
          content_type: contentType
        },
        processing_time: processingTime
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

    if (!text || text.trim().length < 2) {
      reply.code(400);
      return {
        success: false,
        detail: "Please provide at least 2 Arabic characters to search for."
      };
    }

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
        message: matches.length > 0
          ? `Found ${matches.length} matching verses`
          : "No matching verses found for this text query."
      };
    } catch (error) {
      const processingTime = Math.round((Date.now() - startTime) / 10) / 100;
      reply.code(500);
      return {
        success: false,
        detail: `Search error: ${error.message || "Failed to search Quran text database."}`,
        file_info: {
          file_name: "text_query",
          file_size: 0,
          content_type: "text/plain"
        },
        processing_time: processingTime
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
      return { detail: `Error retrieving database statistics: ${err.message}` };
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
      return { detail: `Error retrieving Surahs: ${err.message}` };
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
      return { detail: "Surah number must be an integer between 1 and 114" };
    }
    if (isNaN(ayahNumber) || ayahNumber < 1) {
      reply.code(400);
      return { detail: "Ayah number must be a positive integer" };
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
      return { detail: `Error retrieving verse: ${err.message}` };
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
      return { detail: `Error searching verses: ${err.message}` };
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
      description: "High-throughput Fastify API with descriptive error reporting"
    };
  });
}
