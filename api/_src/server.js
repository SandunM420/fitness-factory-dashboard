// Local / self-hosted entry point. On Vercel, api/index.js is used instead.
import app from './app.js';
import { getPool } from './db.js';

const port = Number(process.env.PORT || 4000);

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
