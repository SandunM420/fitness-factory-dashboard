import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import routes from './routes.js';
import { getPool } from './db.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const isProd = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
  credentials: true,
}));
app.use(express.json({ limit: '16kb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 120 }));
app.use('/api', routes);

// In production, serve the built React app from the same origin.
const webDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist');
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(webDist, 'index.html')));
}

// Errors are logged on the server; the client only gets a generic message in production.
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: isProd ? 'Internal server error' : err.message });
});

// Last-resort net: a rejected promise from a dropped database connection should
// be logged, not fatal. Without this Node exits and the whole app goes down.
process.on('unhandledRejection', (reason) => console.error('Unhandled rejection:', reason?.message ?? reason));

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
  // Open the database connection now rather than making the first visitor wait
  // for it. The handshake to a host ~280ms away costs several seconds, and the
  // pool keeps it warm from here on. A failure here is not fatal - requests
  // retry on their own.
  getPool().catch((err) => console.error('[db] initial connect failed:', err.message));
});
