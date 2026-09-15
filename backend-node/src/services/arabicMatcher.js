/**
 * High-performance Arabic text normalization and fuzzy matcher.
 * Matches live speech transcripts or Arabic text against 6,236 Quran verses.
 */

// Strip diacritics / tashkeel & Quranic annotation marks
const TASHKEEL_REGEX = /[\u0617-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g;

export function normalizeArabic(text) {
  if (!text) return "";

  return text
    .replace(TASHKEEL_REGEX, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ـ/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fast Levenshtein distance
 */
function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = [];
  for (let i = 0; i <= b.length; i++) row[i] = i;

  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const val = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1], prev, row[j]) + 1;
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

/**
 * Token Set Ratio (similar to RapidFuzz token_set_ratio)
 */
function tokenSetRatio(str1, str2) {
  const set1 = new Set(str1.split(" ").filter(Boolean));
  const set2 = new Set(str2.split(" ").filter(Boolean));

  const intersection = [];
  for (const s of set1) {
    if (set2.has(s)) intersection.push(s);
  }

  const sInter = intersection.sort().join(" ");
  const sDiff1 = [...set1].filter(x => !set2.has(x)).sort().join(" ");
  const sDiff2 = [...set2].filter(x => !set1.has(x)).sort().join(" ");

  const combined1 = [sInter, sDiff1].filter(Boolean).join(" ");
  const combined2 = [sInter, sDiff2].filter(Boolean).join(" ");

  const r1 = stringRatio(sInter, combined1);
  const r2 = stringRatio(sInter, combined2);
  const r3 = stringRatio(combined1, combined2);

  return Math.max(r1, r2, r3);
}

function stringRatio(s1, s2) {
  if (!s1 || !s2) return 0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 100;
  const dist = levenshteinDistance(s1, s2);
  return Math.max(0, ((maxLen - dist) / maxLen) * 100);
}

export class ArabicMatcher {
  constructor(getAllVersesFn) {
    this.getAllVersesFn = getAllVersesFn;
    this.corpus = [];
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized && this.corpus.length > 0) return;

    const rows = await this.getAllVersesFn();
    this.corpus = rows.map(r => {
      const normText = normalizeArabic(r.arabic_text);
      return {
        id: r.id,
        surah_number: r.surah_number,
        ayah_number: r.ayah_number,
        arabic_text: r.arabic_text,
        english_translation: r.english_translation || "",
        transliteration: r.transliteration || "",
        fingerprint_data: r.fingerprint_data || "",
        surah_name_arabic: r.surah_name_arabic || "",
        surah_name_english: r.surah_name_english || "",
        revelation_type: r.revelation_type || "",
        normalized_text: normText
      };
    });

    this.isInitialized = true;
    console.log(`[ArabicMatcher] Initialized ${this.corpus.length} Quran verses in memory.`);
  }

  matchText(query, limit = 5, minConfidence = 0.35) {
    if (!query || !query.trim()) return [];

    const normQuery = normalizeArabic(query.trim());
    if (!normQuery || normQuery.length < 2) return [];

    const candidates = [];

    for (let i = 0; i < this.corpus.length; i++) {
      const entry = this.corpus[i];
      const target = entry.normalized_text;
      if (!target) continue;

      let score = 0;

      if (normQuery === target) {
        score = 100.0;
      } else if (target.includes(normQuery)) {
        const coverage = normQuery.length / target.length;
        score = 85.0 + (coverage * 15.0);
      } else if (normQuery.includes(target)) {
        const coverage = target.length / normQuery.length;
        score = 85.0 + (coverage * 15.0);
      } else {
        const tokenScore = tokenSetRatio(normQuery, target);
        if (tokenScore > 50) {
          const ratio = stringRatio(normQuery, target);
          score = (tokenScore * 0.6) + (ratio * 0.4);
        } else {
          score = tokenScore * 0.8;
        }
      }

      const confidence = Math.round(Math.min(score / 100.0, 1.0) * 1000) / 1000;
      if (confidence >= minConfidence) {
        candidates.push({
          verse: {
            id: entry.id,
            surah_number: entry.surah_number,
            ayah_number: entry.ayah_number,
            arabic_text: entry.arabic_text,
            english_translation: entry.english_translation,
            transliteration: entry.transliteration,
            fingerprint_data: entry.fingerprint_data,
            surah_name_arabic: entry.surah_name_arabic,
            surah_name_english: entry.surah_name_english,
            revelation_type: entry.revelation_type
          },
          confidence,
          similarity_score: confidence,
          recognition_source: "speech_recognition"
        });
      }
    }

    candidates.sort((a, b) => b.confidence - a.confidence);
    return candidates.slice(0, limit);
  }
}
