import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(root, "data/config/audio-catalog.json");
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const entries = catalog.audio;
if (!Array.isArray(entries) || entries.length === 0) throw new Error("audio catalog is empty");

const ids = new Set();
const webPaths = new Set();
const androidResources = new Set();
for (const entry of entries) {
  for (const key of ["id", "category", "webPath"]) {
    if (typeof entry[key] !== "string" || !entry[key]) throw new Error(`invalid ${key} in audio entry`);
  }
  if (ids.has(entry.id)) throw new Error(`duplicate audio id: ${entry.id}`);
  if (webPaths.has(entry.webPath)) throw new Error(`duplicate audio path: ${entry.webPath}`);
  ids.add(entry.id);
  webPaths.add(entry.webPath);
  if (!entry.webPath.startsWith("audio/") || entry.webPath.includes("..")) throw new Error(`unsafe audio path: ${entry.webPath}`);
  const absolute = path.join(root, entry.webPath);
  if (!fs.statSync(absolute, { throwIfNoEntry: false })?.isFile()) throw new Error(`missing audio file: ${entry.webPath}`);
  if (entry.category === "adhkar" && entry.bundled) throw new Error(`long adhkar must remain optional: ${entry.id}`);
  if (entry.androidResource !== null) {
    if (!entry.bundled || !/^[a-z][a-z0-9_]*$/.test(entry.androidResource)) throw new Error(`invalid Android resource policy: ${entry.id}`);
    if (androidResources.has(entry.androidResource)) throw new Error(`duplicate Android resource: ${entry.androidResource}`);
    androidResources.add(entry.androidResource);
  }
}

const rootAudio = fs.readdirSync(path.join(root, "audio"), { withFileTypes: true }).filter(entry => entry.isFile());
if (rootAudio.length) throw new Error(`audio files must be categorized: ${rootAudio.map(entry => entry.name).join(", ")}`);

console.log(`Audio catalog valid: ${entries.length} entries, ${androidResources.size} Android resources.`);
