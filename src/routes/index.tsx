import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Delete, Lock, Play, X } from "lucide-react";

import retroBowl from "../assets/game-retro-bowl.jpg";
import slope from "../assets/game-slope.jpg";
import game2048 from "../assets/game-2048.jpg";
import tunnelRush from "../assets/game-tunnel-rush.jpg";

const SECRET_CODE = "1111";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Calculator" },
      {
        name: "description",
        content:
          "A sleek, minimalist calculator for quick everyday math — clean, fast, and fully responsive.",
      },
      { property: "og:title", content: "Calculator" },
      {
        property: "og:description",
        content:
          "A sleek, minimalist calculator for quick everyday math — clean, fast, and fully responsive.",
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
  if (Number.isNaN(value)) return "Error";
  if (!Number.isFinite(value)) return "Error";
  const rounded = Math.round(value * 1e10) / 1e10;
  const str = String(rounded);
  return str.length > 12 ? rounded.toExponential(6) : str;
}

function Calculator({ onUnlock }: { onUnlock: () => void }) {
  const [state, setState] = useState<CalcState>(initialState);

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
      const result = applyOperation(
        s.previous,
        parseFloat(s.display),
        s.operator,
      );
      return {
        display: formatResult(result),
        previous: null,
        operator: null,
        waitingForOperand: true,
      };
    });
    // Defer so state settles before the view transition.
    setTimeout(() => {
      if (unlocked) onUnlock();
    }, 0);
  }, [onUnlock]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) inputDigit(e.key);
      else if (e.key === ".") inputDot();
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
  }, [inputDigit, inputDot, setOperator, equals, clear, backspace]);

  const baseBtn =
    "flex h-16 items-center justify-center rounded-full text-2xl font-medium transition-all duration-100 active:scale-95 sm:h-18";
  const numBtn = `${baseBtn} bg-secondary text-secondary-foreground hover:bg-muted`;
  const opBtn = `${baseBtn} bg-primary text-primary-foreground hover:opacity-85`;
  const utilBtn = `${baseBtn} bg-muted text-foreground hover:bg-accent`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="rounded-[2rem] border border-border bg-card p-5 shadow-2xl shadow-black/10">
          {/* Display */}
          <div className="flex h-28 flex-col items-end justify-end overflow-hidden px-4 pb-3">
            <div className="text-sm text-muted-foreground">
              {state.previous !== null && state.operator
                ? `${formatResult(state.previous)} ${state.operator}`
                : "\u00A0"}
            </div>
            <div className="w-full truncate text-right text-6xl font-light tracking-tight text-card-foreground">
              {state.display}
            </div>
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-4 gap-2.5">
            <button className={utilBtn} onClick={clear} aria-label="Clear">
              C
            </button>
            <button
              className={utilBtn}
              onClick={backspace}
              aria-label="Backspace"
            >
              <Delete className="h-6 w-6" />
            </button>
            <button
              className={utilBtn}
              onClick={() => {
                setState((s) => {
                  if (s.display === "Error") return s;
                  return {
                    ...s,
                    display: s.display.startsWith("-")
                      ? s.display.slice(1)
                      : s.display === "0"
                        ? s.display
                        : `-${s.display}`,
                  };
                });
              }}
              aria-label="Toggle sign"
            >
              ±
            </button>
            <button className={opBtn} onClick={() => setOperator("÷")}>
              ÷
            </button>

            {["7", "8", "9"].map((d) => (
              <button key={d} className={numBtn} onClick={() => inputDigit(d)}>
                {d}
              </button>
            ))}
            <button className={opBtn} onClick={() => setOperator("×")}>
              ×
            </button>

            {["4", "5", "6"].map((d) => (
              <button key={d} className={numBtn} onClick={() => inputDigit(d)}>
                {d}
              </button>
            ))}
            <button className={opBtn} onClick={() => setOperator("-")}>
              −
            </button>

            {["1", "2", "3"].map((d) => (
              <button key={d} className={numBtn} onClick={() => inputDigit(d)}>
                {d}
              </button>
            ))}
            <button className={opBtn} onClick={() => setOperator("+")}>
              +
            </button>

            <button className={numBtn} onClick={inputDot}>
              .
            </button>
            <button className={numBtn} onClick={() => inputDigit("0")}>
              0
            </button>
            <button
              className={`${numBtn} col-span-2 rounded-full`}
              onClick={equals}
              aria-label="Equals"
            >
              =
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Games Portal ----------------------------- */

interface Game {
  title: string;
  tagline: string;
  thumbnail: string;
  embedUrl: string;
}

const GAMES: Game[] = [
  {
    title: "Retro Bowl",
    tagline: "Pixel-perfect football glory",
    thumbnail: retroBowl,
    embedUrl: "https://game316818.konggames.com/gamez/0031/6818/live/index.html",
  },
  {
    title: "Slope",
    tagline: "How far can you roll?",
    thumbnail: slope,
    embedUrl: "https://slope-game.github.io/",
  },
  {
    title: "2048",
    tagline: "Merge tiles, chase the 2048",
    thumbnail: game2048,
    embedUrl: "https://play2048.co/",
  },
  {
    title: "Tunnel Rush",
    tagline: "Dodge the neon void",
    thumbnail: tunnelRush,
    embedUrl: "https://tunnelrushgame.io/game/tunnel-rush/",
  },
];

function GamesPortal({ onLock }: { onLock: () => void }) {
  const [activeGame, setActiveGame] = useState<Game | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveGame(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Arcade
            </h1>
            <p className="text-xs text-muted-foreground">
              Pick a game and play
            </p>
          </div>
          <button
            onClick={onLock}
            aria-label="Back to calculator"
            title="Back to calculator"
            className="rounded-full border border-border p-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Lock className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((game) => (
            <article
              key={game.title}
              className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20"
            >
              <div className="relative aspect-[3/2] overflow-hidden">
                <img
                  src={game.thumbnail}
                  alt={`${game.title} game artwork`}
                  width={768}
                  height={512}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-card-foreground">
                    {game.title}
                  </h2>
                  <p className="truncate text-sm text-muted-foreground">
                    {game.tagline}
                  </p>
                </div>
                <button
                  onClick={() => setActiveGame(game)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-85"
                >
                  <Play className="h-3.5 w-3.5" />
                  Play
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>

      {/* Game modal */}
      {activeGame && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={activeGame.title}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
            <h2 className="font-semibold text-foreground">
              {activeGame.title}
            </h2>
            <button
              onClick={() => setActiveGame(null)}
              aria-label="Close game"
              className="rounded-full border border-border p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <iframe
            key={activeGame.title}
            src={activeGame.embedUrl}
            title={activeGame.title}
            className="h-full w-full flex-1 border-0"
            allow="autoplay; fullscreen; gamepad; keyboard-map"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Index --------------------------------- */

function Index() {
  const [view, setView] = useState<"calculator" | "games">("calculator");
  const [fading, setFading] = useState(false);

  const transitionTo = (next: "calculator" | "games") => {
    setFading(true);
    setTimeout(() => {
      setView(next);
      setFading(false);
    }, 250);
  };

  return (
    <div
      className={`transition-opacity duration-250 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      {view === "calculator" ? (
        <Calculator onUnlock={() => transitionTo("games")} />
      ) : (
        <GamesPortal onLock={() => transitionTo("calculator")} />
      )}
    </div>
  );
}
