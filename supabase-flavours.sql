-- Fitness Factory - flavours and per-location sub-products (variants).
-- Run in Supabase Dashboard > SQL Editor.
--
-- The POS (SQL Server) stays read-only and knows nothing about flavours; this
-- is the writable layer, linked by Stock.itcode.
-- RLS is on with no policies: only the API's secret key can read or write.

-- ---------------------------------------------------------------- flavours
-- The master list. A flavour is defined ONCE here and picked from a dropdown,
-- so the same flavour can never end up stored three different ways.
create table if not exists public.flavours (
  id          serial      primary key,
  name        text        not null unique,   -- shown in the dropdown
  code        text        not null unique,   -- short, builds codes like PRT060-CHOC
  sort_order  int         not null default 0,
  active      boolean     not null default true,
  created_at  timestamptz not null default now()
);

insert into public.flavours (name, code, sort_order) values
  ('Chocolate', 'CHOC', 1), ('Vanilla', 'VAN', 2), ('Strawberry', 'STRAW', 3),
  ('Cookies and Cream', 'CC', 4), ('Banana', 'BAN', 5), ('Unflavoured', 'UNF', 6)
on conflict (name) do nothing;

-- ----------------------------------------------------------- sub-products
-- One row per (POS product x flavour x location). The PRIMARY KEY is those
-- three columns: the combination IS the identity, so duplicates are impossible
-- by definition and there is no surrogate id.
--
-- Dropped and recreated because the key and columns changed. Safe while empty.
drop table if exists public.product_variants;

create table public.product_variants (
  item_code       text        not null,                   -- POS Stock.itcode, trimmed
  flavour_id      int         not null references public.flavours(id) on delete restrict,
  -- dbo.Stock column names EXACTLY, so reconciliation compares like with like.
  -- To add a shop later, alter this CHECK.
  location        text        not null check (location in ('HCM','One_Galle_Face','Hill_Street','Gym_Store')),

  qty             int         not null default 0 check (qty >= 0),
  -- Selling price for THIS sub-product. NULL means "use the POS price of the
  -- parent product", which is the normal case when flavours all cost the same.
  price           numeric(12,2) check (price is null or price >= 0),
  -- Whether this sub-product appears on the website at all. Separate from qty:
  -- out of stock still shows (greyed out), hidden does not show.
  visible_on_web  boolean     not null default true,

  active          boolean     not null default true,
  image_url       text,
  sort_order      int         not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  primary key (item_code, flavour_id, location)
);

-- The PK already indexes item_code first, so no separate index is needed for it.
create index if not exists product_variants_location_idx on public.product_variants (location, qty);
create index if not exists product_variants_web_idx      on public.product_variants (visible_on_web, active);

-- -------------------------------------------------------------------- RLS
alter table public.flavours         enable row level security;
alter table public.product_variants enable row level security;

select 'flavours' as name, count(*) as rows from public.flavours
union all select 'product_variants', count(*) from public.product_variants;
