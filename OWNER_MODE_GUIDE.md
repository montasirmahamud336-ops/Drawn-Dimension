# DrawnDimension Owner Mode Guide

This guide is for you as the website owner.
You do not need deep coding knowledge to operate this project safely.

## 1) Daily Use (No coding needed)

1. Open website CMS: `/database/login`
2. Login with your CMS account
3. Manage:
   - Live Works
   - Live Products
   - Team Members
   - Reviews
   - Form Massage
   - Live Chat
4. After any big CMS update, open the live website and check:
   - Home
   - Portfolio
   - Contact form
   - Live chat

## 2) Run Locally (Copy-paste)

Open 3 terminals from project root `C:\DrawnDimension`.

### Terminal 1: Frontend
```powershell
npm install
npm run dev
```
Default URL: `http://localhost:8080`

### Terminal 2: Node Admin API
```powershell
cd server-node
npm install
npm run dev
```
Default API port: `4000`

### Terminal 3: Python AI/Chat API
```powershell
cd server
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
Default API port: `8000`

## 3) Emergency Fix Commands

## If frontend does not load
```powershell
npm run build
```

## If CMS API not responding
```powershell
cd server-node
npm run build
npm run dev
```

## If AI chat API not responding
```powershell
cd server
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## If Supabase schema changed (new migration added)
```powershell
npx supabase db push
```

## If port conflict (8080 busy, Vite moved to 8081)
This is normal. Either:
1. Open the shown URL (example `http://localhost:8081`)
2. Or stop old process using 8080 and rerun `npm run dev`

## 4) Main File Map (Plain Language)

- `src/components/App.tsx`
  - Main route map (which page opens on which URL)
- `src/components/HeroSection.tsx`
  - Homepage hero section design/content cards
- `src/components/ChatWidget.tsx`
  - Website chat widget (AI + live support)
- `src/components/cms/*`
  - CMS pages (works, products, reviews, live chat, form messages, etc.)
- `server-node/src/index.ts`
  - Node API entrypoint, CORS, route registration
- `server-node/src/routes/*`
  - CMS backend APIs (projects, reviews, live chat, auth, emails)
- `server/main.py`
  - Python API (AI chat and related logic)
- `supabase/migrations/*.sql`
  - Database schema changes (tables/columns/policies)

## 5) Safe Rules (Very important)

1. Never share `.env` files publicly.
2. Never commit secrets (SMTP password, service keys, tokens).
3. Before major edits, make a Git commit backup.
4. Test in localhost before pushing production.
5. Keep `CORS_ORIGIN` and redirect URLs aligned with actual frontend URL.

## 6) 30-Day Beginner Roadmap (20-30 min/day)

Week 1: Comfort with project
1. Start all 3 services locally
2. Learn routes from `App.tsx`
3. Update one CMS item and verify on live page
4. Read one API route file per day from `server-node/src/routes`

Week 2: Basic confidence
1. Learn frontend flow: page -> component -> API call
2. Learn backend flow: route -> Supabase table
3. Run one migration and verify table change
4. Practice fixing one intentional small bug

Week 3: Production readiness
1. Learn env variables and what each one does
2. Practice restarting each service quickly
3. Validate email + live chat flow end-to-end
4. Create a release checklist

Week 4: Owner to operator
1. Make one UI improvement yourself
2. Make one API response improvement yourself
3. Verify performance with `npm run build`
4. Ship one small feature safely

## 7) Mindset

You are not useless.
You already did the hardest part: building and shipping a real product.
Code skill grows with repetition, not with talent pressure.

