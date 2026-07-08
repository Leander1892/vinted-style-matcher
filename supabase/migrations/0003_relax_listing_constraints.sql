-- The production scraper only reliably extracts the item link and a
-- best-effort price from the surrounding card text (Vinted's real DOM
-- structure for title/brand/photo isn't reverse-engineered yet). Storing a
-- fake placeholder title or a fake 0 price would be worse than storing the
-- honest unknown, so both become nullable.
alter table listings alter column title drop not null;
alter table listings alter column price_eur drop not null;
