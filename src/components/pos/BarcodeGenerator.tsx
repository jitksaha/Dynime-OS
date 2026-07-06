import { useEffect, useRef } from "react";

interface BarcodeDisplayProps {
  value: string;
  width?: number;
  height?: number;
  type?: "barcode" | "qr";
  showLabel?: boolean;
}

/**
 * Renders a barcode or QR code using Canvas API.
 * Lightweight — no external library needed.
 */
export function BarcodeDisplay({ value, width = 200, height = 60, type = "barcode", showLabel = true }: BarcodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (type === "qr") {
      drawQR(ctx, value, width, height);
    } else {
      drawBarcode(ctx, value, width, height, showLabel);
    }
  }, [value, width, height, type, showLabel]);

  if (!value) return null;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height + (showLabel && type === "barcode" ? 16 : 0)}
      className="mx-auto"
      style={{ imageRendering: "pixelated" }}
    />
  );
}

function drawBarcode(ctx: CanvasRenderingContext2D, value: string, w: number, h: number, showLabel: boolean) {
  ctx.clearRect(0, 0, w, h + 20);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h + 20);

  // Simple Code 128-like visual representation
  const chars = value.split("");
  const totalBars = chars.length * 11 + 22; // approximate
  const barWidth = Math.max(1, w / totalBars);

  let x = barWidth * 5; // quiet zone
  ctx.fillStyle = "#000000";

  // Start pattern
  const startPattern = [2, 1, 1, 2, 3, 2];
  for (const p of startPattern) {
    if (startPattern.indexOf(p) % 2 === 0) {
      ctx.fillRect(x, 0, barWidth * p, h);
    }
    x += barWidth * p;
  }

  // Encode each character
  for (const char of chars) {
    const code = char.charCodeAt(0);
    const bits = [
      ((code >> 6) & 1) + 1,
      ((code >> 5) & 1) + 1,
      ((code >> 4) & 1) + 1,
      ((code >> 3) & 1) + 1,
      ((code >> 2) & 1) + 1,
      ((code >> 1) & 1) + 1,
    ];
    for (let i = 0; i < bits.length; i++) {
      if (i % 2 === 0) {
        ctx.fillRect(x, 0, barWidth * bits[i], h);
      }
      x += barWidth * bits[i];
    }
  }

  // Stop pattern
  const stopPattern = [2, 3, 3, 1, 1, 1, 2];
  for (let i = 0; i < stopPattern.length; i++) {
    if (i % 2 === 0) {
      ctx.fillRect(x, 0, barWidth * stopPattern[i], h);
    }
    x += barWidth * stopPattern[i];
  }

  // Label
  if (showLabel) {
    ctx.fillStyle = "#000000";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(value, w / 2, h + 13);
  }
}

function drawQR(ctx: CanvasRenderingContext2D, value: string, w: number, h: number) {
  const size = Math.min(w, h);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  // Simple QR-like visual using character hashing
  const gridSize = 21;
  const cellSize = Math.floor(size / gridSize);
  const offsetX = Math.floor((w - gridSize * cellSize) / 2);
  const offsetY = Math.floor((h - gridSize * cellSize) / 2);

  ctx.fillStyle = "#000000";

  // Finder patterns (corners)
  const drawFinder = (fx: number, fy: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        if (isBorder || isInner) {
          ctx.fillRect(offsetX + (fx + c) * cellSize, offsetY + (fy + r) * cellSize, cellSize, cellSize);
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(gridSize - 7, 0);
  drawFinder(0, gridSize - 7);

  // Data modules (hash-based)
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      // Skip finder areas
      if ((r < 8 && c < 8) || (r < 8 && c > gridSize - 9) || (r > gridSize - 9 && c < 8)) continue;
      // Timing patterns
      if (r === 6 || c === 6) {
        if ((r + c) % 2 === 0) {
          ctx.fillRect(offsetX + c * cellSize, offsetY + r * cellSize, cellSize, cellSize);
        }
        continue;
      }
      // Data
      const bit = ((hash * (r * gridSize + c + 1)) >> ((r + c) % 16)) & 1;
      if (bit) {
        ctx.fillRect(offsetX + c * cellSize, offsetY + r * cellSize, cellSize, cellSize);
      }
    }
  }
}

/** Generate a random barcode string */
export function generateBarcode(): string {
  const prefix = "PDM";
  const num = Math.floor(Math.random() * 1e10).toString().padStart(10, "0");
  return `${prefix}${num}`;
}
