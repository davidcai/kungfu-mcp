// Shared reveal timeline: rounds land one by one, then the verdict holds an
// extra beat before appearing. Verdict.tsx builds on these constants.
export const ROUND_DELAY_BASE = 0.6;
export const ROUND_DELAY_STEP = 1.4;
export const VERDICT_EXTRA_DELAY = 1.1;

// Round text arrives with technique names wrapped in **markdown bold**
// (the same string the LLM sees); render those segments as highlight chips.
function highlightTechniques(text: string) {
  return text.split(/\*\*(.+?)\*\*/g).map((seg, i) =>
    i % 2 === 1 ? (
      <strong className="tech" key={i}>
        {seg}
      </strong>
    ) : (
      seg
    ),
  );
}

export function RoundList({ rounds }: { rounds: string[] }) {
  return (
    <div className="rounds">
      {rounds.map((text, i) => (
        <div
          className="round"
          key={i}
          style={{ animationDelay: `${ROUND_DELAY_BASE + i * ROUND_DELAY_STEP}s` }}
        >
          <div className="rlabel">Round {i + 1}</div>
          <div className="rtext">{highlightTechniques(text)}</div>
        </div>
      ))}
    </div>
  );
}
