import { useEffect, useRef, useState } from "react";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { ArenaResult } from "./ArenaResult";
import { ProfilePanel } from "./ProfilePanel";
import { textOf, type Faction, type ProfileState, type SparOutcome, type SparResult } from "./types";

export function ArenaApp() {
  const { app, isConnected, error } = useApp({
    appInfo: { name: "spar-arena", version: "1.0.0" },
    capabilities: {},
  });

  const [factions, setFactions] = useState<Faction[]>([]);
  const [status, setStatus] = useState<{ message: string; isError: boolean }>({
    message: "Connecting to the kung fu world…",
    isError: false,
  });
  const [selA, setSelA] = useState("");
  const [selB, setSelB] = useState("");
  const [sparring, setSparring] = useState(false);
  const [ready, setReady] = useState(false);
  const [result, setResult] = useState<SparResult | null>(null);
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const sparIdRef = useRef(0);

  useEffect(() => {
    if (error) {
      setStatus({ message: `Failed to connect to host: ${error.message}`, isError: true });
    }
  }, [error]);

  useEffect(() => {
    if (!isConnected || !app) return;
    let cancelled = false;
    (async () => {
      let res;
      try {
        res = await app.callServerTool({ name: "list_factions", arguments: {} });
      } catch (e) {
        if (!cancelled) {
          setStatus({ message: `list_factions failed: ${(e as Error).message}`, isError: true });
        }
        return;
      }
      if (cancelled) return;
      const f =
        (res.structuredContent as { factions?: Faction[] } | undefined)?.factions ?? [];
      if (f.length === 0) {
        setStatus({ message: "No factions returned by the server.", isError: true });
        return;
      }
      setFactions(f);
      if (f.length > 1) {
        setSelA(f[0].id);
        setSelB(f[1].id);
      }
      setReady(true);
      setStatus({ message: "Ready. Choose your champions.", isError: false });
    })();
    return () => {
      cancelled = true;
    };
  }, [isConnected, app]);

  async function beginSpar(): Promise<void> {
    if (!app) return;
    const a = factions.find((f) => f.id === selA);
    const b = factions.find((f) => f.id === selB);
    if (!a || !b || a.id === b.id) {
      setStatus({ message: "Pick two different factions.", isError: true });
      return;
    }
    setSparring(true);
    setStatus({ message: "The arena falls silent. A chicken flees…", isError: false });
    try {
      const res = await app.callServerTool({
        name: "spar",
        arguments: { faction_a: a.id, faction_b: b.id },
      });
      if (res.isError) {
        setStatus({ message: textOf(res), isError: true });
        return;
      }
      sparIdRef.current += 1;
      setResult({
        a,
        b,
        outcome: res.structuredContent as SparOutcome,
        sparId: sparIdRef.current,
      });
      setStatus({ message: "", isError: false });
    } catch (e) {
      setStatus({ message: `Spar failed: ${(e as Error).message}`, isError: true });
    } finally {
      setSparring(false);
    }
  }

  async function showProfile(f: Faction): Promise<void> {
    if (!app) return;
    setProfile({ state: "loading" });
    try {
      const res = await app.callServerTool({ name: "get_faction", arguments: { id: f.id } });
      setProfile({ state: "loaded", name: f.name, text: textOf(res) });
    } catch (e) {
      setProfile({ state: "error", message: (e as Error).message });
    }
  }

  return (
    <div id="app">
      <header>
        <h1>⚔️ Kung Fu Spar Arena</h1>
      </header>
      <div className={"status" + (status.isError ? " err" : "")}>{status.message}</div>
      {ready && (
        <section className="pickers">
          <label>
            Faction A
            <select id="faction-a" value={selA} onChange={(e) => setSelA(e.target.value)}>
              {factions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} — threat {f.threat}/10
                </option>
              ))}
            </select>
          </label>
          <span className="vs">vs</span>
          <label>
            Faction B
            <select id="faction-b" value={selB} onChange={(e) => setSelB(e.target.value)}>
              {factions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} — threat {f.threat}/10
                </option>
              ))}
            </select>
          </label>
        </section>
      )}
      {ready && (
        <button id="spar-btn" onClick={beginSpar} disabled={sparring}>
          Begin the Spar
        </button>
      )}
      <div id="arena">
        {result && (
          <ArenaResult
            key={result.sparId}
            a={result.a}
            b={result.b}
            outcome={result.outcome}
            onViewProfile={showProfile}
          />
        )}
      </div>
      <div id="profile">{profile && <ProfilePanel profile={profile} />}</div>
    </div>
  );
}
