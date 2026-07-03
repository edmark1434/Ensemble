# Ensemble

Collaborative creative platform with a React frontend, Express API, and an optional embedded video editor.

## Project structure

| Directory       | Stack                          | Default URL              |
|-----------------|--------------------------------|--------------------------|
| `frontend/`     | React, TypeScript, Vite        | http://localhost:5173    |
| `backend/`      | Node.js, Express, PostgreSQL, Redis, Socket.io | http://localhost:4000 |
| `video-editor/` | Next.js (DesignCombo editor)   | http://localhost:3000    |

The main app is **frontend + backend**. The video editor is a separate app and only needed if you are working on editor features.

## Prerequisites

Install these before running the project:

- **Node.js** 18+ (20+ recommended)
- **npm** (comes with Node)
- **PostgreSQL** — database must already exist with the project schema (`accounts`, `users`, `staff`, and related tables). Schema/migration files are not included in this repo; use your team's database dump or setup docs.
- **Redis** — used for sessions, login lockout, and caching
- **Firebase project** — used for Google OAuth on the frontend

Optional (video editor only):

- **pnpm** — the video editor uses a `pnpm-lock.yaml`; npm may work but pnpm is preferred

## Setup (first time)

Follow these steps in order.

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd Ensemble
```

### 2. Start PostgreSQL and Redis

Make sure both services are running locally (or that you have connection details for hosted instances).

**Local Redis with no password:**

```env
REDIS_URL=redis://127.0.0.1:6379
```

**Local Redis with a password:**

```env
REDIS_URL=redis://:your_password@127.0.0.1:6379
```

### 3. Configure the backend

```bash
cd backend
npm install
cp .env.example .env   # Windows: copy .env.example .env
```

Edit `backend/.env`:

```env
DB_USER=your_postgres_user
DB_HOST=localhost
DB_NAME=your_database_name
DB_PASSWORD=your_postgres_password
DB_PORT=5432

REDIS_URL=redis://127.0.0.1:6379

ACCESS_TOKEN_JWT_SECRET=your_random_secret_string
REFRESH_TOKEN_JWT_SECRET=your_other_random_secret_string

# Optional — defaults to http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

Generate JWT secrets with any long random string (e.g. `openssl rand -hex 32`).

### 4. Create the database and tables

Your `DB_NAME` in `.env` must exist in PostgreSQL. If you see `database "ensemble" does not exist`, run:

```bash
cd backend
npm run db:setup
```

This creates the database (if missing) and applies `backend/sql/schema.sql`.

### 5. Seed the database (optional)

Populates test staff and users. **Clears existing rows** in `accounts`, `users`, and `staff` first, so it is safe to run more than once.

```bash
npm run seed
```

Default seeded passwords:

- **Staff & admin accounts:** `staff123`
- **Regular user accounts:** `user123`

**Staff & admin test accounts** (fixed emails — same every seed):

| Role | Email | Username (handle) | Portal |
|------|-------|-------------------|--------|
| Admin | `admin@ensemble.dev` | `admin` | http://localhost:5173/admin |
| Support Moderator | `support@ensemble.dev` | `support_moderator` | http://localhost:5173/staff |
| Marketplace Moderator | `marketplace@ensemble.dev` | `marketplace_moderator` | http://localhost:5173/staff |
| Jobs N Gigs Moderator | `jobs@ensemble.dev` | `jobs_n_gigs_moderator` | http://localhost:5173/staff |
| Forum Moderator | `forum@ensemble.dev` | `forum_moderator` | http://localhost:5173/staff |

Sign in with **email or username** and password `staff123`.

To wipe seeded data:

```bash
npm run clean
```

### 6. Configure the frontend

```bash
cd ../frontend
npm install
cp .env.example .env   # Windows: copy .env.example .env
```

Edit `frontend/.env` with your Firebase config **and** the backend URL:

```env
VITE_BASE_URL=http://localhost:4000

VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

Get Firebase values from the [Firebase Console](https://console.firebase.google.com/) → Project settings → Your apps.

### 7. Configure the video editor (optional)

Only needed if you are running the editor locally:

```bash
cd ../video-editor
pnpm install   # or: npm install
```

Create `video-editor/.env`:

```env
PEXELS_API_KEY=your_pexels_api_key

