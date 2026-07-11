import 'dotenv/config';
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
