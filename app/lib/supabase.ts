const SUPABASE_URL = "https://umkepyhpcvuigdcsfvzz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_yFd4lvztSN6ifB9DXyic9w_3jn83u9u";

type JsonValue = string | number | boolean | null;

type GameEvent = {
  runId: string;
  eventName:
    | "game_started"
    | "game_ended"
    | "easter_egg_triggered"
    | "auto_research_reported";
  properties: Record<string, JsonValue>;
};

type PlayerFeedback = {
  runId: string;
  message: string;
  rating: number;
  endingId: string | null;
};

export type PublicGameStats = {
  total_finished_runs: number;
  average_accepted: number;
  average_submitted: number;
  ending_counts: Record<string, number>;
  easter_egg_counts: Record<string, number>;
};

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

async function insertRow(table: "game_events" | "player_feedback", payload: object) {
  if (!isSupabaseConfigured()) return false;

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function recordGameEvent({ runId, eventName, properties }: GameEvent) {
  if (!runId) return Promise.resolve(false);
  return insertRow("game_events", {
    run_id: runId,
    event_name: eventName,
    properties,
  });
}

export function submitPlayerFeedback({ runId, message, rating, endingId }: PlayerFeedback) {
  if (!runId || !message.trim()) return Promise.resolve(false);
  return insertRow("player_feedback", {
    run_id: runId,
    message: message.trim().slice(0, 600),
    rating: Math.max(1, Math.min(5, Math.round(rating))),
    ending_id: endingId,
  });
}

export async function fetchPublicGameStats(): Promise<PublicGameStats | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_public_game_stats`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    if (!response.ok) return null;
    return (await response.json()) as PublicGameStats;
  } catch {
    return null;
  }
}
