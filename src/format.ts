import { KUNGFU_FACTIONS, type KungfuFaction } from "./data.js";

// Shared formatting for tools and resources: same data, same markdown —
// the primitives differ only in who decides to fetch it.

export function threatLabel(level: number): string {
  if (level >= 9) return "avoid eye contact";
  if (level >= 7) return "do not taunt";
  if (level >= 5) return "probably fine";
  return "a gentle breeze";
}

export function rosterMarkdown(): string {
  const lines = KUNGFU_FACTIONS.map(
    (f) => `- **${f.id}** — ${f.name} [threat ${f.threatLevel}/10] — "${f.catchphrase}"`,
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

export function dossierMarkdown(f: KungfuFaction): string {
  return [
    `# ${f.name}`,
    "",
    `- **Faction:** ${f.faction}`,
    `- **Threat Level:** ${f.threatLevel}/10 (${threatLabel(f.threatLevel)})`,
    `- **Origin:** ${f.origin}`,
    `- **Philosophy:** ${f.philosophy}`,
    "",
    "## Signature Techniques",
    ...f.signatureTechniques.map((t) => `- ${t}`),
    "",
    "## Famous Practitioners",
    ...f.famousPractitioners.map((p) => `- ${p}`),
    "",
    `**Fun Fact:** ${f.funFact}`,
    "",
    `> "${f.catchphrase}"`,
  ].join("\n");
}
