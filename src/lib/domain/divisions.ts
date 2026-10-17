import type { Conference, Division } from "@/lib/supabase/types";

export const DIVISIONS: Division[] = [
  "Atlantic",
  "Central",
  "Southeast",
  "Northwest",
  "Pacific",
  "Southwest",
];

export const CONFERENCE_BY_DIVISION: Record<Division, Conference> = {
  Atlantic: "East",
  Central: "East",
  Southeast: "East",
  Northwest: "West",
  Pacific: "West",
  Southwest: "West",
};
