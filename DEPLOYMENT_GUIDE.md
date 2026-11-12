# Deploy with Vercel and Render

The React/Vite frontend is configured for Vercel. The Express/Prisma API is configured as a native Node web service on Render. PostgreSQL is managed separately; use Render Postgres or another provider.

## 1. Deploy the API on Render

1. Push the project to a Git provider connected to Render. In the Render Dashboard, create a **Blueprint** from the repository root; Render reads [`render.yaml`](./render.yaml). The service uses `backend` as its root directory, builds with the committed backend lockfile, and starts the compiled API.
2. Select a paid web-service plan. This Blueprint runs Prisma migrations with Render's `preDeployCommand`, which requires a paid plan.
3. Create or select a PostgreSQL database. For Render Postgres, use the internal connection URL when the database and service share a region. Set both `DATABASE_URL` and `DIRECT_URL` to that URL unless your provider supplies separate pooled and direct URLs.
4. Enter the Blueprint's `sync: false` values in Render's environment prompt:
   - `FRONTEND_URL`: the exact production Vercel origin, with no path or trailing slash.
   - `ALLOWED_ORIGINS`: exact additional browser origins, comma-separated. Keep this to trusted production domains.
   - `DATABASE_URL` and `DIRECT_URL`: valid PostgreSQL URLs reachable by the service.
   - `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL`, and `BOOTSTRAP_ADMIN_PASSWORD`: your initial administrator. Use a unique password of at least 12 characters.
5. Render generates `SESSION_SECRET` and sets `PORT=10000`. The service uses Node.js 22, binds to `0.0.0.0`, and uses `/api/health` for health checks.

On the initial successful deploy, Render applies migrations before starting the service and then runs the one-time production seed. The seed creates the configured Super Admin and required permissions; it does not create fixed-password demo users or import CSV data. It will not reset an existing administrator's password. Subsequent deploys run migrations automatically before switching traffic.

Do not put credentials in `render.yaml` or commit a real `.env` file. Keep demo seeding disabled in production.

### Existing databases

The initial migration creates the schema from the current Prisma model. If the database already has this exact schema but no Prisma migration history, do not let the configured pre-deploy migration run yet:

1. Temporarily remove or comment out `preDeployCommand` in `render.yaml` and sync the Blueprint.
2. Once the service is available, use Render Shell to run:

   ```sh
   npx prisma migrate resolve --applied 20261112000000_initial
   ```

3. Restore `preDeployCommand` and sync the Blueprint again.

Only baseline a database after confirming its schema exactly matches the initial migration and taking a backup. Never mark the migration applied on a new or mismatched database.

## 2. Deploy the frontend on Vercel

1. Import the same Git repository into Vercel.
2. Set **Root Directory** to `frontend`. Keep the project as a Vite app; [`frontend/vercel.json`](./frontend/vercel.json) configures clean installation, build, `dist` output, and SPA route rewrites.
3. Set **Production** environment variable `VITE_API_BASE_URL` to the Render API URL plus `/api`, for example `https://science-on-wheels-api.onrender.com/api`.
4. Keep Node.js at `22.x` (already set in `frontend/package.json`).
5. Add the production Vercel domain in the Render service's `FRONTEND_URL`. Add any other trusted production domains to `ALLOWED_ORIGINS`.

Vercel builds a preview deployment for each branch. Preview origins are not automatically allowed by the API. For preview testing, use a stable, explicitly configured preview domain and a staging API/database rather than opening CORS to all Vercel preview URLs.

## 3. Release checks

- Wait for the Render service health check to pass and verify `https://<render-service>.onrender.com/api/health` returns `200`.
- Open the Vercel URL, sign in with the configured bootstrap administrator, and refresh a nested route to verify SPA rewrites.
- Back up PostgreSQL before the first release and verify that backups can be restored.
- Render's automatic deployment uses the connected Git branch; Vercel also deploys pushed commits. Commit and push the intended changes before expecting either provider to build them.

## Local Docker Compose

For a self-managed Docker host instead of Render, configure `backend/.env` from `backend/.env.production.example` and run the commands below from the repository root:

```sh
docker compose build api
docker compose run --rm api npx prisma migrate deploy
docker compose run --rm api npm run seed:prod
docker compose up -d api
```

Compose binds the API to `127.0.0.1:5000`; put a TLS reverse proxy in front of it. The Render Blueprint's `PORT=10000` setting does not affect Compose, which sets `PORT=5000`.
