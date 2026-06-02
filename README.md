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

### 4. Seed the database (optional)

Populates test staff and users. Requires the database schema to already exist.

```bash
npm run seed
```

Default seeded passwords:

- Staff accounts: `staff123`
- User accounts: `user123`

To wipe seeded data:

```bash
npm run clean
```

### 5. Configure the frontend

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

### 6. Configure the video editor (optional)

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
| `npm start`    | Start API with nodemon (port 4000)   |
| `npm run seed` | Insert sample users and staff        |
| `npm run clean`| Truncate users, staff, and accounts  |

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

### `Redis Client Error: WRONGPASS invalid username-password pair`

Redis rejected the credentials in `REDIS_URL`. The backend keeps retrying and auth/session features will not work until this is fixed.

**Fix:**

1. Open `backend/.env`
2. Set `REDIS_URL` to match your Redis instance:
   - No password: `redis://127.0.0.1:6379`
   - With password: `redis://:password@127.0.0.1:6379`
   - Redis Cloud / hosted: copy the full connection URL from your provider dashboard
3. Restart the backend (`Ctrl+C`, then `npm start` again)

### `Connection error` (PostgreSQL)

Check that Postgres is running and that `DB_USER`, `DB_HOST`, `DB_NAME`, `DB_PASSWORD`, and `DB_PORT` in `backend/.env` are correct. The database must exist and include the required tables.

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
