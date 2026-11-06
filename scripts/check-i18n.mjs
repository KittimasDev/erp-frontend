#!/usr/bin/env node
/**
 * ตรวจคำแปล i18n
 *   node scripts/check-i18n.mjs [คำกรองพาธ ...]
 *
 * 1) ข้อความไทยที่เรียกผ่าน t("...") / tr("...") / tNow("...") แต่ไม่มีคีย์ใน src/lib/i18n/messages/**
 *    (ไม่ใช่ error ตอนรัน เพราะ fallback เป็นไทย — แต่แปลว่าหน้านั้นยังแปลไม่ครบ)
 * 2) คีย์ที่ซ้ำข้ามไฟล์คำแปลโดยคำแปลไม่ตรงกัน (ไฟล์ท้ายสุดใน en.ts ชนะ ทำให้คำแปลเงียบ ๆ เพี้ยนได้)
 *
 * ใส่คำกรองพาธ (เช่น purchase-orders weighbridge) เพื่อรายงานเฉพาะไฟล์ที่พาธมีคำนั้น · exit 1 ถ้ามีรายการขาด
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
const filters = process.argv.slice(2);
const THAI = /[\u0E00-\u0E7F]/;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const unescapeKey = (s) => s.replace(/\\(["\\])/g, "$1").replace(/\\n/g, "\n");

// 1) โหลดคีย์จากไฟล์คำแปล
const messagesDir = path.join(root, "lib", "i18n", "messages");
const keyRe = /^\s*"((?:[^"\\]|\\.)*)"\s*:\s*(.*)$/;
const known = new Map(); // key -> { file, value }
const conflicts = [];
for (const file of walk(messagesDir)) {
  if (path.basename(file) === "en.ts") continue; // ดัชนี
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    const m = line.match(keyRe);
    if (!m) return;
    let value = m[2].trim();
    if (!value) value = (lines[i + 1] ?? "").trim(); // ค่าขึ้นบรรทัดใหม่
    const key = unescapeKey(m[1]);
    const prev = known.get(key);
    if (prev && prev.file !== file && prev.value !== value) {
      conflicts.push({ key, a: path.relative(root, prev.file), b: path.relative(root, file), av: prev.value, bv: value });
    }
    known.set(key, { file, value });
  });
}

// 2) สแกนการเรียกใช้
const callRe = /\b(?:t|tr|tNow)\(\s*"((?:[^"\\]|\\.)*)"/g;
const missing = new Map(); // "file :: key"
for (const file of walk(root)) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  if (rel.startsWith("lib/i18n/")) continue;
  if (filters.length && !filters.some((f) => rel.includes(f))) continue;
  const src = fs.readFileSync(file, "utf8");
  for (const m of src.matchAll(callRe)) {
    const key = unescapeKey(m[1]);
    if (!THAI.test(key)) continue;
    if (!known.has(key)) missing.set(`${rel} :: ${key}`, true);
  }
}

if (conflicts.length) {
  console.log(`คีย์ซ้ำข้ามไฟล์ที่คำแปลไม่ตรงกัน (${conflicts.length}):`);
  for (const c of conflicts) console.log(`  "${c.key}"\n    ${c.a}: ${c.av}\n    ${c.b}: ${c.bv}`);
}
if (missing.size) {
  console.log(`\nข้อความที่ยังไม่มีคำแปล (${missing.size}):`);
  for (const k of missing.keys()) console.log("  " + k);
  process.exitCode = 1;
} else {
  console.log(filters.length ? `คำแปลครบ (กรอง: ${filters.join(", ")})` : "คำแปลครบทุกจุดที่เรียกผ่าน t()");
}
