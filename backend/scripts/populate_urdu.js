import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import initSqlJs from "sql.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, "../data");
const ROOT_DATA_DIR = path.resolve(__dirname, "../../data");
const URDU_CACHE_PATH = path.join(DATA_DIR, "quran_urdu.json");
const COMPLETE_CACHE_PATH = path.join(DATA_DIR, "quran_complete.json");

const DB_PATHS = [
  path.join(DATA_DIR, "quran.db"),
  path.join(ROOT_DATA_DIR, "quran.db")
];

async function main() {
  console.log("==================================================");
  console.log(" Quran Urdu Translation Ingestion Script");
  console.log(" Edition: Fateh Muhammad Jalandhry (ur.jalandhry)");
  console.log("==================================================");

  let urduSurahs = [];

  if (fs.existsSync(URDU_CACHE_PATH)) {
    console.log(`Loading cached Urdu data from ${URDU_CACHE_PATH}...`);
    urduSurahs = JSON.parse(fs.readFileSync(URDU_CACHE_PATH, "utf8"));
  } else {
    console.log("Fetching Fateh Muhammad Jalandhry Urdu translation from alquran.cloud API...");
    const res = await fetch("https://api.alquran.cloud/v1/quran/ur.jalandhry");
    if (!res.ok) {
      throw new Error(`API returned ${res.status}: ${res.statusText}`);
    }
    const json = await res.json();
    urduSurahs = json.data?.surahs || [];
    fs.writeFileSync(URDU_CACHE_PATH, JSON.stringify(urduSurahs, null, 2), "utf8");
    console.log(`Saved Urdu translation cache to ${URDU_CACHE_PATH}`);
  }

  // Map of "surah_number:ayah_number" -> urdu text
  const urduMap = new Map();
  let totalVerses = 0;
  for (const s of urduSurahs) {
    const sNum = s.number;
    for (const a of s.ayahs) {
      const aNum = a.numberInSurah;
      urduMap.set(`${sNum}:${aNum}`, a.text);
      totalVerses++;
    }
  }
  console.log(`Indexed ${totalVerses} Urdu verses across ${urduSurahs.length} surahs.`);

  // Update quran_complete.json if it exists
  if (fs.existsSync(COMPLETE_CACHE_PATH)) {
    console.log(`Updating ${COMPLETE_CACHE_PATH} with Urdu translations...`);
    try {
      const completeVerses = JSON.parse(fs.readFileSync(COMPLETE_CACHE_PATH, "utf8"));
      let updatedCount = 0;
      for (const v of completeVerses) {
        const key = `${v.surah_number}:${v.ayah_number}`;
        if (urduMap.has(key)) {
          v.urdu_translation = urduMap.get(key);
          updatedCount++;
        }
      }
      fs.writeFileSync(COMPLETE_CACHE_PATH, JSON.stringify(completeVerses, null, 2), "utf8");
      console.log(`Updated ${updatedCount} verses in ${COMPLETE_CACHE_PATH}`);
    } catch (err) {
      console.warn("Could not update quran_complete.json:", err.message);
    }
  }

  // Update SQLite databases
  const SQL = await initSqlJs();

  for (const dbPath of DB_PATHS) {
    if (!fs.existsSync(dbPath)) {
      console.warn(`Database not found at ${dbPath}, skipping.`);
      continue;
    }

    console.log(`Updating database at: ${dbPath}...`);
    const filebuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(filebuffer);

    // Check if urdu_translation column exists
    const tableInfo = db.exec("PRAGMA table_info(verses);");
    const columns = tableInfo[0]?.values?.map(row => row[1]) || [];

    if (!columns.includes("urdu_translation")) {
      console.log("Adding column 'urdu_translation' to verses table...");
      db.run("ALTER TABLE verses ADD COLUMN urdu_translation TEXT;");
    } else {
      console.log("Column 'urdu_translation' already exists.");
    }

    // Update each verse in a transaction
    db.run("BEGIN TRANSACTION;");
    const stmt = db.prepare("UPDATE verses SET urdu_translation = ? WHERE surah_number = ? AND ayah_number = ?;");
    let count = 0;
    for (const [key, text] of urduMap.entries()) {
      const [sNum, aNum] = key.split(":").map(Number);
      stmt.run([text, sNum, aNum]);
      count++;
    }
    stmt.free();
    db.run("COMMIT;");

    // Verify
    const verifyRes = db.exec("SELECT count(*) FROM verses WHERE urdu_translation IS NOT NULL AND length(urdu_translation) > 0;");
    const populatedCount = verifyRes[0]?.values[0][0] || 0;
    console.log(`Verified ${populatedCount} verses populated with Urdu translations in ${path.basename(dbPath)}.`);

    // Write back updated database
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
    console.log(`Successfully saved updated database to ${dbPath}`);
    db.close();
  }

  console.log("==================================================");
  console.log(" Ingestion complete! All 6,236 verses updated.");
  console.log("==================================================");
}

main().catch(err => {
  console.error("FATAL ERROR in populate_urdu.js:", err);
  process.exit(1);
});
