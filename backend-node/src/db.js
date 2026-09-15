import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Candidate paths for quran.db (local dev, repo structure, or Vercel serverless)
const DB_CANDIDATES = [
  path.resolve(__dirname, "../../backend/data/quran.db"),
  path.resolve(__dirname, "../data/quran.db"),
  path.resolve(process.cwd(), "backend/data/quran.db"),
  path.resolve(process.cwd(), "data/quran.db")
];

let DB_PATH = DB_CANDIDATES.find(p => fs.existsSync(p));

let dbInstance = null;

export async function getDb() {
  if (dbInstance) return dbInstance;

  if (!DB_PATH) {
    DB_PATH = DB_CANDIDATES.find(p => fs.existsSync(p));
  }

  if (!DB_PATH) {
    throw new Error("Cannot find quran.db in any expected paths.");
  }

  // 1. Native Bun SQLite if available
  if (typeof Bun !== "undefined") {
    try {
      const { Database } = await import("bun:sqlite");
      const bunDb = new Database(DB_PATH);
      dbInstance = {
        all: (sql, params = []) => bunDb.query(sql).all(...params),
        get: (sql, params = []) => bunDb.query(sql).get(...params),
        run: (sql, params = []) => bunDb.query(sql).run(...params),
      };
      return dbInstance;
    } catch (e) {
      // fallback
    }
  }

  // 2. Node.js built-in node:sqlite (Node 22+)
  try {
    const { DatabaseSync } = await import("node:sqlite");
    const nodeDb = new DatabaseSync(DB_PATH);
    dbInstance = {
      all: (sql, params = []) => nodeDb.prepare(sql).all(...params),
      get: (sql, params = []) => nodeDb.prepare(sql).get(...params),
      run: (sql, params = []) => nodeDb.prepare(sql).run(...params),
    };
    return dbInstance;
  } catch (err) {
    // 3. Pure WebAssembly sql.js fallback (works everywhere, zero C-compiler or OS dependencies)
    const initSqlJs = (await import("sql.js")).default;
    const SQL = await initSqlJs();
    const filebuffer = fs.readFileSync(DB_PATH);
    const sqlDb = new SQL.Database(filebuffer);
    dbInstance = {
      all: (sql, params = []) => {
        const stmt = sqlDb.prepare(sql);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        return rows;
      },
      get: (sql, params = []) => {
        const stmt = sqlDb.prepare(sql);
        stmt.bind(params);
        let row = null;
        if (stmt.step()) row = stmt.getAsObject();
        stmt.free();
        return row;
      },
      run: (sql, params = []) => sqlDb.run(sql, params)
    };
    return dbInstance;
  }
}

export async function getAllSurahs() {
  const db = await getDb();
  return db.all("SELECT id, number, name_arabic, name_english, revelation_type, ayah_count, created_at FROM surahs ORDER BY number ASC");
}

export async function getVerse(surahNumber, ayahNumber) {
  const db = await getDb();
  return db.get(`
    SELECT v.id, v.surah_number, v.ayah_number, v.arabic_text,
           v.english_translation, v.transliteration, v.fingerprint_data,
           v.created_at, v.updated_at,
           s.name_arabic as surah_name_arabic,
           s.name_english as surah_name_english,
           s.revelation_type
    FROM verses v
    JOIN surahs s ON v.surah_number = s.number
    WHERE v.surah_number = ? AND v.ayah_number = ?
  `, [surahNumber, ayahNumber]);
}

export async function getVersesWithFingerprints() {
  const db = await getDb();
  return db.all(`
    SELECT v.id, v.surah_number, v.ayah_number, v.arabic_text,
           v.english_translation, v.transliteration, v.fingerprint_data,
           s.name_arabic as surah_name_arabic,
           s.name_english as surah_name_english,
           s.revelation_type
    FROM verses v
    JOIN surahs s ON v.surah_number = s.number
    WHERE v.fingerprint_data IS NOT NULL AND length(v.fingerprint_data) > 0
    ORDER BY v.surah_number, v.ayah_number
  `);
}

export async function getAllVersesForMatching() {
  const db = await getDb();
  return db.all(`
    SELECT v.id, v.surah_number, v.ayah_number, v.arabic_text,
           v.english_translation, v.transliteration, v.fingerprint_data,
           s.name_arabic as surah_name_arabic,
           s.name_english as surah_name_english,
           s.revelation_type
    FROM verses v
    JOIN surahs s ON v.surah_number = s.number
    ORDER BY v.surah_number, v.ayah_number
  `);
}

export async function getDatabaseStats() {
  const db = await getDb();
  const surahsRow = db.get("SELECT COUNT(*) as total_surahs FROM surahs");
  const versesRow = db.get("SELECT COUNT(*) as total_verses FROM verses");
  const fpRow = db.get("SELECT COUNT(*) as fingerprinted FROM verses WHERE fingerprint_data IS NOT NULL AND length(fingerprint_data) > 0");

  const totalVerses = versesRow ? versesRow.total_verses : 0;
  const fingerprinted = fpRow ? fpRow.fingerprinted : 0;

  return {
    total_surahs: surahsRow ? surahsRow.total_surahs : 114,
    total_verses: totalVerses,
    fingerprinted_verses: fingerprinted,
    coverage_percentage: totalVerses > 0 ? Math.round((fingerprinted / totalVerses) * 1000) / 10 : 0
  };
}

export async function searchVerses(query, limit = 10) {
  const db = await getDb();
  const term = `%${query.trim()}%`;
  return db.all(`
    SELECT v.id, v.surah_number, v.ayah_number, v.arabic_text,
           v.english_translation, v.transliteration,
           s.name_arabic as surah_name_arabic,
           s.name_english as surah_name_english,
           s.revelation_type
    FROM verses v
    JOIN surahs s ON v.surah_number = s.number
    WHERE v.arabic_text LIKE ?
       OR v.english_translation LIKE ?
       OR v.transliteration LIKE ?
    LIMIT ?
  `, [term, term, term, limit]);
}
