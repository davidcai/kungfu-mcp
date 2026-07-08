import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { KUNGFU_FACTIONS, findFaction, type KungfuFaction } from "./data.js";
import { rosterMarkdown, profileMarkdown } from "./format.js";

type SparOutcome = { rounds: string[]; verdict: string; winnerId: string | null };

export const listFactionsTool = createTool({
  id: "list_factions",
  description:
    "List all major kungfu factions known to the kung fu world. Returns a compact roster with each faction's id, name, and catchphrase. Use get_faction(id) for the full profile.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    factions: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        catchphrase: z.string(),
      }),
    ),
  }),
  execute: async () => ({
    factions: KUNGFU_FACTIONS.map((f) => ({
      id: f.id,
      name: f.name,
      catchphrase: f.catchphrase,
    })),
  }),
});

export const getFactionTool = createTool({
  id: "get_faction",
  description:
    "Retrieve the full profile for a single kungfu faction by id. Includes origin, philosophy, signature techniques (each with its own threat level), famous practitioners, a fun fact, and a catchphrase. If you don't know the id, call list_factions first.",
  inputSchema: z.object({
    id: z
      .string()
      .describe(
        "Faction id, e.g. 'shaolin', 'wudang', 'emei', 'beggar', 'tang', 'ancient-tomb', 'ming-cult', 'huashan'.",
      ),
  }),
  execute: async ({ id }) => {
    const faction = findFaction(id);
    if (!faction) {
      const known = KUNGFU_FACTIONS.map((s) => s.id).join(", ");
      throw new Error(
        `No faction with id "${id}" was found in the kung fu world. It may have been wiped out in a tragic backstory, or you made it up. Known ids: ${known}.`,
      );
    }
    return profileMarkdown(faction);
  },
});

export const sparTool = createTool({
  id: "spar",
  description:
    "Narrate a (non-canonical, highly subjective) sparring match between two kungfu factions. Pass two faction ids. The narrator is biased, the outcome is questionable, and both factions will be upset. For demonstration and entertainment only.",
  inputSchema: z.object({
    faction_a: z.string().describe("First faction id (e.g. 'shaolin')."),
    faction_b: z.string().describe("Second faction id (e.g. 'wudang')."),
    champion_a: z
      .string()
      .optional()
      .describe(
        "Display name of the fighter championing the first faction (e.g. 'Neo'). Defaults to the faction name.",
      ),
    champion_b: z
      .string()
      .optional()
      .describe(
        "Display name of the fighter championing the second faction (e.g. 'Morpheus'). Defaults to the faction name.",
      ),
  }),
  outputSchema: z.object({
    rounds: z.array(z.string()),
    verdict: z.string(),
    winnerId: z.string().nullable(),
  }),
  execute: async ({ faction_a, faction_b, champion_a, champion_b }) => {
    const a = findFaction(faction_a);
    const b = findFaction(faction_b);

    if (!a || !b) {
      const missing = [!a && faction_a, !b && faction_b].filter(Boolean).join(", ");
      const known = KUNGFU_FACTIONS.map((s) => s.id).join(", ");
      throw new Error(
        `Cannot schedule a spar: faction(s) ${missing} not found in the kung fu world. One cannot fight what does not exist. Known ids: ${known}.`,
      );
    }

    if (a.id === b.id) {
      return {
        rounds: [] as string[],
        verdict: `${a.name} cannot spar ${a.name}. That is called 'practice' and the kung fu world frowns on it being dramatized.`,
        winnerId: null,
      } satisfies SparOutcome;
    }

    const nameA = champion_a ?? a.name;
    const nameB = champion_b ?? b.name;
    return runSpar(a, b, nameA, nameB);
  },
});

const ROUND_TEMPLATES: ((moveA: string, moveB: string) => string)[] = [
  (moveA, moveB) => `${moveA}. ${moveB}. The crowd gasps. A chicken flees.`,
  (moveA, moveB) => `${moveA}. ${moveB}. The referee takes notes, then cover.`,
  (moveA, moveB) => `${moveA}. ${moveB}. Somewhere, a master sighs and pours tea.`,
  (moveA, moveB) => `${moveA}. ${moveB}. A nearby poet begins drafting.`,
  (moveA, moveB) => `${moveA}. ${moveB}. The arena floor files a complaint.`,
];

const ROUND_COUNT = 3;

function runSpar(a: KungfuFaction, b: KungfuFaction, nameA: string, nameB: string): SparOutcome {
  let scoreA = 0;
  let scoreB = 0;

  const rounds: string[] = [];
  for (let i = 0; i < ROUND_COUNT; i++) {
    const ta = pick(a.signatureTechniques);
    const tb = pick(b.signatureTechniques);
    scoreA += ta.threat;
    scoreB += tb.threat;
    const clash = pick(ROUND_TEMPLATES)(
      `${nameA} strikes with **${ta.name}** (threat ${ta.threat})`,
      `${nameB} answers with **${tb.name}** (threat ${tb.threat})`,
    );
    const edge =
      ta.threat > tb.threat
        ? ` Round to ${nameA}.`
        : tb.threat > ta.threat
          ? ` Round to ${nameB}.`
          : " The round is a wash.";
    rounds.push(clash + edge);
  }

  const winner = scoreA > scoreB ? a : scoreB > scoreA ? b : null;
  const winnerName = winner ? (winner.id === a.id ? nameA : nameB) : null;
  const verdict = winner
    ? `${winnerName} wins ${Math.max(scoreA, scoreB)} to ${Math.min(scoreA, scoreB)} on the techniques that landed. As ${winner.name} teaches: "${winner.catchphrase}"`
    : `A draw at ${scoreA} apiece. ${nameA} and ${nameB} retreat to write poetry about the affair. The kung fu world declares it "a classic."`;

  return { rounds, verdict, winnerId: winner?.id ?? null };
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
