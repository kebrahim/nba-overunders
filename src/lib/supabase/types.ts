// Hand-written to match supabase/migrations/0001_init.sql. Everything the
// app touches lives in the `nba` schema (profiles there is a view over the
// NFL app's shared public.profiles). To regenerate:
//   npx supabase gen types typescript --project-id <id> --schema nba > src/lib/supabase/types.ts

export type Conference = "East" | "West";
export type Division = "Atlantic" | "Central" | "Southeast" | "Northwest" | "Pacific" | "Southwest";
// Kept as an alias: NBA division names are unique on their own, so a
// team's division and a division-pick key are the same type.
export type DivisionName = Division;
export type Side = "over" | "under";
export type GameStatus = "scheduled" | "live" | "final";
export type DraftSessionStatus = "pending" | "active" | "completed";
export type WinTotalSource = "manual" | "api";

export const DB_SCHEMA = "nba";

export interface Database {
  nba: {
    Tables: {
      players: {
        Row: {
          user_id: string;
          joined_at: string;
        };
        Insert: Partial<Database["nba"]["Tables"]["players"]["Row"]> & { user_id: string };
        Update: Partial<Database["nba"]["Tables"]["players"]["Row"]>;
        Relationships: [];
      };
      // Really a view over public.profiles, filtered to players. It's
      // updatable, so it's typed as a table.
      profiles: {
        Row: {
          id: string;
          display_name: string;
          email: string;
          phone: string | null;
          is_commissioner: boolean;
          is_demo: boolean;
          sms_opted_out_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["nba"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          display_name: string;
          email: string;
        };
        Update: Partial<Database["nba"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      teams: {
        Row: {
          id: number;
          name: string;
          code: string;
          conference: Conference;
          division: DivisionName;
          win_total_line: number | null;
          win_total_source: WinTotalSource;
          win_total_updated_at: string | null;
        };
        Insert: Partial<Database["nba"]["Tables"]["teams"]["Row"]> & {
          name: string;
          code: string;
          conference: Conference;
          division: DivisionName;
        };
        Update: Partial<Database["nba"]["Tables"]["teams"]["Row"]>;
        Relationships: [];
      };
      games: {
        Row: {
          id: number;
          week: number;
          home_team_id: number;
          away_team_id: number;
          home_score: number | null;
          away_score: number | null;
          status: GameStatus;
          tipoff_utc: string;
          counts_toward_record: boolean;
        };
        Insert: Partial<Database["nba"]["Tables"]["games"]["Row"]> & {
          id: number;
          week: number;
          home_team_id: number;
          away_team_id: number;
          tipoff_utc: string;
        };
        Update: Partial<Database["nba"]["Tables"]["games"]["Row"]>;
        Relationships: [];
      };
      draft_sessions: {
        Row: {
          id: string;
          status: DraftSessionStatus;
          total_rounds: number;
          current_round: number;
          current_pick_index: number;
          snake_order: string[];
          created_at: string;
          completed_at: string | null;
        };
        Insert: Partial<Database["nba"]["Tables"]["draft_sessions"]["Row"]>;
        Update: Partial<Database["nba"]["Tables"]["draft_sessions"]["Row"]>;
        Relationships: [];
      };
      draft_picks: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          team_id: number;
          side: Side;
          round: number;
          pick_number: number;
          picked_at: string;
        };
        Insert: Partial<Database["nba"]["Tables"]["draft_picks"]["Row"]> & {
          session_id: string;
          user_id: string;
          team_id: number;
          side: Side;
          round: number;
          pick_number: number;
        };
        Update: Partial<Database["nba"]["Tables"]["draft_picks"]["Row"]>;
        Relationships: [];
      };
      division_predictions: {
        Row: {
          user_id: string;
          division: Division;
          predicted_team_id: number;
          created_at: string;
        };
        Insert: Partial<Database["nba"]["Tables"]["division_predictions"]["Row"]> & {
          user_id: string;
          division: Division;
          predicted_team_id: number;
        };
        Update: Partial<Database["nba"]["Tables"]["division_predictions"]["Row"]>;
        Relationships: [];
      };
      division_winners: {
        Row: {
          division: Division;
          team_id: number;
          set_at: string;
        };
        Insert: Partial<Database["nba"]["Tables"]["division_winners"]["Row"]> & {
          division: Division;
          team_id: number;
        };
        Update: Partial<Database["nba"]["Tables"]["division_winners"]["Row"]>;
        Relationships: [];
      };
      tiebreaker_predictions: {
        Row: {
          user_id: string;
          points_guess: number;
          created_at: string;
        };
        Insert: Partial<Database["nba"]["Tables"]["tiebreaker_predictions"]["Row"]> & {
          user_id: string;
          points_guess: number;
        };
        Update: Partial<Database["nba"]["Tables"]["tiebreaker_predictions"]["Row"]>;
        Relationships: [];
      };
      app_settings: {
        Row: {
          key: string;
          value: string | null;
        };
        Insert: Partial<Database["nba"]["Tables"]["app_settings"]["Row"]> & {
          key: string;
        };
        Update: Partial<Database["nba"]["Tables"]["app_settings"]["Row"]>;
        Relationships: [];
      };
      sent_messages: {
        Row: {
          id: number;
          kind: string;
          target: "self" | "group";
          week: number | null;
          message: string;
          sent_at: string;
        };
        Insert: Partial<Database["nba"]["Tables"]["sent_messages"]["Row"]> & {
          kind: string;
          target: "self" | "group";
          message: string;
        };
        Update: Partial<Database["nba"]["Tables"]["sent_messages"]["Row"]>;
        Relationships: [];
      };
    };
    Views: {
      team_records: {
        Row: {
          team_id: number;
          wins: number;
          losses: number;
          games_played: number;
        };
        Relationships: [];
      };
      league_total_points: {
        Row: {
          total_points: number;
          games_final: number;
        };
        Relationships: [];
      };
      draft_pick_scores: {
        Row: {
          pick_id: string;
          session_id: string;
          user_id: string;
          team_id: number;
          side: Side;
          round: number;
          pick_number: number;
          wins: number;
          losses: number;
          games_played: number;
          win_total_line: number | null;
          resolved: boolean;
          correct: boolean | null;
          bonus_points: number;
          bonus_final: boolean;
          points: number;
        };
        Relationships: [];
      };
      overall_leaderboard: {
        Row: {
          user_id: string;
          display_name: string;
          draft_points: number;
          division_points: number;
          total_points: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
  };
}
