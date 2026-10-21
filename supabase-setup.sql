-- Fitness Factory - role/page permission matrix.
-- Run once in Supabase Dashboard > SQL Editor > New query.
--
-- Only the API's secret key touches this table. RLS is enabled with NO policies,
-- which denies every anon/authenticated client outright; the secret key
-- (service_role) bypasses RLS, so the API still reads and writes it normally.

create table if not exists public.role_permissions (
  role        text primary key,
  pages       text[]      not null default '{}',
  updated_at  timestamptz not null default now()
);

alter table public.role_permissions enable row level security;

-- Starting point: tiered by sensitivity. Edit from the Users page afterwards.
-- 'items' is withheld below manager level because it exposes cost and margin.
insert into public.role_permissions (role, pages) values
  ('admin',   array['dashboard','today','items','stock']),
  ('manager', array['dashboard','today','stock']),
  ('viewer',  array['dashboard','today'])
on conflict (role) do nothing;

select role, pages from public.role_permissions order by role;
