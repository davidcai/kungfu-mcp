import type { SparOutcome } from "./types";

export function Verdict({
  outcome,
  winnerName,
}: {
  outcome: SparOutcome;
  winnerName: string | null;
}) {
  return (
    <div
      className={`verdict${winnerName ? "" : " draw"}`}
      style={{ animationDelay: `${0.3 + outcome.rounds.length * 0.7 + 0.2}s` }}
    >
      <div>
        {winnerName ? (
          <>
            <span className="winner-name">{winnerName}</span> Verdict
          </>
        ) : (
          "Verdict"
        )}
      </div>
      <div className="vtext">{outcome.verdict}</div>
    </div>
  );
}
