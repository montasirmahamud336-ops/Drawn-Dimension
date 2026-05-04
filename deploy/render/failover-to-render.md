# Render Backup Failover

If the VPS backend has trouble later, you can temporarily switch the frontend back to the existing Render backends.

## Current Modes

- VPS primary frontend env: `.env.production.vps`
- Render backup frontend env: `.env.production.render-backup`

## Quick Rollback Steps

From the repo root:

```bash
cp .env.production.render-backup .env.production
npm run build
```

Then redeploy the rebuilt `dist` folder to the VPS frontend host just like before.

This switches the frontend back to:

- `https://drawndimension-node-api.onrender.com`
- `https://drawndimension-chat-api.onrender.com`

## Return To VPS Later

```bash
cp .env.production.vps .env.production
npm run build
```

Then redeploy `dist` again.

## Important

- Keep both Render backend services alive if you want instant rollback.
- Do not delete the Render environment variables or service settings.
- The current production build only uses one target at a time, so rollback means:
  1. copy the desired env file to `.env.production`
  2. rebuild
  3. redeploy frontend files
