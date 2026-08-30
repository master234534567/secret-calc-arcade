import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Delete,
  Divide,
  Equal,
  Gauge,
  Lock,
  Minus,
  Play,
  Plus,
  Search,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { ALL_GAMES, CATEGORIES, loadRecents, recordPlay, type Game } from "../lib/arcade";
import { CLOAK_PRESETS, applyCloak, loadSavedCloak } from "../lib/cloak";

const SECRET_CODE = "1111";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Calculator — Fast, Free Online Calculator for Students" },
      {
        name: "description",
        content:
          "A clean, reliable online calculator with keyboard support, plus a guide to what every calculator key does and how calculators help you learn math.",
      },
      { property: "og:title", content: "Calculator — Fast, Free Online Calculator" },
      {
        property: "og:description",
        content:
          "A clean, reliable online calculator with keyboard support and a plain-English guide to every key.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

/* ------------------------------- Calculator ------------------------------ */

type Operator = "+" | "-" | "×" | "÷";

interface CalcState {
  display: string;
  previous: number | null;
  operator: Operator | null;
  waitingForOperand: boolean;
}

const initialState: CalcState = {
  display: "0",
  previous: null,
  operator: null,
  waitingForOperand: false,
};

function applyOperation(a: number, b: number, op: Operator): number {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? NaN : a / b;
  }
}

function formatResult(value: number): string {
  if (!Number.isFinite(value)) return "Error";
  const rounded = Math.round(value * 1e10) / 1e10;
  const str = String(rounded);
  return str.length > 12 ? rounded.toExponential(6) : str;
}

