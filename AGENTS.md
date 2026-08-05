# DrawnDimension runtime architecture

- Production website and APIs run on the VPS.
- Production database is local VPS PostgreSQL: use `DATABASE_URL` from `server-node/.env`.
- Run SQL migrations against that PostgreSQL database with `psql "$DATABASE_URL" -f <migration-file>`.
- The active Node data adapter is `server-node/src/lib/database.ts`.
- `supabase/` and `src/integrations/supabase/` are legacy compatibility/history folders. Do not use them for new database work or instruct users to run production queries there.
- CMS uploads use the VPS API storage endpoints (`/storage/ensure` and `/storage/upload`) and are served from VPS `/media`.
