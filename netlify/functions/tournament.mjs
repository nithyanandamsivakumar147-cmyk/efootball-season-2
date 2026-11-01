import { getStore } from "@netlify/blobs";
import { initialState } from "../lib/initial-state.mjs";

const STORE = getStore("elite-four-season-02");
const STATE_KEY = "tournament-state";
const BACKUP_KEY = "latest-backup";
const MAX_BODY_BYTES = 1_000_000;

const json = (body, status = 200, extraHeaders = {}) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders
  }
});

// IMPORTANT: get() returns only the stored JSON value. We need getWithMetadata()
// because the API also needs the blob's ETag for safe conditional updates.
async function readState() {
  let current = await STORE.getWithMetadata(STATE_KEY, {
    type: "json",
    consistency: "strong"
  });

  if (!current) {
    await STORE.setJSON(STATE_KEY, initialState, { onlyIfNew: true });
    current = await STORE.getWithMetadata(STATE_KEY, {
      type: "json",
      consistency: "strong"
    });
  }

  if (!current || !current.data || !current.etag) {
    throw new Error("Tournament data could not be initialized or read from Netlify Blobs.");
  }

  return current; // { data, etag, metadata }
}

function validateState(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "Request body must be a JSON object.";
  if (value.schemaVersion !== 1) return "Unsupported tournament data version.";
  if (!Array.isArray(value.teams) || value.teams.length !== 4) return "Tournament must contain exactly four teams.";
  if (!Array.isArray(value.fixtures) || value.fixtures.length !== 12) return "Tournament must contain exactly 12 fixtures.";
  if (!Array.isArray(value.playerStats) || value.playerStats.length !== 92) return "Tournament must contain exactly 92 player-stat records.";
  if (!Array.isArray(value.goalkeeperStats)) return "Goalkeeper statistics must be an array.";

  const teamCodes = new Set(initialState.teams.map(t => t.code));
  if (JSON.stringify(value.teams) !== JSON.stringify(initialState.teams)) return "Team names and registered squads cannot be changed through the editor.";

  if (value.fixtures.some((f, i) => {
    const base = initialState.fixtures[i];
    return !base || f.id !== base.id || f.matchday !== base.matchday || f.homeTeam !== base.homeTeam || f.homeClub !== base.homeClub || f.awayTeam !== base.awayTeam || f.awayClub !== base.awayClub || f.stadium !== base.stadium;
  })) return "Fixture teams, matchdays and stadiums must match the original tournament schedule.";

  for (const f of value.fixtures) {
    if (!teamCodes.has(f.homeTeam) || !teamCodes.has(f.awayTeam) || f.homeTeam === f.awayTeam) return "A fixture contains an invalid team.";
    for (const score of [f.homeGoals, f.awayGoals]) {
      if (score !== null && (!Number.isInteger(score) || score < 0 || score > 99)) return "Scores must be whole numbers from 0 to 99, or blank.";
    }
  }

  const roster = new Set(initialState.teams.flatMap(t => t.squad.map(player => `${t.code}|${player}`)));
  const submittedPlayers = new Set();
  for (const p of value.playerStats) {
    const id = `${p.team}|${p.player}`;
    if (!teamCodes.has(p.team) || !roster.has(id) || submittedPlayers.has(id)) return "Player-stat records must match the original 92-player squad list without duplicates.";
    submittedPlayers.add(id);
    for (const n of [p.goals, p.assists]) if (!Number.isInteger(n) || n < 0 || n > 999) return "Goals and assists must be whole numbers from 0 to 999.";
  }
  if (submittedPlayers.size !== 92) return "All 92 registered players must remain in the player-stat list.";

  const keeperIds = new Set();
  for (const g of value.goalkeeperStats) {
    const id = `${g.team}|${g.player}`;
    if (!teamCodes.has(g.team) || !roster.has(id) || keeperIds.has(id)) return "Goalkeeper entries must be unique players from the registered squads.";
    keeperIds.add(id);
    for (const n of [g.cleanSheets, g.saves]) if (!Number.isInteger(n) || n < 0 || n > 9999) return "Clean sheets and saves must be whole numbers from 0 to 9999.";
  }
  return null;
}

export default async (request) => {
  try {
    if (request.method === "GET") {
      const url = new URL(request.url);
      if (url.searchParams.get("backup") === "latest") {
        const backup = await STORE.get(BACKUP_KEY, { type: "json", consistency: "strong" });
        if (!backup) return json({ error: "No backup is available yet." }, 404);
        return json(backup);
      }

      const current = await readState();
      return json(
        { data: current.data, etag: current.etag },
        200,
        { ETag: current.etag }
      );
    }

    if (request.method === "PUT") {
      const declaredLength = Number(request.headers.get("content-length") || 0);
      if (declaredLength > MAX_BODY_BYTES) return json({ error: "Update is too large." }, 413);
      const raw = await request.text();
      if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return json({ error: "Update is too large." }, 413);

      let next;
      try { next = JSON.parse(raw); }
      catch { return json({ error: "Request body is not valid JSON." }, 400); }

      // Prefer the standard If-Match header; accept the same version from the
      // request body as a fallback if an intermediary strips conditional headers.
      const expectedETag = request.headers.get("if-match") || next._expectedETag;
      delete next._expectedETag;
      if (!expectedETag) return json({ error: "Missing save version. Reload the page and try again." }, 428);

      const validationError = validateState(next);
      if (validationError) return json({ error: validationError }, 400);

      const current = await readState();
      if (expectedETag !== current.etag) {
        return json(
          { error: "Someone else saved changes first. Your page is out of date; reload the latest data before editing again." },
          409,
          { ETag: current.etag }
        );
      }

      await STORE.setJSON(BACKUP_KEY, {
        savedAt: new Date().toISOString(),
        data: current.data
      });

      next.updatedAt = new Date().toISOString();
      const result = await STORE.setJSON(STATE_KEY, next, { onlyIfMatch: expectedETag });
      if (!result.modified) {
        const latest = await readState();
        return json(
          { error: "Another member saved at the same time. Reload the latest data before saving again." },
          409,
          { ETag: latest.etag }
        );
      }

      const saved = await readState();
      return json(
        { ok: true, data: saved.data, etag: saved.etag },
        200,
        { ETag: saved.etag }
      );
    }

    return json({ error: "Method not allowed." }, 405, { Allow: "GET, PUT" });
  } catch (error) {
    console.error("[ELITE FOUR API]", {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      cause: error?.cause?.message,
      stack: error?.stack
    });
    return json({ error: "The tournament service had an unexpected problem. Check the Netlify Function logs." }, 500);
  }
};

export const config = { path: "/api/tournament" };
