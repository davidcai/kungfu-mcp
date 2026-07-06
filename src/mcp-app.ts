import { App } from "@modelcontextprotocol/ext-apps";

type Faction = { id: string; name: string; threat: number; catchphrase: string };

const EMBLEM: Record<string, string> = {
  shaolin: "🧘",
  wudang: "☯️",
  emei: "🗡️",
  beggar: "🦯",
  tang: "🪡",
  "ancient-tomb": "💀",
  "ming-cult": "🔥",
  huashan: "⚔️",
};

const statusEl = document.getElementById("status")!;
const pickersEl = document.getElementById("pickers") as HTMLFieldSetElement | HTMLElement;
const sparBtn = document.getElementById("spar-btn") as HTMLButtonElement;
const arenaEl = document.getElementById("arena")!;
const dossierEl = document.getElementById("dossier")!;
const selA = document.getElementById("faction-a") as HTMLSelectElement;
const selB = document.getElementById("faction-b") as HTMLSelectElement;

let factions: Faction[] = [];

const app = new App({ name: "spar-arena", version: "1.0.0" }, {});

function setStatus(msg: string, err = false): void {
  statusEl.textContent = msg;
  statusEl.className = "status" + (err ? " err" : "");
}

function textOf(result: { content?: Array<{ type: string; text?: string }> }): string {
  const item = result.content?.[0];
  return item?.text ?? "";
}

function parseRoster(text: string): Faction[] {
  const out: Faction[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^- (\S+)\s{2,}(.+?)\s{2,}\[threat (\d+)\/10\]\s{2,}"(.*)"$/);
    if (m) {
      out.push({ id: m[1], name: m[2], threat: Number(m[3]), catchphrase: m[4] });
    }
  }
  return out;
}

function populateSelects(): void {
  for (const sel of [selA, selB]) {
    sel.innerHTML = "";
    for (const f of factions) {
      const opt = document.createElement("option");
      opt.value = f.id;
      opt.textContent = `${f.name} — threat ${f.threat}/10`;
      sel.appendChild(opt);
    }
  }
  if (factions.length > 1) {
    selA.value = factions[0].id;
    selB.value = factions[1].id;
  }
}

function emblem(id: string): string {
  return EMBLEM[id] ?? "🥋";
}

function threatLabel(t: number): string {
  if (t >= 9) return "avoid eye contact";
  if (t >= 7) return "do not taunt";
  if (t >= 5) return "probably fine";
  return "a gentle breeze";
}

function factionCard(f: Faction, side: "a" | "b"): HTMLElement {
  const card = document.createElement("div");
  card.className = "card";
  card.id = `card-${side}`;
  card.innerHTML = `
    <div class="emblem">${emblem(f.id)}</div>
    <h3>${f.name}</h3>
    <div class="sub">${threatLabel(f.threat)}</div>
    <div class="threat-bar"><span style="width:${(f.threat / 10) * 100}%"></span></div>
    <div class="phrase">"${f.catchphrase}"</div>
  `;
  return card;
}

async function beginSpar(): Promise<void> {
  const a = factions.find((f) => f.id === selA.value);
  const b = factions.find((f) => f.id === selB.value);
  if (!a || !b || a.id === b.id) {
    setStatus("Pick two different factions.", true);
    return;
  }
  sparBtn.disabled = true;
  setStatus("The arena falls silent. A chicken flees…");

  let result;
  try {
    result = await app.callServerTool({
      name: "spar",
      arguments: { faction_a: a.id, faction_b: b.id },
    });
  } catch (e) {
    setStatus(`Spar failed: ${(e as Error).message}`, true);
    sparBtn.disabled = false;
    return;
  }

  const text = textOf(result);
  if (result.isError) {
    setStatus(text, true);
    sparBtn.disabled = false;
    return;
  }

  renderArena(a, b, text);
  setStatus("");
  sparBtn.disabled = false;
}

