import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { KUNGFU_FACTIONS, findFaction, type KungfuFaction } from "./data.js";

const ROSTER_URI = "kungfu://jianghu/roster";
const MARKDOWN_MIME = "text/markdown";

// Defensive: strip CJK characters. data.ts is currently English-only, so this is a no-op
// safety net per the spec's "English-only resource content" decision.
function stripChinese(s: string): string {
  return s.replace(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+/g, "");
}

function rosterMarkdown(): string {
  const lines = KUNGFU_FACTIONS.map(
    (f) =>
      `- **${f.id}** — ${f.name} [threat ${f.threatLevel}/10] — "${stripChinese(f.catchphrase)}"`,
  ).join("\n");
  return [
    "# The Jianghu Roster",
    "",
    `${KUNGFU_FACTIONS.length} factions are currently accepting (and rejecting) disciples.`,
    "",
    lines,
    "",
    "_Disclaimer: The jianghu accepts no responsibility for bruised egos, poisoned handshakes, or tragic backstories._",
  ].join("\n");
}

function dossierMarkdown(f: KungfuFaction): string {
  return [
    `# ${f.name}`,
    "",
    `- **Faction:** ${stripChinese(f.faction)}`,
    `- **Threat Level:** ${f.threatLevel}/10 (${threatLabel(f.threatLevel)})`,
    `- **Origin:** ${stripChinese(f.origin)}`,
    `- **Philosophy:** ${stripChinese(f.philosophy)}`,
    "",
    "## Signature Techniques",
    ...f.signatureTechniques.map((t) => `- ${stripChinese(t)}`),
    "",
    "## Famous Practitioners",
    ...f.famousPractitioners.map((p) => `- ${stripChinese(p)}`),
    "",
    `**Fun Fact:** ${stripChinese(f.funFact)}`,
    "",
    `> "${stripChinese(f.catchphrase)}"`,
  ].join("\n");
}

function threatLabel(level: number): string {
  if (level >= 9) return "avoid eye contact";
  if (level >= 7) return "do not taunt";
  if (level >= 5) return "probably fine";
  return "a gentle breeze";
}

export function registerDataResources(server: McpServer): void {
  // Static resource: full roster as markdown.
  server.registerResource(
    "jianghu-roster",
    ROSTER_URI,
    { description: "The full jianghu faction roster, as markdown.", mimeType: MARKDOWN_MIME },
    async () => ({
      contents: [{ uri: ROSTER_URI, mimeType: MARKDOWN_MIME, text: rosterMarkdown() }],
    }),
  );

  // Template resource: per-faction dossier as markdown.
  const factionTemplate = new ResourceTemplate("kungfu://factions/{id}", {
    list: async () => ({
      resources: KUNGFU_FACTIONS.map((f) => ({
        uri: `kungfu://factions/${f.id}`,
        name: `${f.name} dossier`,
        description: `Dossier for ${f.name} — ${stripChinese(f.faction)}`,
        mimeType: MARKDOWN_MIME,
      })),
    }),
    complete: {
      id: () => KUNGFU_FACTIONS.map((f) => f.id),
    },
  });

  server.registerResource(
    "faction-dossier",
    factionTemplate,
    { description: "Per-faction dossier (markdown). Pass an id like 'shaolin'.", mimeType: MARKDOWN_MIME },
    async (uri) => {
      const id = uri.pathname.split("/").pop() ?? "";
      const faction = findFaction(decodeURIComponent(id));
      if (!faction) {
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: MARKDOWN_MIME,
              text: `# Not found\n\nNo faction with id "${id}" was found in the jianghu.`,
            },
          ],
        };
      }
      return {
        contents: [
          { uri: uri.toString(), mimeType: MARKDOWN_MIME, text: dossierMarkdown(faction) },
        ],
      };
    },
  );
}
