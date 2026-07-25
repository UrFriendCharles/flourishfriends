import { useMemo } from "react";
import qrcode from "qrcode-generator";

// The @types package only declares the create*Tag helpers, but the library
// also exposes the raw module matrix — which we use to draw our own crisp SVG.
interface QrMatrix {
  getModuleCount(): number;
  isDark(row: number, col: number): boolean;
}

interface Props {
  value: string;
  /** rendered pixel size (square) */
  size?: number;
  className?: string;
}

/**
 * Offline QR code as an inline SVG (no network, CSP-safe). Always drawn as
 * black modules on a white background so it scans reliably over the app's dark
 * theme; wrap it in a light card for the recommended quiet zone.
 */
export function QrCode({ value, size = 180, className = "" }: Props) {
  const { path, dim } = useMemo(() => {
    const qr = qrcode(0, "M"); // type 0 = auto-fit smallest version; ECC level M
    qr.addData(value);
    qr.make();
    const matrix = qr as unknown as QrMatrix;
    const count = matrix.getModuleCount();
    const margin = 4; // quiet zone in modules (per the QR spec)
    let d = "";
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (matrix.isDark(r, c)) d += `M${c + margin} ${r + margin}h1v1h-1z`;
      }
    }
    return { path: d, dim: count + margin * 2 };
  }, [value]);

  return (
    <svg
      viewBox={`0 0 ${dim} ${dim}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={className}
      role="img"
      aria-label="QR code to join the game"
    >
      <rect width={dim} height={dim} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  );
}
