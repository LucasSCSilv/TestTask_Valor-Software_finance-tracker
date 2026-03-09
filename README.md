# FinTrack 💰

Personal finance tracker with authentication, dashboard, charts, budget alerts and reports.

**Stack:** React + Vite + Supabase + Zephyr Cloud

---

## 1. Prerequisites

- Node.js 20.19+ (or 22.12+)
- [Supabase](https://supabase.com) account (free)
- [Zephyr Cloud](https://app.zephyr-cloud.io) account (free)

---

## 2. Set up Supabase

### Create a project
1. Go to [app.supabase.com](https://app.supabase.com) → New Project
2. Copy the **Project URL** and **anon key** from Settings → API

### Run this SQL in the SQL Editor

```sql
-- Transactions
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  description text not null,
  amount numeric(10, 2) not null,
  category text not null,
  date date not null,
  created_at timestamp with time zone default now()
);
alter table public.transactions enable row level security;
create policy "Users can manage own transactions"
  on public.transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Custom categories
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  color text not null default '#94a3b8',
  created_at timestamp with time zone default now()
);
alter table public.categories enable row level security;
create policy "Users can manage own categories"
  on public.categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Monthly budgets
create table public.budgets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  category text not null,
  amount numeric(10, 2) not null,
  month integer not null,
  year integer not null,
  created_at timestamp with time zone default now()
);
alter table public.budgets enable row level security;
create policy "Users can manage own budgets"
  on public.budgets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### Enable email auth
- Supabase → Authentication → Providers → Email: **Enable**
- For development: Authentication → Settings → disable "Confirm email"

---

## 3. Configure environment variables

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

---

## 4. Install and run

```bash
npm install
npm run dev
```

Visit: http://localhost:5173

---

## 5. Deploy with Zephyr Cloud

```bash
npx zephyr-cli login
npm run build
```

Zephyr intercepts the build and deploys to its global edge network, generating a public URL instantly.
