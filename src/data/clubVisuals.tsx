import type { JSX } from "react";

// Flourish Friends-drawn puzzle art (§29): every visual is an inline SVG so it
// stays razor-sharp on a phone and on a 65" TV, and nothing is ever a
// screenshot from somewhere else. Questions reference these by `assetId`;
// the worker never sees them.

const INK = "#e2e8f0"; // line work
const DIM = "#64748b"; // guides / fold lines
const ACCENT = "#38bdf8"; // highlighted figure
const LABEL = "#94a3b8";

interface VisualProps {
  className?: string;
}

function Frame({
  viewBox,
  children,
  className = "",
}: {
  viewBox: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox={viewBox}
      className={`h-auto w-full ${className}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Regular n-gon centred on (cx, cy), first vertex pointing up. */
function polygonPoints(cx: number, cy: number, r: number, sides: number): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`);
  }
  return pts.join(" ");
}

function OptionLabel({ x, y, letter }: { x: number; y: number; letter: string }) {
  return (
    <text
      x={x}
      y={y}
      fill={LABEL}
      fontSize="15"
      fontWeight="800"
      textAnchor="middle"
      fontFamily="system-ui, sans-serif"
    >
      {letter}
    </text>
  );
}

// ---------- 90%: count the circles ----------

const DOTS: [number, number][] = [
  [40, 45],
  [110, 32],
  [172, 58],
  [62, 108],
  [136, 106],
  [30, 160],
  [150, 165],
];

function DotsSeven({ className }: VisualProps) {
  return (
    <Frame viewBox="0 0 200 200" className={className}>
      {DOTS.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="18" fill={ACCENT} opacity="0.85" />
      ))}
    </Frame>
  );
}

// ---------- 80%: rotating arrow sequence (A–D printed on the board) ----------

function Arrow({ x, y, rotate }: { x: number; y: number; rotate: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <line x1="0" y1="16" x2="0" y2="-12" stroke={ACCENT} strokeWidth="6" strokeLinecap="round" />
      <polygon points="0,-22 9,-6 -9,-6" fill={ACCENT} />
    </g>
  );
}

function Cell({ x, y, size = 62 }: { x: number; y: number; size?: number }) {
  return (
    <rect
      x={x - size / 2}
      y={y - size / 2}
      width={size}
      height={size}
      rx="10"
      fill="none"
      stroke={DIM}
      strokeWidth="2"
    />
  );
}

function SeqRotatingArrow({ className }: VisualProps) {
  const seq = [0, 90, 180];
  return (
    <Frame viewBox="0 0 340 200" className={className}>
      {seq.map((rot, i) => (
        <g key={rot}>
          <Cell x={45 + i * 75} y={50} />
          <Arrow x={45 + i * 75} y={50} rotate={rot} />
        </g>
      ))}
      <Cell x={270} y={50} />
      <text
        x="270"
        y="62"
        fill={INK}
        fontSize="34"
        fontWeight="900"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
      >
        ?
      </text>

      {[
        ["A", 0],
        ["B", 90],
        ["C", 270],
        ["D", 180],
      ].map(([letter, rot], i) => (
        <g key={letter as string}>
          <Cell x={45 + i * 75} y={140} size={54} />
          <Arrow x={45 + i * 75} y={140} rotate={rot as number} />
          <OptionLabel x={45 + i * 75} y={185} letter={letter as string} />
        </g>
      ))}
    </Frame>
  );
}

// ---------- 70% / 30% / 10%: square grids ----------

function SquareGrid({ n, className }: { n: number; className?: string }) {
  const size = 180;
  const step = size / n;
  const lines: JSX.Element[] = [];
  for (let i = 1; i < n; i++) {
    lines.push(
      <line key={`v${i}`} x1={10 + i * step} y1="10" x2={10 + i * step} y2="190" stroke={INK} strokeWidth="3" />
    );
    lines.push(
      <line key={`h${i}`} x1="10" y1={10 + i * step} x2="190" y2={10 + i * step} stroke={INK} strokeWidth="3" />
    );
  }
  return (
    <Frame viewBox="0 0 200 200" className={className}>
      <rect x="10" y="10" width={size} height={size} fill="none" stroke={INK} strokeWidth="4" />
      {lines}
    </Frame>
  );
}

