import { emblem } from "./emblems";
import type { Faction } from "./types";

export function FactionCard({ faction, extraClass }: { faction: Faction; extraClass: string }) {
  return (
    <div className={`card${extraClass}`}>
      <div className="emblem">{emblem(faction.id)}</div>
      <h3>{faction.name}</h3>
      <div className="phrase">"{faction.catchphrase}"</div>
    </div>
  );
}
