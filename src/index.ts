#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { KUNGFU_FACTIONS, findFaction, type KungfuFaction } from "./data.js";

const server = new McpServer({
  name: "kungfu-mcp",
  version: "1.0.0",
});

// Tool 1: list_factions ---------------------------------------------------------
// No arguments. Returns the full roster of factions as a compact briefing.
server.registerTool(
  "list_factions",
  {
    description:
      "List all major kungfu factions known to the jianghu. Returns a compact roster with each faction's id, name, threat level, and catchphrase. Use get_faction(id) for the full dossier.",
    inputSchema: {},
  },
  async () => {
    const roster = KUNGFU_FACTIONS.map(
      (s) =>
        `- ${s.id}  ${s.name}  [threat ${s.threatLevel}/10]  "${s.catchphrase}"`,
    ).join("\n");

    const text = [
      "=== THE JIANGHU ROSTER ===",
      `${KUNGFU_FACTIONS.length} factions are currently accepting (and rejecting) disciples.`,
      "",
      roster,
      "",
      "Disclaimer: The jianghu accepts no responsibility for bruised egos, poisoned handshakes, or tragic backstories.",
    ].join("\n");

    return {
      content: [{ type: "text", text }],
    };
  },
);

// Tool 2: get_faction -----------------------------------------------------------
// Takes an id. Returns the full, humorous dossier for a single faction.
server.registerTool(
  "get_faction",
  {
    description:
      "Retrieve the full dossier for a single kungfu faction by id. Includes origin, philosophy, signature techniques, famous practitioners, a fun fact, threat level, and a catchphrase. If you don't know the id, call list_factions first.",
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

    const text = formatDossier(faction);
    return {
      content: [{ type: "text", text }],
    };
  },
);

function formatDossier(s: KungfuFaction): string {
  return [
    `╔══════════════════════════════════════════════════════════╗`,
    `║  ${s.name}                          `,
    `╚══════════════════════════════════════════════════════════╝`,
    `Faction:          ${s.faction}`,
    `Threat Level:     ${s.threatLevel}/10  (${threatLabel(s.threatLevel)})`,
    `Origin:           ${s.origin}`,
    `Philosophy:       ${s.philosophy}`,
    ``,
    `Signature Techniques:`,
    ...s.signatureTechniques.map((t) => `  • ${t}`),
    ``,
    `Famous Practitioners:`,
    ...s.famousPractitioners.map((p) => `  • ${p}`),
    ``,
    `Fun Fact:         ${s.funFact}`,
    `Catchphrase:       "${s.catchphrase}"`,
  ].join("\n");
}

function threatLabel(level: number): string {
  if (level >= 9) return "avoid eye contact";
  if (level >= 7) return "do not taunt";
  if (level >= 5) return "probably fine";
  return "a gentle breeze";
}

// Tool 3: spar ----------------------------------------------------------------
// Takes two faction ids and narrates a humorous sparring match between them.
server.registerTool(
  "spar",
  {
    description:
      "Narrate a (non-canonical, highly subjective) sparring match between two kungfu factions. Pass two faction ids. The narrator is biased, the outcome is questionable, and both factions will be upset. For demonstration and entertainment only.",
    inputSchema: {
      faction_a: z.string().describe("First faction id (e.g. 'shaolin')."),
      faction_b: z.string().describe("Second faction id (e.g. 'wudang')."),
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
      return {
        content: [
          {
            type: "text",
            text: `${a.name} cannot spar ${a.name}. That is called 'practice' and the jianghu frowns on it being dramatized.`,
          },
        ],
      };
    }

    const text = narrateSpar(a, b);
    return {
      content: [{ type: "text", text }],
    };
  },
);

function narrateSpar(a: KungfuFaction, b: KungfuFaction): string {
  // Deterministic, biased outcome: higher threat level wins; tie => chaos.
  const winner = a.threatLevel > b.threatLevel ? a : a.threatLevel < b.threatLevel ? b : null;

  const rounds = [
    `Round 1: ${a.name} opens with ${a.signatureTechniques[0]}. ${b.name} responds with ${b.signatureTechniques[0]}. The crowd gasps. A chicken flees.`,
    `Round 2: ${a.name}'s philosophy ("${truncate(a.philosophy)}") meets ${b.name}'s philosophy ("${truncate(
      b.philosophy,
    )}"). Neither yields. The referee yields, emotionally.`,
    `Round 3: ${a.name} deploys ${pick(a.signatureTechniques)}. ${b.name} counters with ${pick(
      b.signatureTechniques,
    )}. Somewhere, a master sighs and pours tea.`,
  ];

  const verdict = winner
    ? `Verdict: ${winner.name} wins on threat level (${winner.threatLevel} vs ${
        winner.id === a.id ? b.threatLevel : a.threatLevel
      }). As ${winner.name} says: "${winner.catchphrase}"`
    : `Verdict: A draw. Both factions retreat to write poetry about the affair. The jianghu declares it "a classic."`;

  return [
    `╔══════════════════════════════════════════════════════════╗`,
    `║  EXHIBITION SPAR: ${a.name} vs ${b.name}`.padEnd(60),
    `╚══════════════════════════════════════════════════════════╝`,
    ``,
    ...rounds,
    ``,
    verdict,
    ``,
    `(This narration was produced by a biased bystander. Neither faction endorses the outcome. Both are considering legal action.)`,
  ].join("\n");
}

function truncate(s: string, max = 60): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Bootstrap ------------------------------------------------------------------
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("kungfu-mcp server running on stdio. The jianghu is open for business.");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
