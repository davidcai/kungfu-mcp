export function RoundList({ rounds }: { rounds: string[] }) {
  return (
    <div className="rounds">
      {rounds.map((text, i) => (
        <div className="round" key={i} style={{ animationDelay: `${0.3 + i * 0.7}s` }}>
          <div className="rlabel">Round {i + 1}</div>
          <div className="rtext">{text}</div>
        </div>
      ))}
    </div>
  );
}
