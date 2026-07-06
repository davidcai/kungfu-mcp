export type Faction = { id: string; name: string; catchphrase: string };
export type SparOutcome = { rounds: string[]; verdict: string; winnerId: string | null };

export type ProfileState =
  | { state: "loading" }
  | { state: "loaded"; name: string; text: string }
  | { state: "error"; message: string };

export type SparResult = {
  a: Faction;
  b: Faction;
  championA: string;
  championB: string;
  outcome: SparOutcome;
  sparId: number;
};

export function textOf(result: { content?: Array<{ type: string; text?: string }> }): string {
  const item = result.content?.[0];
  return item?.text ?? "";
}
