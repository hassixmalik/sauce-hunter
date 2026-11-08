// Usage: DATABASE_URL=... npm run db:init
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

const url = process.env.DATABASE_URL;
if (!url) { console.error("Set DATABASE_URL first"); process.exit(1); }
const sql = neon(url);
const text = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
const statements = text.replace(/--.*$/gm, "").split(";").map((s) => s.trim()).filter(Boolean);
for (const s of statements) await sql.query(s);
console.log(`Ran ${statements.length} statements. Done.`);
