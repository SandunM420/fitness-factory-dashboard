// The Express app, without starting a server. server.js listens on a port for
// local use; on Vercel, api/index.js hands this app to the serverless runtime.
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import routes from './routes.js';

const app = express();
const isProd = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');
// On Vercel every request arrives through its proxy; trust it so the rate
// limiter keys on the real client address instead of one shared proxy address.
if (process.env.VERCEL) app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
  credentials: true,
}));
app.use(express.json({ limit: '16kb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 120 }));
app.use('/api', routes);

// Self-hosted production (npm start after a build): serve the React app from
// the same origin. On Vercel the static files are served by Vercel itself.
const webDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist');
if (!process.env.VERCEL && existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(webDist, 'index.html')));
}

// Errors are logged on the server; the client only gets a generic message in production.
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: isProd ? 'Internal server error' : err.message });
});

export default app;
