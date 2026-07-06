import { KUNGFU_FACTIONS, type KungfuFaction } from "./data.js";

// Shared formatting for tools and resources: same data, same markdown —
// the primitives differ only in who decides to fetch it.

export function rosterMarkdown(): string {
  const lines = KUNGFU_FACTIONS.map(
    (f) => `- **${f.id}** — ${f.name} — "${f.catchphrase}"`,
  ).join("\n");
  return [
    "# The Kung Fu Roster",
    "",
    `${KUNGFU_FACTIONS.length} factions are currently accepting (and rejecting) disciples.`,
    "",
    lines,
    "",
    "_Disclaimer: The kung fu world accepts no responsibility for bruised egos, poisoned handshakes, or tragic backstories._",
  ].join("\n");
}

export function profileMarkdown(f: KungfuFaction): string {
  return [
    `# ${f.name}`,
    "",
    `- **Faction:** ${f.faction}`,
    `- **Origin:** ${f.origin}`,
    `- **Philosophy:** ${f.philosophy}`,
    "",
    "## Signature Techniques",
    ...f.signatureTechniques.map((t) => `- ${t.name} (threat ${t.threat}/10)`),
    "",
    "## Famous Practitioners",
    ...f.famousPractitioners.map((p) => `- ${p}`),
    "",
    `**Fun Fact:** ${f.funFact}`,
    "",
    `> "${f.catchphrase}"`,
  ].join("\n");
}
