-- 2026-27 season win-total lines, sourced from Fanatics Sportsbook
-- (betfanatics.com, page dated Oct 16, 2026). Not a schema migration —
-- a one-off data load, run once after seed.sql and before the draft.
-- Lines move with news; adjust any team from /admin before the draft.
update teams as t
set
  win_total_line = v.line,
  win_total_source = 'manual',
  win_total_updated_at = now()
from (values
  ('ATL', 43.5),
  ('BOS', 51.5),
  ('BKN', 24.5),
  ('CHA', 39.5),
  ('CHI', 29.5),
  ('CLE', 48.5),
  ('DAL', 34.5),
  ('DEN', 49.5),
  ('DET', 49.5),
  ('GSW', 39.5),
  ('HOU', 48.5),
  ('IND', 44.5),
  ('LAC', 27.5),
  ('LAL', 46.5),
  ('MEM', 28.5),
  ('MIA', 46.5),
  ('MIL', 26.5),
  ('MIN', 48.5),
  ('NOP', 27.5),
  ('NYK', 52.5),
  ('OKC', 60.5),
  ('ORL', 43.5),
  ('PHI', 50.5),
  ('PHX', 40.5),
  ('POR', 43.5),
  ('SAC', 20.5),
  ('SAS', 59.5),
  ('TOR', 45.5),
  ('UTA', 35.5),
  ('WAS', 35.5)
) as v (code, line)
where t.code = v.code;

-- verify: should return 30 rows, none with a null win_total_line
select code, name, win_total_line from teams order by win_total_line desc;
