// Generates public/states/{code}.svg silhouettes for the State Capitals pack.
// Source paths: @svg-maps/usa (MIT). Rerun only if that package updates:
//   node scripts/generateStateShapes.mjs
import usa from "@svg-maps/usa";
import bounds from "svg-path-bounds";
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = new URL("../public/states/", import.meta.url);
mkdirSync(OUT, { recursive: true });

const FILL = "#dbe7f3"; // light slate — reads well on the app's navy background

let count = 0;
for (const loc of usa.locations) {
  const [minX, minY, maxX, maxY] = bounds(loc.path);
  const w = maxX - minX;
  const h = maxY - minY;
  const pad = Math.max(w, h) * 0.04;
  const viewBox = `${(minX - pad).toFixed(2)} ${(minY - pad).toFixed(2)} ${(w + 2 * pad).toFixed(2)} ${(h + 2 * pad).toFixed(2)}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><path d="${loc.path}" fill="${FILL}"/></svg>\n`;
  writeFileSync(new URL(`${loc.id}.svg`, OUT), svg);
  count++;
}
console.log(`wrote ${count} state silhouettes to public/states/`);
