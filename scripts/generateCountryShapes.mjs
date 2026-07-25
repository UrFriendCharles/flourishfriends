// Generates public/shapes/{code}.svg silhouettes for the Guess the Country pack.
// Source paths: @svg-maps/world (MIT). Rerun only if that package updates:
//   node scripts/generateCountryShapes.mjs
// Each country is cropped to its own bounding box so tiny nations still fill
// the frame (same approach as generateStateShapes.mjs).
import world from "@svg-maps/world";
import bounds from "svg-path-bounds";
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = new URL("../public/shapes/", import.meta.url);
mkdirSync(OUT, { recursive: true });

const FILL = "#dbe7f3"; // light slate — reads well on the app's navy background

let count = 0;
const skipped = [];
for (const loc of world.locations) {
  if (!loc.path || !loc.id) continue;
  let box;
  try {
    box = bounds(loc.path);
  } catch {
    skipped.push(loc.id);
    continue;
  }
  const [minX, minY, maxX, maxY] = box;
  const w = maxX - minX;
  const h = maxY - minY;
  if (!(w > 0) || !(h > 0)) {
    skipped.push(loc.id);
    continue;
  }
  const pad = Math.max(w, h) * 0.06;
  const viewBox = `${(minX - pad).toFixed(2)} ${(minY - pad).toFixed(2)} ${(w + 2 * pad).toFixed(2)} ${(h + 2 * pad).toFixed(2)}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><path d="${loc.path}" fill="${FILL}"/></svg>\n`;
  writeFileSync(new URL(`${loc.id.toLowerCase()}.svg`, OUT), svg);
  count++;
}
console.log(`wrote ${count} country silhouettes to public/shapes/`);
if (skipped.length) console.log(`skipped ${skipped.length}:`, skipped.join(", "));