function Calculator({ onUnlock }: { onUnlock: () => void }) {
  const [state, setState] = useState<CalcState>(initialState);
  const [history, setHistory] = useState<string[]>([]);

  const inputDigit = useCallback((digit: string) => {
    setState((s) => {
      if (s.display === "Error" || s.waitingForOperand) {
        return { ...s, display: digit, waitingForOperand: false };
      }
      if (s.display.replace(/[-.]/g, "").length >= 12) return s;
      return { ...s, display: s.display === "0" ? digit : s.display + digit };
    });
  }, []);

  const inputDot = useCallback(() => {
    setState((s) => {
      if (s.display === "Error" || s.waitingForOperand) {
        return { ...s, display: "0.", waitingForOperand: false };
      }
      if (s.display.includes(".")) return s;
      return { ...s, display: s.display + "." };
    });
  }, []);

  const clear = useCallback(() => setState(initialState), []);

  const backspace = useCallback(() => {
    setState((s) => {
      if (s.display === "Error" || s.waitingForOperand) return s;
      const next = s.display.length > 1 ? s.display.slice(0, -1) : "0";
      return { ...s, display: next === "-" ? "0" : next };
    });
  }, []);

  const percent = useCallback(() => {
    setState((s) => {
      const current = parseFloat(s.display);
      if (Number.isNaN(current)) return s;
      return { ...s, display: formatResult(current / 100) };
    });
  }, []);

  const setOperator = useCallback((op: Operator) => {
    setState((s) => {
      const current = parseFloat(s.display);
      if (Number.isNaN(current)) return s;
      if (s.operator && !s.waitingForOperand && s.previous !== null) {
        const result = applyOperation(s.previous, current, s.operator);
        return {
          display: formatResult(result),
          previous: result,
          operator: op,
          waitingForOperand: true,
        };
      }
      return { ...s, previous: current, operator: op, waitingForOperand: true };
    });
  }, []);

  const equals = useCallback(() => {
    let unlocked = false;
    setState((s) => {
      if (s.display === SECRET_CODE && s.operator === null) {
        unlocked = true;
        return initialState;
      }
      if (s.operator === null || s.previous === null) return s;
      const result = applyOperation(s.previous, parseFloat(s.display), s.operator);
      setHistory((h) =>
        [
          `${formatResult(s.previous as number)} ${s.operator} ${s.display} = ${formatResult(result)}`,
          ...h,
        ].slice(0, 5),
      );
      return {
        display: formatResult(result),
        previous: null,
        operator: null,
        waitingForOperand: true,
      };
    });
    setTimeout(() => {
      if (unlocked) onUnlock();
    }, 0);
  }, [onUnlock]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) inputDigit(e.key);
      else if (e.key === ".") inputDot();
      else if (e.key === "%") percent();
      else if (e.key === "+") setOperator("+");
      else if (e.key === "-") setOperator("-");
      else if (e.key === "*" || e.key.toLowerCase() === "x") setOperator("×");
      else if (e.key === "/") {
        e.preventDefault();
        setOperator("÷");
      } else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        equals();
      } else if (e.key === "Escape" || e.key.toLowerCase() === "c") clear();
      else if (e.key === "Backspace") backspace();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inputDigit, inputDot, setOperator, equals, clear, backspace, percent]);

  const baseBtn =
    "flex h-16 items-center justify-center rounded-2xl text-2xl font-medium transition-all duration-100 active:scale-95";
  const numBtn = `${baseBtn} bg-secondary text-secondary-foreground hover:bg-muted`;
  const opBtn = `${baseBtn} bg-primary text-primary-foreground hover:opacity-85`;
  const utilBtn = `${baseBtn} bg-muted text-foreground hover:bg-accent`;

  return (
    <div className="min-h-screen bg-background">
      {/* Masthead */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl px-4 pb-8 pt-12 text-center sm:px-6 sm:pt-16">
          <h1 className="text-6xl font-black tracking-tighter text-foreground sm:text-8xl">
            Calculator
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
            A fast, distraction-free online calculator for homework, lab work, budgeting and
            everyday math. Works with your mouse or your keyboard — no sign-up, nothing to install.
          </p>
        </div>
      </header>

      {/* Calculator */}
      <section className="mx-auto flex max-w-5xl justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-sm">
          <div className="rounded-[2rem] border border-border bg-card p-5 shadow-2xl shadow-black/10">
            <div className="flex h-28 flex-col items-end justify-end overflow-hidden px-3 pb-3">
              <div className="text-sm text-muted-foreground">
                {state.previous !== null && state.operator
                  ? `${formatResult(state.previous)} ${state.operator}`
                  : "\u00A0"}
              </div>
              <div
                aria-live="polite"
                className="w-full truncate text-right text-6xl font-light tracking-tight text-card-foreground"
              >
                {state.display}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              <button className={utilBtn} onClick={clear} aria-label="Clear">
                C
              </button>
              <button className={utilBtn} onClick={backspace} aria-label="Backspace">
                <Delete className="h-6 w-6" />
              </button>
              <button className={utilBtn} onClick={percent} aria-label="Percent">
                %
              </button>
              <button className={opBtn} onClick={() => setOperator("÷")} aria-label="Divide">
                ÷
              </button>

              {["7", "8", "9"].map((d) => (
                <button key={d} className={numBtn} onClick={() => inputDigit(d)}>
                  {d}
                </button>
              ))}
              <button className={opBtn} onClick={() => setOperator("×")} aria-label="Multiply">
                ×
              </button>

              {["4", "5", "6"].map((d) => (
                <button key={d} className={numBtn} onClick={() => inputDigit(d)}>
                  {d}
                </button>
              ))}
              <button className={opBtn} onClick={() => setOperator("-")} aria-label="Subtract">
                −
              </button>

              {["1", "2", "3"].map((d) => (
                <button key={d} className={numBtn} onClick={() => inputDigit(d)}>
                  {d}
                </button>
              ))}
              <button className={opBtn} onClick={() => setOperator("+")} aria-label="Add">
                +
              </button>

              <button
                className={numBtn}
                aria-label="Toggle sign"
                onClick={() =>
                  setState((s) =>
                    s.display === "Error"
                      ? s
                      : {
                          ...s,
                          display: s.display.startsWith("-")
                            ? s.display.slice(1)
                            : s.display === "0"
                              ? s.display
                              : `-${s.display}`,
                        },
                  )
                }
              >
                ±
              </button>
              <button className={numBtn} onClick={() => inputDigit("0")}>
                0
              </button>
              <button className={numBtn} onClick={inputDot}>
                .
              </button>
              <button className={opBtn} onClick={equals} aria-label="Equals">
                =
              </button>
            </div>
          </div>

          {history.length > 0 && (
            <div className="mt-4 rounded-2xl border border-border bg-card p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recent calculations
              </h2>
              <ul className="mt-2 space-y-1 text-sm text-card-foreground">
                {history.map((h, i) => (
                  <li key={`${h}-${i}`} className="truncate font-mono">
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Scroll down for a guide to every key and how to use them.
          </p>
        </div>
      </section>

      {/* About */}
      <section className="border-t border-border bg-secondary/30">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Why calculators matter in learning
          </h2>
          <div className="mt-4 grid gap-4 text-sm leading-relaxed text-muted-foreground md:grid-cols-2">
            <p>
              A calculator does not replace understanding — it removes the busywork so you can spend
              your attention on the part that actually teaches you something: choosing the right
              operation, estimating a sensible answer, and checking whether the result makes sense.
              Research on numeracy consistently shows students learn faster when arithmetic drudgery
              stops interrupting their reasoning.
            </p>
            <p>
              The habit worth building is estimate first, compute second. Before pressing equals,
              guess the magnitude of the answer. If 48 × 21 should be "about a thousand" and the
              screen says 1008, you have confirmed both the tool and your own reasoning. If it says
              100.8, you caught a typo instead of writing it down.
            </p>
          </div>
        </div>
      </section>

      {/* Tools */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            What each key does
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Every button on the keypad above, in plain English.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Plus,
                name: "Add ( + )",
                body: "Combines two values. Chain it freely — pressing + again finishes the pending sum first, so 2 + 3 + 4 shows 5 before you finish.",
              },
              {
                icon: Minus,
                name: "Subtract ( − )",
                body: "Takes the second value away from the first. For a negative starting number use ± rather than the minus key.",
              },
              {
                icon: X,
                name: "Multiply ( × )",
                body: "Repeated addition. Handy for unit conversion, scaling recipes and area problems. Keyboard: * or x.",
              },
              {
                icon: Divide,
                name: "Divide ( ÷ )",
                body: "Splits a value into equal parts. Dividing by zero has no defined answer, so the display shows Error instead of a fake number.",
              },
              {
                icon: Equal,
                name: "Equals ( = )",
                body: "Finishes the pending operation and shows the result. Keyboard: Enter. The result stays on screen so you can keep working from it.",
              },
              {
                icon: Gauge,
                name: "Percent ( % )",
                body: "Divides the current value by 100. Enter 15 then % to get 0.15, then multiply by a price to find a tip or a discount.",
              },
              {
                icon: Delete,
                name: "Backspace",
                body: "Deletes the last digit you typed — use it for a single mistyped number instead of clearing the whole calculation.",
              },
              {
                icon: Sparkles,
                name: "Sign ( ± )",
                body: "Flips the current value between positive and negative. Essential for temperatures, debts and coordinates.",
              },
              {
                icon: BookOpen,
                name: "Clear ( C )",
                body: "Resets the display and any pending operation back to zero. Keyboard: Escape or C.",
              },
            ].map((t) => (
              <article key={t.name} className="rounded-2xl border border-border bg-card p-5">
                <t.icon className="h-5 w-5 text-primary" aria-hidden />
                <h3 className="mt-3 text-sm font-semibold text-card-foreground">{t.name}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-card-foreground">Keyboard shortcuts</h3>
            <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm text-muted-foreground sm:grid-cols-2">
              {[
                ["0 – 9", "Enter digits"],
                [". ", "Decimal point"],
                ["+ − * /", "Operations"],
                ["Enter or =", "Calculate"],
                ["Backspace", "Delete last digit"],
                ["Esc or C", "Clear everything"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-border py-1.5">
                  <dt className="font-mono text-foreground">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        Calculator — built for quick, dependable everyday math.
      </footer>
    </div>
  );
}

/* ------------------------------ Games Portal ----------------------------- */

const PAGE_SIZE = 48;

function CloakSettings({ onClose }: { onClose: () => void }) {
  const [activeId, setActiveId] = useState(() => loadSavedCloak()?.id ?? "default");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-card-foreground">Tab cloaking</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Click an icon to instantly change this tab&apos;s favicon and title. Your choice is
              remembered on this device.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-full border border-border p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid max-h-[55vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
          {CLOAK_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                applyCloak(p);
                setActiveId(p.id);
              }}
              className={`flex items-center gap-2 rounded-xl border p-3 text-left transition-colors ${
                activeId === p.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-secondary hover:bg-accent"
              }`}
            >
              <img src={p.icon} alt="" aria-hidden className="h-6 w-6 shrink-0 rounded" />
              <span className="truncate text-xs font-medium text-foreground">{p.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function GamesPortal({ onLock }: { onLock: () => void }) {
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [openGames, setOpenGames] = useState<Game[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [showCloak, setShowCloak] = useState(false);
  const [recents, setRecents] = useState(() => loadRecents());
  const gamesById = useRef(new Map(ALL_GAMES.map((g) => [g.id, g])));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_GAMES.filter(
      (g) =>
        (category === "All" || g.category === category) &&
        (q === "" || g.title.toLowerCase().includes(q)),
    );
  }, [query, category]);

  const continuePlaying = useMemo(
    () =>
      recents
        .map((r) => gamesById.current.get(r.id))
        .filter((g): g is Game => Boolean(g))
        .slice(0, 8),
    [recents],
  );

  useEffect(() => setVisible(PAGE_SIZE), [query, category]);

  const open = useCallback((game: Game) => {
    setActiveGame(game);
    setOpenGames((list) => (list.some((g) => g.id === game.id) ? list : [...list, game]));
    setRecents(recordPlay(game.id));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveGame(null);
        setShowCloak(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const card = (game: Game) => (
    <article
      key={game.id}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20"
    >
      <button
        onClick={() => open(game)}
        className="relative aspect-[4/3] overflow-hidden"
        aria-label={`Play ${game.title}`}
      >
        <img
          src={game.thumb}
          alt={`${game.title} artwork`}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span className="absolute left-2 top-2 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium text-foreground backdrop-blur">
          {game.system}
        </span>
      </button>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-card-foreground">{game.title}</h2>
          <p className="truncate text-xs text-muted-foreground">{game.category}</p>
        </div>
        <button
          onClick={() => open(game)}
          className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-85"
        >
          <Play className="h-3 w-3" />
          Play
        </button>
      </div>
    </article>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Arcade</h1>
              <p className="text-xs text-muted-foreground">
                {ALL_GAMES.length} titles · progress saves automatically
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search"
                  aria-label="Search games"
                  className="w-32 rounded-full border border-border bg-secondary py-2 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary sm:w-64"
                />
              </div>
              <button
                onClick={() => setShowCloak(true)}
                aria-label="Tab cloaking settings"
                title="Tab cloaking"
                className="rounded-full border border-border p-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                onClick={onLock}
                aria-label="Back to calculator"
                title="Back to calculator"
                className="rounded-full border border-border p-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Lock className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  category === c
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {continuePlaying.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Continue playing</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {continuePlaying.map(card)}
            </div>
          </section>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.slice(0, visible).map(card)}
        </div>

        {filtered.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No games match “{query}”.
          </p>
        )}

        {visible < filtered.length && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="rounded-full border border-border px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Load more ({filtered.length - visible} left)
            </button>
          </div>
        )}
      </main>

      {/* Game surface: frames stay mounted so in-game progress is never reset. */}
      <div
        className={`fixed inset-0 z-50 flex-col bg-background ${activeGame ? "flex" : "hidden"}`}
        role="dialog"
        aria-modal="true"
        aria-label={activeGame?.title ?? "Game"}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-foreground">{activeGame?.title}</h2>
            <p className="text-[11px] text-muted-foreground">
              Saves stay on this device — close and come back where you left off.
            </p>
          </div>
          <button
            onClick={() => setActiveGame(null)}
            aria-label="Close game"
            className="rounded-full border border-border p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="relative flex-1">
          {openGames.map((g) => (
            <iframe
              key={g.id}
              src={g.url}
              title={g.title}
              referrerPolicy="no-referrer"
              /* No allow-popups / allow-top-navigation: blocks pop-up and redirect ads,
                 while allow-same-origin keeps each game's own save data working. */
              sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms allow-modals"
              className={`absolute inset-0 h-full w-full border-0 ${
                activeGame?.id === g.id ? "block" : "hidden"
              }`}
              allow="autoplay; fullscreen; gamepad; keyboard-map; cross-origin-isolated"
              allowFullScreen
            />
          ))}
        </div>
      </div>

      {showCloak && <CloakSettings onClose={() => setShowCloak(false)} />}
    </div>
  );
}

/* --------------------------------- Index --------------------------------- */

function Index() {
  const [view, setView] = useState<"calculator" | "games">("calculator");
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const saved = loadSavedCloak();
    if (saved) applyCloak(saved);
  }, []);

  const transitionTo = (next: "calculator" | "games") => {
    setFading(true);
    setTimeout(() => {
      setView(next);
      window.scrollTo({ top: 0 });
      setFading(false);
    }, 250);
  };

  return (
    <div className={`transition-opacity duration-200 ${fading ? "opacity-0" : "opacity-100"}`}>
      {view === "calculator" ? (
        <Calculator onUnlock={() => transitionTo("games")} />
      ) : (
        <GamesPortal onLock={() => transitionTo("calculator")} />
      )}
    </div>
  );
}
