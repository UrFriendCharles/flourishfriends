// Generates the full Flourish Friends "Friends Bunting" logo/icon package.
// Run: node scripts/generateBranding.mjs   (or: npm run gen:branding)
//
// One master vector mark -> favicon.svg, favicon.ico, PNG app icons, PWA
// manifest icons, and the default social share image. Text-bearing assets
// (og image, wordmark) are drawn as SVG and rasterized with sharp.

import sharp from "sharp";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(root, "public");
mkdirSync(pub, { recursive: true });

// ---- Brand palette -------------------------------------------------------
const NAVY = "#0a1128";
const NAVY_HI = "#1a2a5e";
const SKY = "#38bdf8";
const VIOLET = "#863bff";
const ROSE = "#fb7185";
const GOLD = "#fbbf24";
const STRING = "#e2e8f0";

// ---- The mark ------------------------------------------------------------
// A string of three party pennants (sky / violet / rose) hanging from a
// gently sagging line = "friends" gathered together for a flag party.
// Drawn in a 512x512 space; `scale` recenters it for maskable safe zones.
function markGroup(scale = 1) {
  const cx = 256;
  const cy = 250;
  const t = `translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`;
  return `
    <g transform="${t}">
      <path d="M118 214 L196 236 L150 330 Z" fill="${SKY}"/>
      <path d="M220 246 L296 246 L258 340 Z" fill="${VIOLET}"/>
      <path d="M318 236 L396 214 L362 330 Z" fill="${ROSE}"/>
      <circle cx="150" cy="330" r="9" fill="${SKY}"/>
      <circle cx="258" cy="340" r="9" fill="${VIOLET}"/>
      <circle cx="362" cy="330" r="9" fill="${ROSE}"/>
      <path d="M92 196 Q256 268 420 196" fill="none" stroke="${STRING}"
            stroke-width="11" stroke-linecap="round"/>
      <circle cx="92" cy="196" r="8" fill="${GOLD}"/>
      <circle cx="420" cy="196" r="8" fill="${GOLD}"/>
    </g>`;
}

// A rounded-square icon tile: navy gradient background + the mark.
function iconTileSVG(size, { radius = 0.22, mark = 1, bleed = false } = {}) {
  const r = Math.round(size * radius);
  const bg = bleed
    ? `<rect width="${size}" height="${size}" fill="url(#bg)"/>`
    : `<rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="url(#bg)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
    <defs>
      <radialGradient id="bg" cx="50%" cy="18%" r="90%">
        <stop offset="0" stop-color="${NAVY_HI}"/>
        <stop offset="0.65" stop-color="${NAVY}"/>
      </radialGradient>
    </defs>
    ${bg.replace(/512/g, String(size))}
    <g transform="scale(${size / 512})">${markGroup(mark)}</g>
  </svg>`;
}

// Transparent mark only (no tile) — for overlaying on the app UI.
function markOnlySVG(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">${markGroup(1)}</svg>`;
}

const png = (svg, w, h) =>
  sharp(Buffer.from(svg)).resize(w, h ?? w, { fit: "fill" }).png().toBuffer();

// Default social share image (1200x630) used for the home page / any link
// without a personalized score card.
function ogDefaultSVG() {
  const font = `font-family="Segoe UI, Arial, Helvetica, sans-serif"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <radialGradient id="bg" cx="50%" cy="-10%" r="110%">
        <stop offset="0" stop-color="${NAVY_HI}"/>
        <stop offset="0.6" stop-color="${NAVY}"/>
      </radialGradient>
      <linearGradient id="wm" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${SKY}"/>
        <stop offset="0.5" stop-color="${VIOLET}"/>
        <stop offset="1" stop-color="${ROSE}"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <g transform="translate(344 -74)">${markGroup(1.15)}</g>
    <text x="600" y="392" text-anchor="middle" ${font} font-size="88" font-weight="800" fill="#f8fafc">Flourish Friends</text>
    <text x="600" y="470" text-anchor="middle" ${font} font-size="60" font-weight="800" letter-spacing="14" fill="url(#wm)">FLAG QUIZ</text>
    <text x="600" y="540" text-anchor="middle" ${font} font-size="30" font-weight="500" fill="#94a3b8">Guess the country. Beat your friends. Learn the world.</text>
    <text x="600" y="596" text-anchor="middle" ${font} font-size="26" font-weight="600" letter-spacing="3" fill="${GOLD}">FLOURISHFRIENDS.COM</text>
  </svg>`;
}

// ---- Minimal ICO packer (embeds PNG frames, Vista+ format) ---------------
function buildIco(frames) {
  const count = frames.length;
  const header = Buffer.alloc(6 + 16 * count);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  let offset = 6 + 16 * count;
  const bodies = [];
  frames.forEach((f, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(f.size >= 256 ? 0 : f.size, e);
    header.writeUInt8(f.size >= 256 ? 0 : f.size, e + 1);
    header.writeUInt8(0, e + 2);
    header.writeUInt8(0, e + 3);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(f.data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += f.data.length;
    bodies.push(f.data);
  });
  return Buffer.concat([header, ...bodies]);
}

async function main() {
  // favicon.svg — self-contained navy tile so it reads on any browser chrome
  writeFileSync(join(pub, "favicon.svg"), iconTileSVG(512, { radius: 0.22, mark: 1.15 }).trim());

  // PNG app icons
  const jobs = [
    ["favicon-96.png", iconTileSVG(96, { mark: 1.15 }), 96],
    ["apple-touch-icon.png", iconTileSVG(180, { radius: 0, bleed: true, mark: 1.1 }), 180],
    ["icon-192.png", iconTileSVG(192, { mark: 1.15 }), 192],
    ["icon-512.png", iconTileSVG(512, { mark: 1.15 }), 512],
    ["icon-512-maskable.png", iconTileSVG(512, { radius: 0, bleed: true, mark: 0.9 }), 512],
    ["mark.png", markOnlySVG(512), 512],
  ];
  for (const [name, svg, size] of jobs) {
    writeFileSync(join(pub, name), await png(svg, size));
    console.log("wrote", name);
  }

  // favicon.ico (16/32/48)
  const icoFrames = [];
  for (const s of [16, 32, 48]) {
    icoFrames.push({ size: s, data: await png(iconTileSVG(s, { radius: 0.24, mark: 1.15 }), s) });
  }
  writeFileSync(join(pub, "favicon.ico"), buildIco(icoFrames));
  console.log("wrote favicon.ico");

  // Default social share image
  writeFileSync(join(pub, "og-default.png"), await png(ogDefaultSVG(), 1200, 630));
  console.log("wrote og-default.png");

  // PWA manifest
  const manifest = {
    name: "Flourish Friends Flag Quiz",
    short_name: "Flag Quiz",
    description: "Guess the country. Beat your friends. Learn the world.",
    start_url: "/",
    display: "standalone",
    background_color: NAVY,
    theme_color: NAVY,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  writeFileSync(join(pub, "site.webmanifest"), JSON.stringify(manifest, null, 2));
  console.log("wrote site.webmanifest");

  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
