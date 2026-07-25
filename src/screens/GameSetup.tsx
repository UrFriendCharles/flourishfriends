import { useState } from "react";
import type { AnswerStyle, Collection, Continent, Difficulty, GameMode, GameSettings } from "../types";
import { DEFAULT_SETTINGS } from "../logic/gameReducer";
import { loadSettings, saveSettings } from "../storage/localStore";

const CONTINENTS: Continent[] = [
  "Africa",
  "Asia",
  "Europe",
  "North America",
  "South America",
  "Oceania",
];

interface Props {
  onStart: (settings: GameSettings) => void;
  onBack: () => void;
  /** TV-room setup: multiple choice + classic only, no hints/lifelines */
  tv?: boolean;
  notice?: string | null;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-bold transition active:scale-95 ${
        active
          ? "border-sky-300 bg-sky-500/25 text-white"
          : "border-white/15 bg-white/5 text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">{title}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function GameSetup({ onStart, onBack, tv, notice }: Props) {
  const [settings, setSettings] = useState<GameSettings>(
    // merge so settings saved before newer options existed still get defaults
    () => ({ ...DEFAULT_SETTINGS, ...loadSettings() })
  );
  const [customCount, setCustomCount] = useState(false);

  const set = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));

  // capitals & everything are multiple-choice classic (hints/typed are flag-centric)
  const isCapitals =
    settings.collection === "usCapitals" || settings.collection === "worldCapitals";
  const isEverything = settings.collection === "everything";
  const forced = tv || isCapitals || isEverything;

  const toggleContinent = (c: Continent) =>
    set(
      "continents",
      settings.continents.includes(c)
        ? settings.continents.filter((x) => x !== c)
        : [...settings.continents, c]
    );

