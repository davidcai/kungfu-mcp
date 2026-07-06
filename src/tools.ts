import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { KUNGFU_FACTIONS, findFaction, type KungfuFaction } from "./data.js";
import { rosterMarkdown, profileMarkdown } from "./format.js";

type SparOutcome = { rounds: string[]; verdict: string; winnerId: string | null };

export function registerTools(server: McpServer): void {
  server.registerTool(
    "list_factions",
    {
      description:
        "List all major kungfu factions known to the jianghu. Returns a compact roster with each faction's id, name, threat level, and catchphrase. Use get_faction(id) for the full profile.",
      inputSchema: {},
      outputSchema: {
        factions: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            threat: z.number(),
            catchphrase: z.string(),
          }),
        ),
      },
    },
    async () => ({
      content: [{ type: "text", text: rosterMarkdown() }],
      structuredContent: {
        factions: KUNGFU_FACTIONS.map((f) => ({
          id: f.id,
          name: f.name,
          threat: f.threatLevel,
          catchphrase: f.catchphrase,
        })),
      },
    }),
  );

  server.registerTool(
    "get_faction",
    {
      description:
        "Retrieve the full profile for a single kungfu faction by id. Includes origin, philosophy, signature techniques, famous practitioners, a fun fact, threat level, and a catchphrase. If you don't know the id, call list_factions first.",
      inputSchema: {
        id: z
          .string()
          .describe(
            "Faction id, e.g. 'shaolin', 'wudang', 'emei', 'beggar', 'tang', 'ancient-tomb', 'ming-cult', 'huashan'.",
          ),
      },
    },
    async ({ id }) => {
      const faction = findFaction(id);
      if (!faction) {
        const known = KUNGFU_FACTIONS.map((s) => s.id).join(", ");
        return {
          content: [
            {
              type: "text",
              text: `No faction with id "${id}" was found in the jianghu. It may have been wiped out in a tragic backstory, or you made it up. Known ids: ${known}.`,
            },
          ],
          isError: true,
        };
      }

      return { content: [{ type: "text", text: profileMarkdown(faction) }] };
    },
  );

  server.registerTool(
    "spar",
    {
      description:
        "Narrate a (non-canonical, highly subjective) sparring match between two kungfu factions. Pass two faction ids. The narrator is biased, the outcome is questionable, and both factions will be upset. For demonstration and entertainment only.",
      inputSchema: {
        faction_a: z.string().describe("First faction id (e.g. 'shaolin')."),
        faction_b: z.string().describe("Second faction id (e.g. 'wudang')."),
      },
      outputSchema: {
        rounds: z.array(z.string()),
        verdict: z.string(),
        winnerId: z.string().nullable(),
      },
    },
    async ({ faction_a, faction_b }) => {
      const a = findFaction(faction_a);
      const b = findFaction(faction_b);

      if (!a || !b) {
        const missing = [!a && faction_a, !b && faction_b].filter(Boolean).join(", ");
        const known = KUNGFU_FACTIONS.map((s) => s.id).join(", ");
        return {
          content: [
            {
              type: "text",
              text: `Cannot schedule a spar: faction(s) ${missing} not found in the jianghu. One cannot fight what does not exist. Known ids: ${known}.`,
            },
          ],
          isError: true,
        };
      }

      if (a.id === b.id) {
        const verdict = `${a.name} cannot spar ${a.name}. That is called 'practice' and the jianghu frowns on it being dramatized.`;
        return {
          content: [{ type: "text", text: verdict }],
          structuredContent: { rounds: [], verdict, winnerId: null } satisfies SparOutcome,
        };
      }

      const outcome = runSpar(a, b);
      return {
        content: [{ type: "text", text: sparNarration(a, b, outcome) }],
        structuredContent: outcome,
      };
    },
  );
}

function runSpar(a: KungfuFaction, b: KungfuFaction): SparOutcome {
  const winner = a.threatLevel > b.threatLevel ? a : a.threatLevel < b.threatLevel ? b : null;

  const rounds = [
    `${a.name} opens with ${a.signatureTechniques[0]}. ${b.name} responds with ${b.signatureTechniques[0]}. The crowd gasps. A chicken flees.`,
    `${a.name}'s philosophy ("${truncate(a.philosophy)}") meets ${b.name}'s philosophy ("${truncate(
      b.philosophy,
    )}"). Neither yields. The referee yields, emotionally.`,
    `${a.name} deploys ${pick(a.signatureTechniques)}. ${b.name} counters with ${pick(
      b.signatureTechniques,
    )}. Somewhere, a master sighs and pours tea.`,
  ];

  const verdict = winner
    ? `${winner.name} wins on threat level (${winner.threatLevel} vs ${
        winner.id === a.id ? b.threatLevel : a.threatLevel
      }). As ${winner.name} says: "${winner.catchphrase}"`
    : `A draw. Both factions retreat to write poetry about the affair. The jianghu declares it "a classic."`;

  return { rounds, verdict, winnerId: winner?.id ?? null };
}

function sparNarration(a: KungfuFaction, b: KungfuFaction, outcome: SparOutcome): string {
  return [
    `## Exhibition Spar: ${a.name} vs ${b.name}`,
    "",
    ...outcome.rounds.map((r, i) => `Round ${i + 1}: ${r}`),
    "",
    `Verdict: ${outcome.verdict}`,
    "",
    `_(This narration was produced by a biased bystander. Neither faction endorses the outcome. Both are considering legal action.)_`,
  ].join("\n");
}

function truncate(s: string, max = 60): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
