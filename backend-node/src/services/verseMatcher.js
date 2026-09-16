/**
 * Verse Matcher for Node.js
 * Implements Tier-1 Summary Vector cosine similarity and DTW alignment
 * using pre-stored fingerprints in quran.db.
 */

function cosineSimilarity(v1, v2) {
  if (!v1 || !v2 || v1.length !== v2.length) return 0;
  let dot = 0;
  let n1 = 0;
  let n2 = 0;
  for (let i = 0; i < v1.length; i++) {
    dot += v1[i] * v2[i];
    n1 += v1[i] * v1[i];
    n2 += v2[i] * v2[i];
  }
  const norm1 = Math.sqrt(n1);
  const norm2 = Math.sqrt(n2);
  if (norm1 === 0 || norm2 === 0) return 0;
  const cos = dot / (norm1 * norm2);
  return Math.max(0, Math.min(1, (cos + 1) / 2));
}

function euclideanDist(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Fast DTW approximation for temporal MFCC frame sequences
 */
function fastDtwDistance(seq1, seq2) {
  const n = seq1.length;
  const m = seq2.length;
  if (!n || !m) return Infinity;

  // Keep sequences bounded for speed
  let s1 = seq1;
  let s2 = seq2;
  if (n > 200) {
    const step = Math.ceil(n / 200);
    s1 = seq1.filter((_, idx) => idx % step === 0);
  }
  if (m > 200) {
    const step = Math.ceil(m / 200);
    s2 = seq2.filter((_, idx) => idx % step === 0);
  }

  const l1 = s1.length;
  const l2 = s2.length;
  const dp = new Float32Array(l2);

  // Initialize first row
  dp[0] = euclideanDist(s1[0], s2[0]);
  for (let j = 1; j < l2; j++) {
    dp[j] = dp[j - 1] + euclideanDist(s1[0], s2[j]);
  }

  for (let i = 1; i < l1; i++) {
    let prevDiag = dp[0];
    dp[0] = dp[0] + euclideanDist(s1[i], s2[0]);

    for (let j = 1; j < l2; j++) {
      const temp = dp[j];
      const cost = euclideanDist(s1[i], s2[j]);
      dp[j] = cost + Math.min(dp[j], dp[j - 1], prevDiag);
      prevDiag = temp;
    }
  }

  return dp[l2 - 1];
}

export class VerseMatcher {
  constructor(getFingerprintedVersesFn, options = {}) {
    this.getFingerprintedVersesFn = getFingerprintedVersesFn;
    this.minConfidence = options.minConfidence || 0.25;
    this.maxResults = options.maxResults || 5;
    this.cachedVerses = [];
  }

  async loadCache() {
    if (this.cachedVerses.length > 0) return;
    const rows = await this.getFingerprintedVersesFn();
    this.cachedVerses = rows.map(r => {
      let fpObj = null;
      try {
        fpObj = JSON.parse(r.fingerprint_data);
      } catch (e) {
        // ignore invalid json
      }
      return {
        ...r,
        parsed_fingerprint: fpObj
      };
    }).filter(v => v.parsed_fingerprint != null);

    console.log(`[VerseMatcher] Pre-cached ${this.cachedVerses.length} fingerprinted verses.`);
  }

  async findMatches(queryFingerprint) {
    await this.loadCache();
    if (!this.cachedVerses.length) return [];

    let queryObj = queryFingerprint;
    if (typeof queryFingerprint === "string") {
      try {
        queryObj = JSON.parse(queryFingerprint);
      } catch (e) {
        return [];
      }
    }

    const qFeatures = queryObj?.features || {};
    const qSummary = qFeatures.summary_vector;
    const qTemporal = qFeatures.temporal_frames;

    // --- TIER 1: Fast Summary Vector Ranking ---
    const scored = [];
    for (const item of this.cachedVerses) {
      const storedFeatures = item.parsed_fingerprint?.features || {};
      const storedSummary = storedFeatures.summary_vector;
      let score = 0.5;

      if (qSummary && storedSummary) {
        score = cosineSimilarity(qSummary, storedSummary);
      }

      scored.push({ item, score, storedFeatures });
    }

    scored.sort((a, b) => b.score - a.score);
    const topCandidates = scored.slice(0, 20);

    // --- TIER 2: Temporal Frame Alignment ---
    const results = [];
    for (const cand of topCandidates) {
      const { item, score: summarySim, storedFeatures } = cand;
      const storedTemporal = storedFeatures.temporal_frames;

      let dtwSim = summarySim;
      if (qTemporal && storedTemporal && qTemporal.length > 2 && storedTemporal.length > 2) {
        try {
          const rawDist = fastDtwDistance(qTemporal, storedTemporal);
          const avgLen = (qTemporal.length + storedTemporal.length) / 2.0;
          const dim = qTemporal[0]?.length || 13;
          const normalizedDist = rawDist / (avgLen * dim * 20.0 + 1e-6);
          dtwSim = Math.exp(-normalizedDist);
        } catch (e) {
          dtwSim = summarySim;
        }
      }

      const dur1 = qFeatures.duration || 0;
      const dur2 = storedFeatures.duration || 0;
      let durSim = 1.0;
      if (dur1 > 0 && dur2 > 0) {
        durSim = Math.min(dur1, dur2) / Math.max(dur1, dur2);
      }

      const blendedScore = (0.55 * dtwSim) + (0.35 * summarySim) + (0.10 * durSim);
      const confidence = Math.round(Math.max(0, Math.min(1, blendedScore)) * 1000) / 1000;

      if (confidence >= this.minConfidence) {
        results.push({
          verse: {
            id: item.id,
            surah_number: item.surah_number,
            ayah_number: item.ayah_number,
            arabic_text: item.arabic_text,
            english_translation: item.english_translation,
            transliteration: item.transliteration,
            urdu_translation: item.urdu_translation,
            surah_name_arabic: item.surah_name_arabic,
            surah_name_english: item.surah_name_english,
            revelation_type: item.revelation_type
          },
          confidence,
          similarity_score: confidence,
          recognition_source: "acoustic_dtw"
        });
      }
    }

    results.sort((a, b) => b.confidence - a.confidence);
    return results.slice(0, this.maxResults);
  }
}
