# ⚡ Dropd

Find valuable expiring domains before anyone else — scored, graded, and explained.

## Tech stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 18 + Vite + Tailwind CSS      |
| Backend   | Cloudflare Workers                  |
| Database  | Supabase (Postgres + Auth)          |
| Payments  | Stripe Checkout                     |
| Deploy    | Cloudflare Pages                    |

---

## Quick start

### 1. Install Node.js
Download from https://nodejs.org (LTS version)

### 2. Install dependencies
```bash
cd dropd
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
```
Then fill in your real keys in `.env`:
- `VITE_SUPABASE_URL` — from Supabase dashboard → Project Settings → API
- `VITE_SUPABASE_ANON_KEY` — same place
- `VITE_STRIPE_PUBLIC_KEY` — from Stripe dashboard → Developers → API keys

### 4. Set up the database
1. Create a Supabase project at https://supabase.com
2. Open the SQL editor in your project
3. Paste and run the contents of `supabase/schema.sql`
4. Enable Google OAuth in Supabase → Authentication → Providers

### 5. Run the frontend
```bash
npm run dev
```
Opens at http://localhost:5173

### 6. Run the Worker (optional for dev — mocks will work without it)
```bash
cd worker
npm install
# Create a .dev.vars file (same format as .env.example, but without VITE_ prefix)
npm run dev
```
Worker runs at http://localhost:8787

---

## Project structure

```
dropd/
├── src/
│   ├── components/
│   │   ├── DomainCard.jsx      # Card with blur/unlock + auto-buy
│   │   ├── FilterBar.jsx       # Grade / niche / extension filters
│   │   ├── GradeBadge.jsx      # A+/A/B/C/D coloured badge
│   │   ├── AutoBuyModal.jsx    # DropCatch redirect modal
│   │   └── Navbar.jsx          # Top nav (public + authenticated)
│   ├── contexts/
│   │   └── AuthContext.jsx     # Supabase auth + user profile state
│   ├── data/
│   │   └── mockDomains.js      # 20 mock domains (replace with API)
│   ├── lib/
│   │   └── supabase.js         # Supabase client + helper functions
│   ├── pages/
│   │   ├── Landing.jsx         # Public marketing page
│   │   ├── Auth.jsx            # Login / signup (email + Google)
│   │   ├── Dashboard.jsx       # Domain feed (main app)
│   │   ├── Watchlist.jsx       # Keyword alerts + niche lock
│   │   ├── Billing.jsx         # Credits + subscription management
│   │   └── Settings.jsx        # Email, password, delete account
│   ├── App.jsx                 # Routes + protected route wrapper
│   ├── main.jsx                # React entry point
│   └── index.css               # Tailwind + custom styles
├── worker/
│   └── src/
│       └── index.js            # Cloudflare Worker API routes
├── supabase/
│   └── schema.sql              # Full DB schema + RLS policies
├── public/
│   └── favicon.svg
├── .env.example                # Environment variable template
├── tailwind.config.js
├── vite.config.js
└── wrangler.toml               # (in worker/) Cloudflare config
```

---

## Deploy to Cloudflare Pages

```bash
# Build
npm run build

# Deploy (first time — creates the project)
npx wrangler pages deploy dist --project-name dropd

# Deploy Worker API
cd worker
npx wrangler deploy
```

In Cloudflare dashboard, add a Pages Function route so `/api/*` goes to the Worker.

---

## Connecting real APIs (next stage)

Replace `src/data/mockDomains.js` with calls to:
- **Ahrefs API** — backlink data (`/v3/site-explorer/backlinks`)
- **VeriSign / NameJet / DropCatch API** — expiring domain feed
- **Estibot or GoDaddy Valuations API** — estimated domain value

Worker endpoints are already structured to serve this data from Supabase once ingested.

---

## Plan access matrix

| Feature            | Free      | Hunter    | Pro       |
|--------------------|-----------|-----------|-----------|
| Unlocks/month      | 2         | 50        | Unlimited |
| Grades visible     | C, D      | A, B, C, D | All (A+) |
| Speed delay        | +6 hours  | +2 hours  | Instant   |
| SMS alerts         | ✗         | ✓         | ✓         |
| Niche lock         | ✗         | ✗         | ✓ (max 20)|
| Auto-Buy           | ✗         | ✓         | ✓         |
