# Billing System

MVP billing app (cloud-first): Next.js backend + tRPC + Drizzle + PostgreSQL.

## Structure

- **apps/backend** – Next.js App Router app (API + future UI). tRPC at `/api/trpc`.
- **packages/db** – Drizzle schema and client (companies, users, customers, products, invoices, payments).
- **packages/api** – tRPC routers: auth, company, customers, products, invoices, payments, dashboard.

## Setup

1. **Install**

   ```bash
   pnpm install
   ```

2. **Env**

   Copy `.env.example` to `.env` and set:

   - `DATABASE_URL` – PostgreSQL connection string.
   - `AUTH_SECRET` – Secret for signing session JWT (use a long random string in production).

3. **Database**

   ```bash
   pnpm db:generate   # Generate Drizzle migrations
   pnpm db:push       # Push schema to DB (creates tables)
   ```

4. **Run**

   ```bash
   pnpm dev           # All workspaces
   # or
   pnpm dev:backend   # Only Next.js backend
   ```

   Backend: http://localhost:3000

## First user

Create a company and user in the DB (e.g. via Drizzle Studio `pnpm db:studio` or a seed script):

- Insert into `Company` (name, plan_status, etc.).
- Insert into `User` (companyId, email, passwordHash from bcrypt hash of password).

Then use `auth.login` with that email/password; the API returns a JWT. The client should set it as a cookie `billing_session=<token>` so `auth.me` and protected procedures work.
