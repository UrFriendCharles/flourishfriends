import { useState } from "react";
import {
  CLUB_PASS_CHOICES,
  CLUB_TIMER_CHOICES,
  MAX_CLUB_PLAYERS,
  type ClubMode,
  type ClubSettings,
} from "../logic/clubProtocol";
import { clubBankReport } from "../logic/clubSelect";

interface Props {
  /** create a TV room others join from their phones */
  onStart: (settings: ClubSettings) => void;
  /** play the same eleven questions alone, on this device */
  onStartSolo: (settings: ClubSettings) => void;
  onBack: () => void;
  notice?: string | null;
}

type PlayStyle = "solo" | "room";

export const DEFAULT_CLUB_SETTINGS: ClubSettings = {
  mode: "survival",
  timerSeconds: 30,
  passes: 1,
  pack: "all",
};

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

const MODES: { value: ClubMode; label: string; blurb: string }[] = [
  {
    value: "survival",
    label: "Classic Survival",
    blurb:
      "A miss costs you your shot at winning — but you keep playing every question. Survive the 0.5% question to join the Club.",
  },
  {
    value: "highscore",
    label: "Unlimited Pass / High Score",
    blurb:
      "Nobody is eliminated. Pass as often as you like. 1 point per correct answer; most correct at the end wins.",
  },
];

export function ClubSetup({ onStart, onStartSolo, onBack, notice }: Props) {
  const [settings, setSettings] = useState<ClubSettings>(DEFAULT_CLUB_SETTINGS);
  const [style, setStyle] = useState<PlayStyle>("room");
  const bank = clubBankReport();

  const set = <K extends keyof ClubSettings>(key: K, value: ClubSettings[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));

  const mode = MODES.find((m) => m.value === settings.mode)!;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-6 py-8">
      <div className="text-center animate-pop-in">
        <div className="text-5xl">🧠</div>
        <h2 className="mt-2 text-3xl font-black">0.5% Club</h2>
        <p className="mt-1 text-sm text-slate-400">
          11 questions, 90% down to 0.5%.
        </p>
      </div>

      <Section title="How are you playing?">
        <Chip active={style === "solo"} onClick={() => setStyle("solo")}>
          🙋 Just me, on this device
        </Chip>
        <Chip active={style === "room"} onClick={() => setStyle("room")}>
          📺 TV room + phones
        </Chip>
      </Section>
      <p className="-mt-3 text-xs leading-relaxed text-slate-400">
        {style === "solo"
          ? "The same eleven questions, played right here — nothing to join, no one else needed."
          : `This screen becomes the game board. Up to ${MAX_CLUB_PLAYERS} players join from their own phones.`}
      </p>

      <Section title="Game mode">
        {MODES.map((m) => (
          <Chip key={m.value} active={settings.mode === m.value} onClick={() => set("mode", m.value)}>
            {m.label}
          </Chip>
        ))}
      </Section>
      <p className="-mt-3 text-xs leading-relaxed text-slate-400">{mode.blurb}</p>

      <Section title="Question pack">
        <Chip active onClick={() => undefined}>
          All Questions
        </Chip>
      </Section>

      <Section title="Timer per question">
        {CLUB_TIMER_CHOICES.map((seconds) => (
          <Chip
            key={seconds}
            active={settings.timerSeconds === seconds}
            onClick={() => set("timerSeconds", seconds)}
          >
            {seconds}s
          </Chip>
        ))}
      </Section>
      <p className="-mt-3 text-xs text-slate-500">
        A few of the hardest puzzles set their own, longer clock.
      </p>

      {settings.mode === "survival" && (
        <Section title="Passes each player gets">
          {CLUB_PASS_CHOICES.map((count) => (
            <Chip key={count} active={settings.passes === count} onClick={() => set("passes", count)}>
              {count === 0 ? "No Pass" : count === 1 ? "1 Pass" : `${count} Passes`}
            </Chip>
          ))}
        </Section>
      )}

      {notice && (
        <p className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200">
          {notice}
        </p>
      )}

      {bank.problems.length > 0 && (
        <p className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200">
          ⚠️ {bank.problems.length} question{bank.problems.length === 1 ? "" : "s"} in the bank
          failed validation and won't be used.
        </p>
      )}

      <div className="mt-auto flex flex-col gap-2.5">
        <p className="text-center text-xs text-slate-500">
          {bank.total} questions in the bank · one picked per tier, freshest first
        </p>
        <button
          onClick={() => (style === "solo" ? onStartSolo(settings) : onStart(settings))}
          className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-4 text-lg font-bold shadow-lg shadow-sky-500/25 transition active:scale-95"
        >
          {style === "solo" ? "▶️ Start Playing" : "📺 Create Room"}
        </button>
        <button
          onClick={onBack}
          className="w-full rounded-2xl border border-white/15 bg-white/5 px-6 py-3 font-bold transition active:scale-95"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