const Grid2x2 = ({ className }: VisualProps) => <SquareGrid n={2} className={className} />;
const Grid3x3 = ({ className }: VisualProps) => <SquareGrid n={3} className={className} />;

// ---------- 60%: L-tetromino rotations (one is a mirror image) ----------

// An L: three cells down, one to the right at the bottom.
const L_PATH = "M0 0 h30 v90 h60 v30 h-90 z";

function LShape({ rotate, mirror, className }: { rotate: number; mirror?: boolean; className?: string }) {
  return (
    <Frame viewBox="0 0 140 140" className={className}>
      <g transform={`translate(70 70) rotate(${rotate}) ${mirror ? "scale(-1 1)" : ""} translate(-45 -60)`}>
        <path d={L_PATH} fill={ACCENT} opacity="0.9" />
      </g>
    </Frame>
  );
}

// ---------- 50%: triangle split by two lines from the apex ----------

function TriangleCevians({ className }: VisualProps) {
  return (
    <Frame viewBox="0 0 200 180" className={className}>
      <polygon points="100,15 185,160 15,160" fill="none" stroke={INK} strokeWidth="4" />
      <line x1="100" y1="15" x2="72" y2="160" stroke={INK} strokeWidth="3" />
      <line x1="100" y1="15" x2="128" y2="160" stroke={INK} strokeWidth="3" />
    </Frame>
  );
}

// ---------- 40%: polygon matrix, answers printed on the board ----------

function MatrixPolygonSides({ className }: VisualProps) {
  const rows = [
    [3, 4, 5],
    [4, 5, 6],
    [5, 6, 0], // 0 = the missing cell
  ];
  return (
    <Frame viewBox="0 0 360 330" className={className}>
      {rows.map((row, r) =>
        row.map((sides, c) => {
          const cx = 110 + c * 70;
          const cy = 45 + r * 65;
          return (
            <g key={`${r}-${c}`}>
              <Cell x={cx} y={cy} size={62} />
              {sides === 0 ? (
                <text
                  x={cx}
                  y={cy + 12}
                  fill={INK}
                  fontSize="32"
                  fontWeight="900"
                  textAnchor="middle"
                  fontFamily="system-ui, sans-serif"
                >
                  ?
                </text>
              ) : (
                <polygon points={polygonPoints(cx, cy, 23, sides)} fill="none" stroke={ACCENT} strokeWidth="3" />
              )}
            </g>
          );
        })
      )}
      <line x1="25" y1="245" x2="335" y2="245" stroke={DIM} strokeWidth="2" strokeDasharray="6 6" />
      {[
        ["A", 6],
        ["B", 7],
        ["C", 8],
        ["D", 5],
      ].map(([letter, sides], i) => {
        const cx = 68 + i * 75;
        const cy = 285;
        return (
          <g key={letter as string}>
            <polygon
              points={polygonPoints(cx, cy, 27, sides as number)}
              fill="none"
              stroke={INK}
              strokeWidth="3"
            />
            <OptionLabel x={cx} y={cy + 45} letter={letter as string} />
          </g>
        );
      })}
    </Frame>
  );
}

// ---------- 20%: fold-and-punch ----------

function HoleSquare({
  x,
  y,
  size,
  holes,
  folds,
}: {
  x: number;
  y: number;
  size: number;
  holes: [number, number][];
  folds?: boolean;
}) {
  return (
    <g>
      <rect x={x} y={y} width={size} height={size} rx="6" fill="none" stroke={INK} strokeWidth="3" />
      {folds && (
        <>
          <line
            x1={x + size / 2}
            y1={y}
            x2={x + size / 2}
            y2={y + size}
            stroke={DIM}
            strokeWidth="2"
            strokeDasharray="5 5"
          />
          <line
            x1={x}
            y1={y + size / 2}
            x2={x + size}
            y2={y + size / 2}
            stroke={DIM}
            strokeWidth="2"
            strokeDasharray="5 5"
          />
        </>
      )}
      {holes.map(([hx, hy], i) => (
        <circle key={i} cx={x + hx * size} cy={y + hy * size} r={size * 0.075} fill={ACCENT} />
      ))}
    </g>
  );
}

