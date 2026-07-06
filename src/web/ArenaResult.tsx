import { FactionCard } from "./FactionCard";
import { RoundList } from "./RoundList";
import { Verdict } from "./Verdict";
import type { Faction, SparOutcome } from "./types";

export function ArenaResult({
  a,
  b,
  outcome,
  onViewProfile,
}: {
  a: Faction;
  b: Faction;
  outcome: SparOutcome;
  onViewProfile: (f: Faction) => void;
}) {
  const winner = outcome.winnerId ? (outcome.winnerId === a.id ? a : b) : null;
  const cardClass = (f: Faction) => (winner ? (f.id === winner.id ? " winner" : " loser") : "");

  return (
    <>
      <div className="arena">
        <FactionCard faction={a} extraClass={cardClass(a)} />
        <div className="center-vs">VS</div>
        <FactionCard faction={b} extraClass={cardClass(b)} />
      </div>
      <RoundList rounds={outcome.rounds} />
      <Verdict outcome={outcome} winner={winner} />
      <div style={{ marginTop: "0.75rem" }}>
        <button
          className="profile-btn"
          style={{ marginRight: "0.5rem" }}
          onClick={() => onViewProfile(a)}
        >
          View {a.name} profile
        </button>
        <button className="profile-btn" onClick={() => onViewProfile(b)}>
          View {b.name} profile
        </button>
      </div>
    </>
  );
}