function renderArena(a: Faction, b: Faction, narration: string): void {
  arenaEl.innerHTML = "";

  const arena = document.createElement("div");
  arena.className = "arena";
  arena.appendChild(factionCard(a, "a"));
  const vs = document.createElement("div");
  vs.className = "center-vs";
  vs.textContent = "VS";
  arena.appendChild(vs);
  arena.appendChild(factionCard(b, "b"));
  arenaEl.appendChild(arena);

  const winner = a.threat > b.threat ? a : b.threat > a.threat ? b : null;
  if (winner) {
    const winSide = winner.id === a.id ? "a" : "b";
    document.getElementById(`card-${winSide}`)!.classList.add("winner");
    document.getElementById(`card-${winSide === "a" ? "b" : "a"}`)!.classList.add("loser");
  }

  const roundsWrap = document.createElement("div");
  roundsWrap.className = "rounds";
  const rounds = [...narration.matchAll(/^Round (\d+): (.+)$/gm)];
  rounds.forEach((m, i) => {
    const round = document.createElement("div");
    round.className = "round";
    round.style.animationDelay = `${0.3 + i * 0.7}s`;
    round.innerHTML = `<div class="rlabel">Round ${m[1]}</div><div class="rtext">${m[2]}</div>`;
    roundsWrap.appendChild(round);
  });
  arenaEl.appendChild(roundsWrap);

  const verdictMatch = narration.match(/^Verdict: (.+)$/m);
  if (verdictMatch) {
    const v = document.createElement("div");
    v.className = "verdict" + (winner ? "" : " draw");
    const winnerName = winner ? `<span class="winner-name">${winner.name}</span> ` : "";
    v.innerHTML = `<div>${winnerName}Verdict</div><div class="vtext">${verdictMatch[1]}</div>`;
    v.style.animationDelay = `${0.3 + rounds.length * 0.7 + 0.2}s`;
    arenaEl.appendChild(v);
  }

  const dossierRow = document.createElement("div");
  dossierRow.style.marginTop = "0.75rem";
  const btnA = dossierBtn("View " + a.name + " dossier", a.id);
  const btnB = dossierBtn("View " + b.name + " dossier", b.id);
  dossierRow.appendChild(btnA);
  dossierRow.appendChild(btnB);
  arenaEl.appendChild(dossierRow);
}

function dossierBtn(label: string, id: string): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = "dossier-btn";
  btn.textContent = label;
  btn.style.marginRight = "0.5rem";
  btn.addEventListener("click", () => showDossier(id));
  return btn;
}

async function showDossier(id: string): Promise<void> {
  dossierEl.innerHTML = `<div class="dossier">Loading dossier…</div>`;
  try {
    const result = await app.callServerTool({ name: "get_faction", arguments: { id } });
    const text = textOf(result);
    const f = factions.find((x) => x.id === id);
    dossierEl.innerHTML = `<div class="dossier"><h4>${f?.name ?? id} — Dossier</h4>${escapeHtml(text)}</div>`;
  } catch (e) {
    dossierEl.innerHTML = `<div class="dossier err">Failed: ${(e as Error).message}</div>`;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
}

async function init(): Promise<void> {
  try {
    await app.connect();
  } catch (e) {
    setStatus(`Failed to connect to host: ${(e as Error).message}`, true);
    return;
  }

  let result;
  try {
    result = await app.callServerTool({ name: "list_factions", arguments: {} });
  } catch (e) {
    setStatus(`list_factions failed: ${(e as Error).message}`, true);
    return;
  }

  const text = textOf(result);
  factions = parseRoster(text);
  if (factions.length === 0) {
    setStatus("No factions returned by the server.", true);
    return;
  }

  populateSelects();
  (pickersEl as HTMLElement).hidden = false;
  sparBtn.hidden = false;
  setStatus("Ready. Choose your champions.");
}

sparBtn.addEventListener("click", beginSpar);
init();
