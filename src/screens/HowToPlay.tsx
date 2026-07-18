interface Props {
  onBack: () => void;
}

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "🎯 The basics",
    body: "A flag appears with four country names. Pick the right one and lock it in. Correct answers earn 100 points.",
  },
  {
    title: "🇺🇸 Quiz packs & typed answers",
    body: "Choose World Flags or US State Flags in game setup. Feeling brave? Switch answers to Type It In and spell the name yourself — small typos are forgiven, but lifelines are off.",
  },
  {
    title: "👥 Playing with friends",
    body: "In multiplayer, the phone is passed between players each question. Everyone answers in secret, then all picks are revealed together — both players can score on the same flag!",
  },
  {
    title: "⚡ Bonuses",
    body: "Answer within 3 seconds for +50, within 5 seconds for +25. Build streaks: 3 in a row +50, 5 in a row +100, 10 in a row +250.",
  },
  {
    title: "📚 Learning Mode",
    body: "Reveal hints (continent, region, geography, flag facts) one at a time. Each hint lowers the question's value: 100 → 75 → 50 → 25.",
  },
  {
    title: "⭐ Lifelines",
    body: "Each player gets one 50:50 (removes two wrong answers) and one Ask the Crowd (a simulated audience vote — usually right, but not always!) per game.",
  },
  {
    title: "⚔️ Tie-breakers",
    body: "If the game ends in a tie, sudden death begins: tied players keep answering until one is right and the others are wrong.",
  },
];

export function HowToPlay({ onBack }: Props) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-5 py-8">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold">
          ←
        </button>
        <h2 className="text-2xl font-black">❓ How to Play</h2>
      </div>
      {SECTIONS.map((s) => (
        <div key={s.title} className="rounded-2xl border border-white/10 bg-white/5 p-4 animate-slide-up">
          <h3 className="mb-1 font-black">{s.title}</h3>
          <p className="text-sm leading-relaxed text-slate-300">{s.body}</p>
        </div>
      ))}
    </div>
  );
}
