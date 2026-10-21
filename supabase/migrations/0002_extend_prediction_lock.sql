-- Reopens division-winner picks until the end of Thursday 10/22/2026
-- (11:59 PM ET = 03:59 UTC Friday), instead of opening tip. Until then,
-- each player sees only their own division picks again. Keep in sync with
-- PICKS_LOCK_AT in src/lib/domain/season.ts. (Tiebreaker guesses are
-- locked by the app alone.) Paste into the Supabase SQL editor.
set search_path = nba, public;

alter policy "division picks visible to owner, commissioner, or after lock"
  on division_predictions
  using (
    auth.uid() = user_id
    or now() >= timestamptz '2026-10-23 03:59:00+00'
    or public.is_commissioner()
  );

alter policy "users can insert their own division predictions before lock"
  on division_predictions
  with check (auth.uid() = user_id and now() < timestamptz '2026-10-23 03:59:00+00');

alter policy "users can update their own division predictions before lock"
  on division_predictions
  using (auth.uid() = user_id and now() < timestamptz '2026-10-23 03:59:00+00')
  with check (auth.uid() = user_id and now() < timestamptz '2026-10-23 03:59:00+00');
