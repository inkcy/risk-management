import 'dotenv/config';
import app from './app.js';
import { dbConfigured } from './db.js';

const PORT = Number(process.env.PORT ?? 4000);

app.listen(PORT, () => {
  console.log(`[backend] listening on http://localhost:${PORT}`);
  console.log(`[backend] db configured: ${dbConfigured()}`);
});