# Optional — only needed for render/transcribe API routes
COMBO_SK=
COMBO_SH_JWT=
```

## Run the app

Use **two terminals** for the main stack.

**Terminal 1 — backend:**

```bash
cd backend
npm start
```

Expected output: `Server is running on port 4000` and `Connected to PostgreSQL database`.

**Terminal 2 — frontend:**

```bash
cd frontend
npm run dev
```

Open http://localhost:5173

**Staff / admin portals (dev routes; production uses subdomains):**

| Portal | Login URL | After login |
|--------|-----------|-------------|
| Admin | http://localhost:5173/admin | http://localhost:5173/admin/dashboard |
| Staff (moderators) | http://localhost:5173/staff | http://localhost:5173/staff/dashboard |

Set `VITE_BASE_URL=http://localhost:4000` in `frontend/.env` (required for login API calls).

**Password for all staff & admin accounts:** `staff123`

| Portal | Example login |
|--------|----------------|
| Admin | `admin` or `admin@ensemble.dev` |
| Staff | `support_moderator` or `support@ensemble.dev` (and other staff emails above) |

Re-run `npm run seed` to reset data; staff emails stay the same.

**Terminal 3 — video editor (optional):**

```bash
cd video-editor
pnpm dev   # or: npm run dev
```

Open http://localhost:3000

## Available scripts

### Backend (`backend/`)

| Command        | Description                          |
|----------------|--------------------------------------|
| `npm start`      | Start API with nodemon (port 4000)   |
| `npm run db:setup` | Create DB + apply schema           |
| `npm run seed`   | Insert sample users and staff        |
| `npm run clean`  | Truncate users, staff, and accounts  |

### Frontend (`frontend/`)

| Command         | Description                    |
|-----------------|--------------------------------|
| `npm run dev`   | Start Vite dev server          |
| `npm run build` | Production build               |
| `npm run preview` | Preview production build     |

### Video editor (`video-editor/`)

| Command       | Description              |
|---------------|--------------------------|
| `pnpm dev`    | Start Next.js dev server |
| `pnpm build`  | Production build         |
| `pnpm start`  | Run production build     |

## Troubleshooting

### `ERR_CONNECTION_REFUSED` on `localhost:4000`

The backend is not running. In the backend terminal you should see `Server is running on port 4000`. If nodemon shows a crash:

- **MongoDB:** `MONGODB_URI` is optional; the server starts without it (forums need Mongo later).
- Restart: `cd backend` → `npm start`

### `Redis Client Error: WRONGPASS` or login returns Internal server error

Redis credentials in `backend/.env` are wrong. For local dev, add to `backend/.env`:

```env
REDIS_USE_MEMORY=true
```

Then restart the backend. Sessions and login lockout will use an in-memory store instead of Redis.

### `Redis Client Error: WRONGPASS invalid username-password pair`

Redis rejected the credentials in `REDIS_URL`. The backend keeps retrying and auth/session features will not work until this is fixed.

**Fix:**

1. Open `backend/.env`
2. Set `REDIS_URL` to match your Redis instance:
   - No password: `redis://127.0.0.1:6379`
   - With password: `redis://:password@127.0.0.1:6379`
   - Redis Cloud / hosted: copy the full connection URL from your provider dashboard
3. Restart the backend (`Ctrl+C`, then `npm start` again)

### `database "ensemble" does not exist` (or your `DB_NAME`)

Postgres is running but the database named in `DB_NAME` was never created. Run:

```bash
cd backend
npm run db:setup
npm run seed
```

### `Connection error` (PostgreSQL)

Check that Postgres is running and that `DB_USER`, `DB_HOST`, `DB_NAME`, `DB_PASSWORD`, and `DB_PORT` in `backend/.env` are correct.

### Frontend cannot reach the API

- Confirm the backend is running on port 4000
- Confirm `VITE_BASE_URL=http://localhost:4000` is set in `frontend/.env`
- Restart `npm run dev` after changing `.env` (Vite only reads env vars at startup)

### Google sign-in fails

Verify all `VITE_FIREBASE_*` variables in `frontend/.env` match your Firebase web app config, and that Google auth is enabled in the Firebase Console.

## Environment files

Never commit real secrets. These files are gitignored:

- `backend/.env`
- `frontend/.env`
- `video-editor/.env`

Use the `.env.example` files in each directory as templates.
