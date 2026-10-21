# Orders Console

An operations console for browsing a large list of orders and registering phone orders without duplicates.

- **Backend:** Node.js, Express 5, Prisma 7, SQLite (`backend/`)
- **Frontend:** React 19, Vite, TypeScript (`frontend/`)

## Requirements

- Node.js 22 or newer (developed on Node 24)
- npm

Nothing else: SQLite is a local file and no external services are used.

## Run the project

You need two terminals: one for the API, one for the web app.

### 1. Backend (terminal 1)

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and set `JWT_SECRET` to a random string of at least 32 characters. This command prints one:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then install, create the database and start the API:

```bash
npm install
npm run setup   # creates orders.db, generates the Prisma client, seeds 50,000 orders (~15 s)
npm run dev     # API on http://localhost:3000
```

### 2. Frontend (terminal 2)

```bash
cd frontend
npm install
npm run dev     # app on http://localhost:5173
```

Open http://localhost:5173 and sign in. During development, Vite forwards `/api` requests to the backend on port 3000.

## Seeded users

| Role  | Email             | Password    |
| ----- | ----------------- | ----------- |
| Admin | `admin@sarh.test` | `Admin123!` |
| Agent | `agent@sarh.test` | `Agent123!` |

Agents can list and create orders. Deleting an order (`DELETE /api/orders/:id`) is admin-only, and the server enforces it.

## Configuration (`backend/.env`)

| Variable            | Default            | Purpose |
| ------------------- | ------------------ | ------- |
| `PORT`              | `3000`             | API port. The frontend proxy expects 3000. |
| `JWT_SECRET`        | (none, required)   | Signs session tokens. At least 32 characters; the API refuses to start without it. |
| `DATABASE_URL`      | `file:./orders.db` | SQLite file, relative to `backend/`. |
| `LIST_DELAY_MAX_MS` | `0`                | Demo only: adds a random 0–N ms delay to each list request (see below). |

## Seeing the stale-response protection (R1)

On localhost every list request returns in a few milliseconds, so responses never arrive out of order. To make them arrive out of order:

1. Set `LIST_DELAY_MAX_MS=1500` in `backend/.env` and restart `npm run dev`.
2. Change the status filter three times in quick succession, for example *paid → shipped → cancelled*.
3. Earlier requests often finish after later ones, but the table always ends up showing the last filter you picked.

Set it back to `0` when you're done.

## Useful scripts

Run these from `backend/`:

| Command               | What it does |
| --------------------- | ------------ |
| `npm run dev`         | Start the API with reload on change |
| `npm run setup`       | Apply migrations, generate the Prisma client and seed (first run) |
| `npm run seed`        | Wipe and re-seed the database (2 users, 50,000 orders) |
| `npm run db:migrate`  | Create a new migration after editing `prisma/schema.prisma` |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run build`       | Compile the API to `dist/` |

Run these from `frontend/`:

| Command         | What it does |
| --------------- | ------------ |
| `npm run dev`   | Start the Vite dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run lint`  | Run ESLint |

## Troubleshooting

- **`Invalid environment configuration`** on start: `backend/.env` is missing, or `JWT_SECRET` is shorter than 32 characters.
- **`Cannot find module '…/generated/prisma/client.js'`**: the Prisma client hasn't been generated. Run `npm run db:generate` in `backend/`.
- **Sign-in fails with "Request failed (500)"**: the backend isn't running on port 3000, so the Vite proxy has nothing to forward to.
