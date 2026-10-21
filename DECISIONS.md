# Decisions

## 1. Duplicate prevention (R2): idempotency key + unique index

**Decision.** The create form generates one UUID when it opens and sends it as an
`Idempotency-Key` header on every submit attempt. The database has a unique index on
`(createdById, idempotencyKey)`. When a second request with the same key arrives, the
insert fails (Prisma `P2002`) and the server returns the original order with 200
instead of 201. A SHA-256 hash of the request body is stored with the key; reusing a
key with a different body returns 422 rather than silently returning the wrong order.
Keys are scoped per agent, so one agent can never receive another agent's order.

**Alternative considered: deduplicate on business data** (same customer email + same
items within N minutes). Rejected: it blocks legitimate repeat orders, and doing it
safely still needs a unique constraint, otherwise two requests both pass the check
before either inserts.

**Limits.** If an agent reloads the page and submits again, the form has a new key, so
a second order is created. Two agents entering the same phone order also create two
orders. Keys are never cleaned up.

## 2. Pagination: keyset cursor + "Load more", not page numbers

**Decision.** The list uses Prisma's cursor pagination, ordered by the sort column
plus `id` as a tie-breaker. There's a composite index for each sort, with and without
the status filter. The API fetches `limit + 1` rows to know whether another page
exists, instead of running `COUNT(*)`. The client keeps loaded pages in memory; no row
virtualisation was needed. Measured on 50k rows: 2–3 ms per page; 22 ms worst case (a
search that matches nothing scans the table).

**Alternative considered: OFFSET/LIMIT with numbered pages.** Rejected: a deep OFFSET
still reads every skipped row; new orders arriving shift the pages, so rows get
skipped or repeated; and showing a page count needs a COUNT over the filtered table.

**Cost.** You can't jump to page 37, and there's no total count. If the cursor row is
deleted between page loads, the next page comes back empty.

## 3. Data access: Prisma instead of raw SQL

**Decision.** Prisma 7 with the better-sqlite3 driver adapter. The schema, migrations
and TypeScript types all come from one `schema.prisma` file, and enums are shared by
the API and seed script.

**Alternative considered: raw SQL with better-sqlite3.** I started this way. It makes
the SQL fully visible and needs no code generation. Rejected because I'd have to
hand-write migrations, row types and query-building code for filters and cursors,
which is exactly where small mistakes hide.

**Cost.** `createMany` can't create nested items, so the seed assigns order ids
itself. SQLite stores Prisma enums as plain TEXT, so only the Prisma client enforces
the allowed values. Cursor pagination is less visible than a hand-written query.

## AI tools

I used Claude Code (Anthropic, Opus model) as a pair programmer throughout:
- It proposed the overall plan and the backend code step by step. I typed the backend
  myself and ran each step's checks (seed, curl checks for auth and duplicates).
- I chose Prisma over the raw-SQL approach it first suggested.
- It wrote the React frontend and the README setup section, which I reviewed and ran.
- I used it to review the contractor's auth middleware; the findings list is in the README.
