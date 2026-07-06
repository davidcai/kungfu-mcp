export const EMBLEM: Record<string, string> = {
  shaolin: "🧘",
  wudang: "☯️",
  emei: "🗡️",
  beggar: "🦯",
  tang: "🪡",
  "ancient-tomb": "💀",
  "ming-cult": "🔥",
  huashan: "⚔️",
};

export function emblem(id: string): string {
  return EMBLEM[id] ?? "🥋";
}
