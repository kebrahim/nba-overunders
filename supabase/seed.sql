-- All 30 NBA teams. win_total_line is left null here — load the season's
-- lines with supabase/win_totals_2026_27.sql (or set them per team from
-- /admin) before the draft starts.
insert into nba.teams (name, code, conference, division) values
  ('Boston Celtics', 'BOS', 'East', 'Atlantic'),
  ('Brooklyn Nets', 'BKN', 'East', 'Atlantic'),
  ('New York Knicks', 'NYK', 'East', 'Atlantic'),
  ('Philadelphia 76ers', 'PHI', 'East', 'Atlantic'),
  ('Toronto Raptors', 'TOR', 'East', 'Atlantic'),

  ('Chicago Bulls', 'CHI', 'East', 'Central'),
  ('Cleveland Cavaliers', 'CLE', 'East', 'Central'),
  ('Detroit Pistons', 'DET', 'East', 'Central'),
  ('Indiana Pacers', 'IND', 'East', 'Central'),
  ('Milwaukee Bucks', 'MIL', 'East', 'Central'),

  ('Atlanta Hawks', 'ATL', 'East', 'Southeast'),
  ('Charlotte Hornets', 'CHA', 'East', 'Southeast'),
  ('Miami Heat', 'MIA', 'East', 'Southeast'),
  ('Orlando Magic', 'ORL', 'East', 'Southeast'),
  ('Washington Wizards', 'WAS', 'East', 'Southeast'),

  ('Denver Nuggets', 'DEN', 'West', 'Northwest'),
  ('Minnesota Timberwolves', 'MIN', 'West', 'Northwest'),
  ('Oklahoma City Thunder', 'OKC', 'West', 'Northwest'),
  ('Portland Trail Blazers', 'POR', 'West', 'Northwest'),
  ('Utah Jazz', 'UTA', 'West', 'Northwest'),

  ('Golden State Warriors', 'GSW', 'West', 'Pacific'),
  ('LA Clippers', 'LAC', 'West', 'Pacific'),
  ('Los Angeles Lakers', 'LAL', 'West', 'Pacific'),
  ('Phoenix Suns', 'PHX', 'West', 'Pacific'),
  ('Sacramento Kings', 'SAC', 'West', 'Pacific'),

  ('Dallas Mavericks', 'DAL', 'West', 'Southwest'),
  ('Houston Rockets', 'HOU', 'West', 'Southwest'),
  ('Memphis Grizzlies', 'MEM', 'West', 'Southwest'),
  ('New Orleans Pelicans', 'NOP', 'West', 'Southwest'),
  ('San Antonio Spurs', 'SAS', 'West', 'Southwest')
on conflict (code) do nothing;
