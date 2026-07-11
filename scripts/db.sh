#!/usr/bin/env bash
# Native Postgres helper (macOS / Homebrew). No Docker.
# postgresql@16 is keg-only, so we resolve its bin dir and prepend to PATH.
set -euo pipefail

DB=kwhab
HERE="$(cd "$(dirname "$0")/.." && pwd)"

PG_PREFIX="$(brew --prefix postgresql@16 2>/dev/null || true)"
if [ -n "$PG_PREFIX" ] && [ -d "$PG_PREFIX/bin" ]; then
  export PATH="$PG_PREFIX/bin:$PATH"
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "❌ psql not found. Install Postgres:  brew install postgresql@16" >&2
  exit 1
fi

load() {
  psql -q -d "$DB" -v ON_ERROR_STOP=1 -f "$HERE/db/schema.sql"
  psql -q -d "$DB" -v ON_ERROR_STOP=1 -f "$HERE/db/seed.sql"
  if [ -f "$HERE/db/teamup-events.generated.sql" ]; then
    psql -q -d "$DB" -v ON_ERROR_STOP=1 -f "$HERE/db/teamup-events.generated.sql"
  fi
  echo "✅ '$DB' schema + seed loaded."
}

case "${1:-}" in
  start)
    brew services start postgresql@16
    echo "⏳ waiting for postgres..."
    until pg_isready -q; do sleep 0.5; done
    echo "✅ postgres is up."
    ;;
  setup)
    # Fresh create + load. Safe no-op-ish if the DB already exists.
    if createdb "$DB" 2>/dev/null; then
      load
    else
      echo "ℹ️  database '$DB' already exists — run 'npm run db:reset' to rebuild."
    fi
    ;;
  reset)
    # The dev server holds an open connection pool to $DB, so a plain dropdb
    # fails ("database is being accessed by other users") any time this is
    # run while `npm run dev` is up — exactly when you want to rewind a demo.
    # Terminate other backends on $DB first (the server's pg client just
    # reconnects on its next query).
    psql -q -d postgres -v ON_ERROR_STOP=1 -c \
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB' AND pid <> pg_backend_pid();" \
      >/dev/null 2>&1 || true
    dropdb --if-exists "$DB"
    createdb "$DB"
    load
    ;;
  psql)
    psql -d "$DB"
    ;;
  *)
    echo "usage: scripts/db.sh {start|setup|reset|psql}" >&2
    exit 1
    ;;
esac
