import catalog from "../data/catalog.json";
import emulator from "../data/emulator.json";

interface Row {
  id: string;
  t: string;
  u: string;
  i: string;
  c: string;
  s: string;
}

export interface Game {
  id: string;
  title: string;
  url: string;
  thumb: string;
  category: string;
  system: string;
}

/** Sources are stored encoded so the page source contains no plain game URLs. */
export function decode(value: string): string {
  try {
    if (typeof atob === "function") return atob(value);
    return Buffer.from(value, "base64").toString("utf8");
  } catch {
    return "";
  }
}

function toGame(r: Row): Game {
  return {
    id: r.id,
    title: r.t,
    url: decode(r.u),
    thumb: decode(r.i),
    category: r.c,
    system: r.s,
  };
}

export const ALL_GAMES: Game[] = [
  ...(emulator as Row[]).map(toGame),
  ...(catalog as Row[]).map(toGame),
];

const ORDER = ["Emulator", "Retro"];

export const CATEGORIES: string[] = [
  "All",
  ...ORDER,
  ...Array.from(new Set(ALL_GAMES.map((g) => g.category)))
    .filter((c) => !ORDER.includes(c))
    .sort(),
];

/* ----------------------------- Progress store ---------------------------- */

const RECENT_KEY = "arcade-recent";

export interface RecentEntry {
  id: string;
  at: number;
  plays: number;
}

export function loadRecents(): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as RecentEntry[]) : [];
  } catch {
    return [];
  }
}

export function recordPlay(id: string): RecentEntry[] {
  const list = loadRecents();
  const existing = list.find((e) => e.id === id);
  const next: RecentEntry[] = [
    { id, at: Date.now(), plays: (existing?.plays ?? 0) + 1 },
    ...list.filter((e) => e.id !== id),
  ].slice(0, 24);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
  return next;
}
