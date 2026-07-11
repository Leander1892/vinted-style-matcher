-- Fit reference measurements: add the fields that actually determine fit,
-- especially hem width -- the single measurement that defines "wide leg",
-- which a keyword alone said nothing about.
alter table profile_fit_references
  add column hem_width_cm numeric(5,1),
  add column thigh_width_cm numeric(5,1),
  add column knee_width_cm numeric(5,1),
  add column armhole_width_cm numeric(5,1),
  add column rise_type text check (rise_type in ('low', 'mid', 'high'));

-- Colors move from a flat preferred/excluded list to a role per style
-- direction (basis/akzent/vermeiden), so a palette reads as belonging to
-- a specific direction instead of one undifferentiated global list.
-- Existing rows predate this model and are being rebuilt from scratch
-- alongside the new style directions, so they're cleared here rather
-- than remapped.
delete from profile_colors;
alter table profile_colors rename column preference to role;
alter table profile_colors drop constraint if exists profile_colors_preference_check;
alter table profile_colors add constraint profile_colors_role_check
  check (role in ('basis', 'akzent', 'vermeiden'));

-- Materials get their own table instead of being mixed into free-text
-- style keywords alongside silhouette words and vibe descriptions.
create table profile_materials (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  style_direction_id uuid references style_directions(id) on delete cascade,
  material text not null,
  role text not null default 'bevorzugt' check (role in ('bevorzugt', 'vermeiden')),
  unique (profile_id, style_direction_id, material)
);

-- Silhouette rules, one per style direction x garment category, replacing
-- loose words like "wide leg"/"Bundfalte" with a structured fit type.
create table profile_silhouette_rules (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  style_direction_id uuid not null references style_directions(id) on delete cascade,
  garment_category text not null check (garment_category in ('oberteil', 'hose', 'jacke', 'schuhe')),
  fit_type text check (fit_type in ('eng', 'regular', 'wide', 'oversized')),
  rise_type text check (rise_type in ('low', 'mid', 'high')),
  notes text,
  unique (profile_id, style_direction_id, garment_category)
);
