import { Resvg, initWasm } from "@resvg/resvg-wasm";
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm";
import type { ScoreShare } from "../src/types";
import { collectionLabel } from "../src/logic/scoreShareWire";

// Renders a personalized 1200x630 PNG social-preview card for a shared score.
// resvg (WASM) rasterizes a hand-built SVG; the font is served from static
// assets and fetched once per isolate.

let wasmReady: Promise<unknown> | null = null;
function ensureWasm() {
  if (!wasmReady) wasmReady = initWasm(resvgWasm);
  return wasmReady;
}

let fontCache: Uint8Array | null = null;
async function loadFont(assets: Fetcher, origin: string): Promise<Uint8Array | null> {
  if (fontCache) return fontCache;
  const res = await assets.fetch(new Request(`${origin}/fonts/og.ttf`));
  if (!res.ok) return null;
  fontCache = new Uint8Array(await res.arrayBuffer());
  return fontCache;
}

const xml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function cardSVG(share: ScoreShare): string {
  const name = xml(share.playerName);
  const stats =
    `${share.accuracy}% accuracy   •   ${share.correctAnswers}/${share.totalQuestions} ` +
    `${collectionLabel(share.collection)}   •   best streak ${share.bestStreak}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <radialGradient id="bg" cx="50%" cy="-10%" r="110%">
        <stop offset="0" stop-color="#1a2a5e"/><stop offset="0.6" stop-color="#0a1128"/>
      </radialGradient>
      <linearGradient id="score" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#7dd3fc"/><stop offset="0.5" stop-color="#c4b5fd"/><stop offset="1" stop-color="#fda4af"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <g transform="translate(510 42) scale(0.36)">
      <path d="M118 214 L196 236 L150 330 Z" fill="#38bdf8"/>
      <path d="M220 246 L296 246 L258 340 Z" fill="#863bff"/>
      <path d="M318 236 L396 214 L362 330 Z" fill="#fb7185"/>
      <circle cx="150" cy="330" r="9" fill="#38bdf8"/><circle cx="258" cy="340" r="9" fill="#863bff"/><circle cx="362" cy="330" r="9" fill="#fb7185"/>
      <path d="M92 196 Q256 268 420 196" fill="none" stroke="#e2e8f0" stroke-width="11" stroke-linecap="round"/>
      <circle cx="92" cy="196" r="8" fill="#fbbf24"/><circle cx="420" cy="196" r="8" fill="#fbbf24"/>
    </g>
    <text x="600" y="270" text-anchor="middle" font-family="Noto Sans" font-size="46" fill="#e2e8f0">${name} scored</text>
    <text x="600" y="410" text-anchor="middle" font-family="Noto Sans" font-size="150" fill="url(#score)">${share.score}</text>
    <text x="600" y="470" text-anchor="middle" font-family="Noto Sans" font-size="30" fill="#94a3b8">on the Flourish Friends Flag Quiz</text>
    <text x="600" y="545" text-anchor="middle" font-family="Noto Sans" font-size="27" fill="#cbd5e1">${xml(stats)}</text>
    <text x="600" y="600" text-anchor="middle" font-family="Noto Sans" font-size="26" fill="#fbbf24" letter-spacing="2">FLOURISHFRIENDS.COM</text>
  </svg>`;
}

export async function renderScoreCard(
  share: ScoreShare,
  assets: Fetcher,
  origin: string
): Promise<Uint8Array | null> {
  const font = await loadFont(assets, origin);
  if (!font) return null;
  await ensureWasm();
  const resvg = new Resvg(cardSVG(share), {
    fitTo: { mode: "width", value: 1200 },
    font: { fontBuffers: [font], loadSystemFonts: false, defaultFontFamily: "Noto Sans" },
    background: "#0a1128",
  });
  return resvg.render().asPng();
}
