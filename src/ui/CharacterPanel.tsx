import type { Faction } from "./types";

export function CharacterPanel({
  name,
  image,
  factions,
  value,
  onChange,
}: {
  name: string;
  image: string;
  factions: Faction[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="char-panel">
      <img className="char-img" src={image} alt={name} />
      <h3 className="char-name">{name}</h3>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {factions.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name} — threat {f.threat}/10
          </option>
        ))}
      </select>
    </div>
  );
}
