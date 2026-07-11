// Must be the first import: ESM evaluates imports in dependency-graph order,
// so a plain top-level statement here would run AFTER later imports (like
// './services/ai', which reads process.env.AI_MODE at module-eval time) —
// this needs to be a self-contained side-effect import, same as the
// 'dotenv/config' pattern it replaces, to actually run first.
import './env';
import express from 'express';
import cors from 'cors';
import { initDb } from './db';
import { AI_MODE } from './services/ai';
import { events } from './routes/events';
import { signups } from './routes/signups';
import { quickpicks } from './routes/quickpicks';
import { routes } from './routes/routes';
import { org } from './routes/org';
import { users } from './routes/users';
import { aiRoutes } from './routes/ai';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, ai_mode: AI_MODE }));

app.use('/api/events', events);
app.use('/api/signups', signups);
app.use('/api/quick-picks', quickpicks);
app.use('/api/routes', routes);
app.use('/api/orgs', org);
app.use('/api/users', users);
app.use('/api/ai', aiRoutes);

// Central error handler so a thrown route never crashes the process.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[api error]', err);
  res.status(500).json({ error: err?.message || 'internal_error' });
});

// Express 4 doesn't forward errors thrown in async handlers to the handler
// above — they surface as unhandled rejections, which crash Node by default.
// Log and keep serving instead; the affected request times out/errors alone.
process.on('unhandledRejection', (err) => {
  console.error('[unhandled rejection]', err);
});

const port = Number(process.env.PORT || 4000);
initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`✅ KW Hab API on http://localhost:${port}  (AI_MODE=${AI_MODE})`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to init DB (is Postgres running? `npm run db:start`)', err);
    process.exit(1);
  });
