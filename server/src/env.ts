import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// npm workspaces run `npm run dev -w server` with cwd=server/, so dotenv's
// default cwd-relative lookup never finds the repo-root .env. Resolve it
// explicitly so AI_MODE / DATABASE_URL / API keys set there actually load.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
