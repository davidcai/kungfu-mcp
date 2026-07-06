import { ROUND_DELAY_BASE, ROUND_DELAY_STEP, VERDICT_EXTRA_DELAY } from "./RoundList";
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
      style={{
        animationDelay: `${ROUND_DELAY_BASE + outcome.rounds.length * ROUND_DELAY_STEP + VERDICT_EXTRA_DELAY}s`,
      }}
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
