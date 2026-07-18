interface Props {
  onContinue: () => void;
  onBack: () => void;
}

/** Simple illustration: one shared screen connected to player phones. */
function SetupDiagram() {
  return (
    <svg
      viewBox="0 0 320 150"
      className="mx-auto w-full max-w-sm md:max-w-md"
      aria-label="One shared screen connected to several player phones"
      role="img"
    >
      {/* connection lines */}
      <path d="M63 38 C 100 38, 110 62, 132 70" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 4" opacity="0.6" />
      <path d="M63 112 C 100 112, 110 88, 132 80" fill="none" stroke="#fb7185" strokeWidth="2" strokeDasharray="4 4" opacity="0.6" />
      <path d="M257 75 C 240 75, 235 75, 228 75" fill="none" stroke="#4ade80" strokeWidth="2" strokeDasharray="4 4" opacity="0.6" />
      {/* phone 1 */}
      <rect x="18" y="14" width="45" height="48" rx="7" fill="rgba(255,255,255,0.06)" stroke="#38bdf8" strokeWidth="1.5" />
      <circle cx="40.5" cy="54" r="2.5" fill="#38bdf8" />
      <text x="40.5" y="38" textAnchor="middle" fontSize="15">📱</text>
      {/* phone 2 */}
      <rect x="18" y="88" width="45" height="48" rx="7" fill="rgba(255,255,255,0.06)" stroke="#fb7185" strokeWidth="1.5" />
      <circle cx="40.5" cy="128" r="2.5" fill="#fb7185" />
      <text x="40.5" y="112" textAnchor="middle" fontSize="15">📱</text>
      {/* phone 3 */}
      <rect x="257" y="51" width="45" height="48" rx="7" fill="rgba(255,255,255,0.06)" stroke="#4ade80" strokeWidth="1.5" />
      <circle cx="279.5" cy="91" r="2.5" fill="#4ade80" />
      <text x="279.5" y="75" textAnchor="middle" fontSize="15">📱</text>
      {/* shared screen */}
      <rect x="132" y="34" width="92" height="62" rx="6" fill="rgba(56,189,248,0.12)" stroke="#7dd3fc" strokeWidth="2" />
      <rect x="168" y="96" width="20" height="8" fill="rgba(255,255,255,0.15)" />
      <rect x="154" y="104" width="48" height="4" rx="2" fill="rgba(255,255,255,0.15)" />
      <text x="178" y="60" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#e2e8f0">ROOM</text>
      <text x="178" y="80" textAnchor="middle" fontSize="18" fontWeight="900" fill="#7dd3fc" letterSpacing="3">ABCD</text>
    </svg>
  );
}

export function PartyIntro({ onContinue, onBack }: Props) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-6 py-8 md:max-w-2xl md:justify-center">
      <div className="text-center animate-pop-in">
        <div className="text-5xl">🎉</div>
        <h2 className="mt-2 text-3xl font-black md:text-4xl">Party Multiplayer</h2>
        <p className="mt-2 text-sm text-slate-300 md:text-base">
          <span className="font-bold text-white">This device becomes the shared game board.</span>{" "}
          Everyone else plays from their own phone.
        </p>
      </div>

      <SetupDiagram />

      <div className="space-y-2.5 md:space-y-3">
        <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5 md:p-4">
          <span className="text-xl">📺</span>
          <p className="text-sm text-slate-200 md:text-base">
            <span className="font-bold text-white">This screen runs the show</span> — room code,
            flags, timers, scores, and results all appear here.
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5 md:p-4">
          <span className="text-xl">📱</span>
          <p className="text-sm text-slate-200 md:text-base">
            <span className="font-bold text-white">Players join on their phones or tablets</span> —
            they enter the room code, pick a name, and answer there. Answers stay secret until the
            reveal.
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5 md:p-4">
          <span className="text-xl">✋</span>
          <p className="text-sm text-slate-200 md:text-base">
            <span className="font-bold text-white">Keep this device on the game screen.</span> It's
            the board, not a player — grab another phone if the host wants to play too.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4">
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-violet-200">
          Want it on the TV?
        </div>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-200 md:text-base">
          <li>
            Open <span className="font-bold">flourishfriends.com</span> in your TV's web browser,
            then type the TV link shown in the room lobby.
          </li>
          <li>Or connect this computer to the TV with an HDMI cable.</li>
          <li>Or use Cast / AirPlay to mirror this screen.</li>
        </ol>
      </div>

      <div className="mt-auto flex flex-col gap-2.5 pt-1 md:mt-2">
        <button
          onClick={onContinue}
          className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-4 text-lg font-bold shadow-lg shadow-sky-500/25 transition active:scale-95"
        >
          Got It — Create Game 🚀
        </button>
        <button
          onClick={onBack}
          className="w-full rounded-2xl border border-white/15 bg-white/5 px-6 py-3 font-bold transition active:scale-95"
        >
          ← Go Back
        </button>
      </div>
    </div>
  );
}
