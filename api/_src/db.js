import sql from 'mssql';

const required = ['DB_SERVER', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(', ')}. Copy api/.env.example to api/.env.`);
  process.exit(1);
}

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT !== 'false',
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
    ...(process.env.DB_INSTANCE ? { instanceName: process.env.DB_INSTANCE } : {}),
  },
  ...(process.env.DB_INSTANCE ? {} : { port: Number(process.env.DB_PORT || 1433) }),
  // The database is ~280ms away, so a cold connect costs 2-5 seconds. Keeping
  // one connection open (min: 1) and idling out slowly avoids paying that
  // every time the app sits unused for half a minute.
  pool: { max: 10, min: 1, idleTimeoutMillis: 5 * 60 * 1000 },
  requestTimeout: 30000,
};

let poolPromise;

export function getPool() {
  if (!poolPromise) {
    const pool = new sql.ConnectionPool(config);
    // Without this listener the pool's 'error' event is unhandled, and an
    // EventEmitter with no error listener takes the whole process down. A
    // database outage must never kill the API - login and the locally stored
    // pages have nothing to do with SQL Server.
    pool.on('error', (err) => console.error('[db] pool error:', err.message));
    poolPromise = pool.connect().catch((err) => {
      poolPromise = undefined; // allow retry on next request
      throw err;
    });
  }
  return poolPromise;
}

// Some hosts drop idle TCP connections regardless of the pool's own timeout,
// which would put the cold-connect cost back. A cheap SELECT 1 keeps the
// link alive. unref() so this timer never holds the process open.
const KEEP_ALIVE_MS = 60_000;
setInterval(() => {
  if (!poolPromise) return;   // nothing connected yet, nothing to keep warm
  poolPromise
    .then((pool) => pool.request().query('SELECT 1'))
    .catch((err) => console.error('[db] keep-alive failed:', err.message));
}, KEEP_ALIVE_MS).unref();

export { sql };
