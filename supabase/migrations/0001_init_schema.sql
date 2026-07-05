create extension if not exists pgcrypto;

-- Singleton global toggle, checked by the scraper before it makes any Vinted request.
create table app_settings (
  id int primary key default 1 check (id = 1),
  scraping_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into app_settings (id, scraping_enabled) values (1, false);

create table profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table style_directions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (profile_id, name)
);

create table profile_sizes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  category text not null,
  size_label text not null,
  unique (profile_id, category, size_label)
);

-- The single most important fit signal: measurements of a garment Leander
-- already owns and knows fits well (or his own body measurements), used as
-- ground truth to compare against measurements extracted from listings.
create table profile_fit_references (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  category text not null,
  source text not null default 'own_garment' check (source in ('own_garment', 'body_measurement')),
  chest_cm numeric(5,1),
  length_cm numeric(5,1),
  shoulder_cm numeric(5,1),
  sleeve_cm numeric(5,1),
  waist_cm numeric(5,1),
  inseam_cm numeric(5,1),
  tolerance_cm numeric(4,1) not null default 3.0,
  notes text,
  unique (profile_id, category)
);

create table profile_brands (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  style_direction_id uuid references style_directions(id) on delete cascade,
  brand_name text not null,
  preference text not null check (preference in ('preferred', 'excluded')),
  weight int not null default 1,
  unique (profile_id, style_direction_id, brand_name)
);

create table profile_excluded_categories (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  category text not null,
  unique (profile_id, category)
);

create table profile_style_keywords (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  style_direction_id uuid references style_directions(id) on delete cascade,
  keyword text not null,
  weight int not null default 1,
  unique (profile_id, style_direction_id, keyword)
);

create table profile_colors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  style_direction_id uuid references style_directions(id) on delete cascade,
  color_name text not null,
  preference text not null default 'preferred' check (preference in ('preferred', 'excluded')),
  unique (profile_id, style_direction_id, color_name)
);

create table profile_price_limits (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  category text not null,
  max_price_eur numeric(10,2) not null,
  unique (profile_id, category)
);

create table profile_condition_target (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  min_condition text not null,
  max_condition text not null,
  unique (profile_id)
);

create table search_configs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  catalog_id text,
  brand_ids text[],
  size_ids text[],
  color_ids text[],
  status_ids text[],
  price_to numeric(10,2),
  search_text text,
  is_active boolean not null default true,
  poll_interval_minutes int not null default 20,
  last_polled_at timestamptz,
  created_at timestamptz not null default now()
);

-- Raw cache of every listing ever seen, independent of any one profile so
-- overlapping searches across profiles never trigger duplicate scraping.
create table listings (
  id uuid primary key default gen_random_uuid(),
  vinted_item_id bigint not null unique,
  title text not null,
  description text,
  brand_name text,
  size_label text,
  category text,
  status_label text,
  price_eur numeric(10,2) not null,
  currency text not null default 'EUR',
  url text not null,
  photo_url text,
  seller_id bigint,
  seller_rating numeric(3,2),
  seller_reviews_count int,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  is_still_listed boolean not null default true,
  raw_payload jsonb
);
create index idx_listings_brand_category on listings(brand_name, category);

-- Measurements extracted from a listing's own text, compared against
-- profile_fit_references. This runs as a free, deterministic regex pass
-- during matching (Phase 3) -- long before any paid LLM step.
create table listing_measurements (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade unique,
  chest_cm numeric(5,1),
  length_cm numeric(5,1),
  shoulder_cm numeric(5,1),
  sleeve_cm numeric(5,1),
  waist_cm numeric(5,1),
  inseam_cm numeric(5,1),
  measurement_source text not null default 'none' check (
    measurement_source in ('description_regex', 'llm_extracted', 'brand_chart_estimate', 'none')
  ),
  fit_confidence text not null default 'unmeasured_estimate' check (
    fit_confidence in ('measured_fits', 'measured_risk', 'unmeasured_estimate')
  ),
  extracted_at timestamptz not null default now()
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  search_config_id uuid not null references search_configs(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  style_direction_id uuid references style_directions(id) on delete set null,
  match_score numeric(5,2) not null,
  score_breakdown jsonb,
  is_highlight boolean not null default false,
  review_status text not null default 'pending' check (review_status in ('pending', 'accepted', 'rejected')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (listing_id, search_config_id)
);
create index idx_matches_review_status on matches(review_status) where review_status = 'pending';

create table price_checks (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  comparable_count int not null,
  median_price_eur numeric(10,2),
  p25_price_eur numeric(10,2),
  p75_price_eur numeric(10,2),
  deal_score numeric(5,2),
  is_deal boolean not null default false,
  checked_at timestamptz not null default now()
);

-- Populated after a swipe-"Ja" or a manual check submission -- the one
-- part of the system that costs real money (Claude Haiku via Anthropic API).
create table deep_research_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) on delete cascade,
  manual_check_id uuid,
  collection_guess text,
  fit_notes text,
  bait_risk_score numeric(5,2),
  trust_note text,
  used_web_search boolean not null default false,
  raw_llm_response jsonb,
  created_at timestamptz not null default now(),
  check (
    (match_id is not null and manual_check_id is null) or
    (match_id is null and manual_check_id is not null)
  )
);

create table manual_checks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  submitted_url text not null,
  listing_id uuid references listings(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

alter table deep_research_results
  add constraint deep_research_results_manual_check_fk
  foreign key (manual_check_id) references manual_checks(id) on delete cascade;

create table notifications_sent (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  sent_at timestamptz not null default now(),
  unique (profile_id, listing_id)
);

create table scraper_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  search_configs_processed int,
  listings_found int,
  errors_count int,
  was_blocked boolean not null default false,
  notes text
);
