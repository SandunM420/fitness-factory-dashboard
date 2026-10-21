// Vercel serverless entry point. vercel.json sends every /api/* request here,
// and an Express app is itself a (req, res) handler. Code lives in _src/ -
// Vercel would turn every file outside an underscore folder into its own function.
import app from './_src/app.js';

export default app;