  const start = () => {
    const clean: GameSettings = {
      ...settings,
      questionCount: Math.max(3, Math.min(50, settings.questionCount)),
    };
    saveSettings(clean); // saved before overrides so local-game prefs survive
    const capitalsOverride: Partial<GameSettings> =
      isCapitals || isEverything
        ? { answerStyle: "choices", mode: "classic", hintsEnabled: false }
        : {};
    const tvOverride: Partial<GameSettings> = tv
      ? { answerStyle: "choices", mode: "classic", hintsEnabled: false, lifelinesEnabled: false }
      : {};
    onStart({ ...clean, ...capitalsOverride, ...tvOverride });
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-6 py-8">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold">
          ←
        </button>
        <h2 className="text-2xl font-black">{tv ? "📺 TV Game Setup" : "Game Setup"}</h2>
      </div>
      {tv && (
        <p className="-mt-2 text-xs text-slate-400">
          Everyone answers on their own phone — multiple choice, classic scoring.
        </p>
      )}

      <Section title="Quiz Pack">
        {(
          [
            ["world", "🌍 World Flags"],
            ["usStates", "🇺🇸 US States"],
            ["usCapitals", "🏛️ State Capitals"],
            ["worldCapitals", "🌆 World Capitals"],
            ["everything", "🌐 Everything"],
          ] as [Collection, string][]
        ).map(([collection, label]) => (
          <Chip
            key={collection}
            active={settings.collection === collection}
            onClick={() => set("collection", collection)}
          >
            {label}
          </Chip>
        ))}
      </Section>
      {settings.collection === "usCapitals" && (
        <p className="-mt-3 text-xs text-slate-400">
          Guess the capital from the state's shape. Easy names the state — Medium and Hard show
          only the silhouette, and Hard mixes in trick cities like Seattle and New Orleans!
        </p>
      )}
      {settings.collection === "worldCapitals" && (
        <p className="-mt-3 text-xs text-slate-400">
          Guess each country's capital from its flag. Easy names the country — Medium and Hard show
          only the flag, and Hard mixes in tricky same-region cities!
        </p>
      )}
      {isEverything && (
        <p className="-mt-3 text-xs text-slate-400">
          The ultimate mix — every question is pulled at random from all four packs: world flags, US
          state flags, state capitals, and world capitals. Each question tells you what it's asking.
        </p>
      )}

      {!forced && (
        <Section title="Answers">
          {(
            [
              ["choices", "🔘 Multiple Choice"],
              ["typed", "⌨️ Type It In"],
            ] as [AnswerStyle, string][]
          ).map(([style, label]) => (
            <Chip
              key={style}
              active={settings.answerStyle === style}
              onClick={() => set("answerStyle", style)}
            >
              {label}
            </Chip>
          ))}
        </Section>
      )}
      {!forced && settings.answerStyle === "typed" && (
        <p className="-mt-3 text-xs text-slate-400">
          Spell the name yourself — small typos are forgiven. Lifelines are off in this style.
        </p>
      )}

      {!forced && (
        <Section title="Game Mode">
          {(
            [
              ["classic", "🎯 Classic"],
              ["learning", "📚 Learning"],
            ] as [GameMode, string][]
          ).map(([mode, label]) => (
            <Chip key={mode} active={settings.mode === mode} onClick={() => set("mode", mode)}>
              {label}
            </Chip>
          ))}
        </Section>
      )}
      {!forced && settings.mode === "learning" && (
        <p className="-mt-3 text-xs text-slate-400">
          Reveal hints as you play — each hint lowers the points for that question.
        </p>
      )}

      <Section title="Difficulty">
        {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
          <Chip key={d} active={settings.difficulty === d} onClick={() => set("difficulty", d)}>
            {d === "easy" ? "😊 Easy" : d === "medium" ? "🤔 Medium" : "🔥 Hard"}
          </Chip>
        ))}
      </Section>

      <Section title="Questions">
        {[10, 15, 25].map((n) => (
          <Chip
            key={n}
            active={!customCount && settings.questionCount === n}
            onClick={() => {
              setCustomCount(false);
              set("questionCount", n);
            }}
          >
            {n}
          </Chip>
        ))}
        <Chip active={customCount} onClick={() => setCustomCount(true)}>
          Custom
        </Chip>
        {customCount && (
          <input
            type="number"
            min={3}
            max={50}
            value={settings.questionCount}
            onChange={(e) => set("questionCount", Number(e.target.value) || 10)}
            className="w-20 rounded-full border border-sky-300 bg-white/5 px-3 py-1.5 text-center text-sm font-bold outline-none"
          />
        )}
      </Section>

      <Section title="Timer">
        <Chip active={settings.timerSeconds === null} onClick={() => set("timerSeconds", null)}>
          Off
        </Chip>
        {[10, 15, 30].map((s) => (
          <Chip
            key={s}
            active={settings.timerSeconds === s}
            onClick={() => set("timerSeconds", s)}
          >
            {s}s
          </Chip>
        ))}
      </Section>

      <Section title="Extras">
        {!forced && (
          <Chip active={settings.hintsEnabled} onClick={() => set("hintsEnabled", !settings.hintsEnabled)}>
            💡 Hints {settings.hintsEnabled ? "On" : "Off"}
          </Chip>
        )}
        {!tv && (settings.answerStyle === "choices" || isCapitals || isEverything) && (
          <Chip
            active={settings.lifelinesEnabled}
            onClick={() => set("lifelinesEnabled", !settings.lifelinesEnabled)}
          >
            ⭐ Lifelines {settings.lifelinesEnabled ? "On" : "Off"}
          </Chip>
        )}
        <Chip
          active={settings.speedBonusEnabled}
          onClick={() => set("speedBonusEnabled", !settings.speedBonusEnabled)}
        >
          ⚡ Speed Bonus {settings.speedBonusEnabled ? "On" : "Off"}
        </Chip>
      </Section>

      {settings.collection === "world" && (
        <Section title="Continents (all if none picked)">
          {CONTINENTS.map((c) => (
            <Chip key={c} active={settings.continents.includes(c)} onClick={() => toggleContinent(c)}>
              {c}
            </Chip>
          ))}
        </Section>
      )}

      <div className="mt-auto pt-2">
        {notice && (
          <p className="mb-2 rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200">
            {notice}
          </p>
        )}
        <button
          onClick={start}
          className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-4 text-lg font-bold shadow-lg shadow-sky-500/25 transition active:scale-95"
        >
          {tv ? "Create Room 📺" : "Let's Play! 🚀"}
        </button>
      </div>
    </div>
  );
}
