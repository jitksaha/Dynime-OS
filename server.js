/**
 * Dynime OS — Production Node.js server
 * Serves the Vite-built SPA with SPA-routing fallback, security headers,
 * and gzip compression. Designed for Hostinger Business (Node.js hosting).
 */

import express from 'express';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 3000;
const DIST = join(__dirname, 'dist');

// Abort early if no build output exists
if (!existsSync(DIST)) {
  console.error('[dynime] dist/ folder not found — run `npm run build` first.');
  process.exit(1);
}

// ── Middleware ───────────────────────────────────────────────────────────────

// Gzip everything
app.use(compression());

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options',  'nosniff');
  res.setHeader('X-Frame-Options',         'SAMEORIGIN');
  res.setHeader('X-XSS-Protection',        '1; mode=block');
  res.setHeader('Referrer-Policy',         'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy',      'camera=(), microphone=(), geolocation=()');
  next();
});

// ── Static assets (long-lived cache for fingerprinted files) ─────────────────
app.use(
  express.static(DIST, {
    maxAge: '1y',
    immutable: true,
    index:    false,  // we handle root ourselves
    etag:     true,
  })
);

// ── SPA fallback — every unmatched path returns index.html ──────────────────
app.get('*', (_req, res) => {
  res.sendFile(join(DIST, 'index.html'));
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[dynime] Serving on port ${PORT} — NODE_ENV=${process.env.NODE_ENV || 'production'}`);
});