function PaperFoldPunch({ className }: VisualProps) {
  // Folded quarter-sheet with a single punch near its top-left corner.
  const optionSets: Record<string, [number, number][]> = {
    A: [
      [0.25, 0.25],
      [0.45, 0.25],
      [0.65, 0.25],
      [0.85, 0.25],
    ],
    B: [
      [0.25, 0.25],
      [0.75, 0.25],
      [0.25, 0.75],
      [0.75, 0.75],
    ],
    C: [
      [0.25, 0.25],
      [0.75, 0.75],
    ],
    D: [
      [0.4, 0.4],
      [0.6, 0.4],
      [0.4, 0.6],
      [0.6, 0.6],
    ],
  };
  return (
    <Frame viewBox="0 0 420 250" className={className}>
      <text
        x="15"
        y="30"
        fill={LABEL}
        fontSize="13"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
      >
        FOLDED + PUNCHED
      </text>
      <HoleSquare x={20} y={50} size={90} holes={[[0.25, 0.25]]} />
      <text
        x="145"
        y="100"
        fill={LABEL}
        fontSize="28"
        fontWeight="800"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
      >
        →
      </text>
      <text
        x="145"
        y="125"
        fill={LABEL}
        fontSize="12"
        fontWeight="700"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
      >
        UNFOLD
      </text>
      <line x1="185" y1="15" x2="185" y2="235" stroke={DIM} strokeWidth="2" strokeDasharray="6 6" />
      {(["A", "B", "C", "D"] as const).map((letter, i) => {
        const x = 215 + (i % 2) * 105;
        const y = 20 + Math.floor(i / 2) * 115;
        return (
          <g key={letter}>
            <HoleSquare x={x} y={y} size={85} holes={optionSets[letter]} folds />
            <OptionLabel x={x + 42} y={y + 105} letter={letter} />
          </g>
        );
      })}
    </Frame>
  );
}

// ---------- 5%: triangular grid, four rows ----------

function TriangleGrid4({ className }: VisualProps) {
  const apex: [number, number] = [110, 15];
  const left: [number, number] = [15, 185];
  const right: [number, number] = [205, 185];
  const lerp = (a: [number, number], b: [number, number], t: number): [number, number] => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
  ];
  const lines: JSX.Element[] = [];
  for (let i = 1; i < 4; i++) {
    const t = i / 4;
    // parallel to the base
    const p1 = lerp(apex, left, t);
    const p2 = lerp(apex, right, t);
    lines.push(<line key={`b${i}`} x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} stroke={INK} strokeWidth="2.5" />);
    // parallel to the right edge
    const l1 = lerp(left, apex, t);
    const l2 = lerp(left, right, t);
    lines.push(<line key={`r${i}`} x1={l1[0]} y1={l1[1]} x2={l2[0]} y2={l2[1]} stroke={INK} strokeWidth="2.5" />);
    // parallel to the left edge
    const r1 = lerp(right, apex, t);
    const r2 = lerp(right, left, t);
    lines.push(<line key={`l${i}`} x1={r1[0]} y1={r1[1]} x2={r2[0]} y2={r2[1]} stroke={INK} strokeWidth="2.5" />);
  }
  return (
    <Frame viewBox="0 0 220 200" className={className}>
      <polygon
        points={`${apex[0]},${apex[1]} ${right[0]},${right[1]} ${left[0]},${left[1]}`}
        fill="none"
        stroke={INK}
        strokeWidth="4"
      />
      {lines}
    </Frame>
  );
}

// ---------- registry ----------

export const CLUB_VISUALS: Record<string, (props: VisualProps) => JSX.Element> = {
  dots_seven: DotsSeven,
  seq_rotating_arrow: SeqRotatingArrow,
  grid_squares_2x2: Grid2x2,
  grid_squares_3x3: Grid3x3,
  grid_rect_3x3: Grid3x3,
  triangle_cevians_2: TriangleCevians,
  matrix_polygon_sides: MatrixPolygonSides,
  paper_fold_punch: PaperFoldPunch,
  triangle_grid_4: TriangleGrid4,
  shape_l_rot0: (p) => <LShape rotate={0} {...p} />,
  shape_l_rot90: (p) => <LShape rotate={90} {...p} />,
  shape_l_rot270: (p) => <LShape rotate={270} {...p} />,
  shape_l_mirror: (p) => <LShape rotate={0} mirror {...p} />,
};

export function hasClubVisual(assetId: string): boolean {
  return assetId in CLUB_VISUALS;
}
