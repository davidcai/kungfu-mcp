import { App } from "@modelcontextprotocol/ext-apps";
import { threatLabel } from "./format.js";

type Faction = { id: string; name: string; threat: number; catchphrase: string };
type SparOutcome = { rounds: string[]; verdict: string; winnerId: string | null };

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
const pickersEl = document.getElementById("pickers")!;
const sparBtn = document.getElementById("spar-btn") as HTMLButtonElement;
const arenaEl = document.getElementById("arena")!;
const profileEl = document.getElementById("profile")!;
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

async function beginSpar(): Promise<void> {
  const a = factions.find((f) => f.id === selA.value);
  const b = factions.find((f) => f.id === selB.value);
  if (!a || !b || a.id === b.id) {
    setStatus("Pick two different factions.", true);
    return;
  }
  sparBtn.disabled = true;
  setStatus("The arena falls silent. A chicken flees…");

  try {
    const result = await app.callServerTool({
      name: "spar",
      arguments: { faction_a: a.id, faction_b: b.id },
    });
    if (result.isError) {
      setStatus(textOf(result), true);
      return;
    }
    renderArena(a, b, result.structuredContent as SparOutcome);
    setStatus("");
  } catch (e) {
    setStatus(`Spar failed: ${(e as Error).message}`, true);
  } finally {
    sparBtn.disabled = false;
  }
}

function factionCard(f: Faction, extraClass: string): string {
  return `
    <div class="card${extraClass}">
      <div class="emblem">${emblem(f.id)}</div>
      <h3>${escapeHtml(f.name)}</h3>
      <div class="sub">${threatLabel(f.threat)}</div>
      <div class="threat-bar"><span style="width:${(f.threat / 10) * 100}%"></span></div>
      <div class="phrase">"${escapeHtml(f.catchphrase)}"</div>
    </div>`;
}

function renderArena(a: Faction, b: Faction, outcome: SparOutcome): void {
  const winner = outcome.winnerId ? factions.find((f) => f.id === outcome.winnerId) ?? null : null;
  const cardClass = (f: Faction) => (winner ? (f.id === winner.id ? " winner" : " loser") : "");

  const rounds = outcome.rounds
    .map(
      (text, i) => `
      <div class="round" style="animation-delay:${0.3 + i * 0.7}s">
        <div class="rlabel">Round ${i + 1}</div>
        <div class="rtext">${escapeHtml(text)}</div>
      </div>`,
    )
    .join("");

  arenaEl.innerHTML = `
    <div class="arena">
      ${factionCard(a, cardClass(a))}
      <div class="center-vs">VS</div>
      ${factionCard(b, cardClass(b))}
    </div>
    <div class="rounds">${rounds}</div>
    <div class="verdict${winner ? "" : " draw"}" style="animation-delay:${0.3 + outcome.rounds.length * 0.7 + 0.2}s">
      <div>${winner ? `<span class="winner-name">${escapeHtml(winner.name)}</span> ` : ""}Verdict</div>
      <div class="vtext">${escapeHtml(outcome.verdict)}</div>
    </div>
    <div style="margin-top:0.75rem">
      <button class="profile-btn" style="margin-right:0.5rem" data-id="${a.id}">View ${escapeHtml(a.name)} profile</button>
      <button class="profile-btn" data-id="${b.id}">View ${escapeHtml(b.name)} profile</button>
    </div>`;

  for (const btn of arenaEl.querySelectorAll<HTMLButtonElement>(".profile-btn")) {
    btn.addEventListener("click", () => showProfile(btn.dataset.id!));
  }
}

async function showProfile(id: string): Promise<void> {
  profileEl.innerHTML = `<div class="profile">Loading profile…</div>`;
  try {
    const result = await app.callServerTool({ name: "get_faction", arguments: { id } });
    const f = factions.find((x) => x.id === id);
    profileEl.innerHTML = `<div class="profile"><h4>${escapeHtml(f?.name ?? id)} — Profile</h4>${escapeHtml(textOf(result))}</div>`;
  } catch (e) {
    profileEl.innerHTML = `<div class="profile err">Failed: ${(e as Error).message}</div>`;
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

  factions = (result.structuredContent as { factions?: Faction[] } | undefined)?.factions ?? [];
  if (factions.length === 0) {
    setStatus("No factions returned by the server.", true);
    return;
  }

  populateSelects();
  pickersEl.hidden = false;
  sparBtn.hidden = false;
  setStatus("Ready. Choose your champions.");
}

sparBtn.addEventListener("click", beginSpar);
init();
