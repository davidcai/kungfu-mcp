import type { Faction, SparOutcome } from "./types";

export function Verdict({ outcome, winner }: { outcome: SparOutcome; winner: Faction | null }) {
  return (
    <div
      className={`verdict${winner ? "" : " draw"}`}
      style={{ animationDelay: `${0.3 + outcome.rounds.length * 0.7 + 0.2}s` }}
    >
      <div>
        {winner ? (
          <>
            <span className="winner-name">{winner.name}</span> Verdict
          </>
        ) : (
          "Verdict"
        )}
      </div>
      <div className="vtext">{outcome.verdict}</div>
    </div>
  );
}
