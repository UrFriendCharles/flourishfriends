import { BuntingMark } from "../components/BuntingMark";
import { SiteFooter } from "../components/SiteFooter";

interface Props {
  onFlagGame: () => void;
  onClub: () => void;
  onJoinRoom: () => void;
}

// Flourish Friends is a game platform now, not one quiz (§54). Every game
// behind this picker shares the same rooms, codes, QR joining and phone
// controllers.

export function PlatformHome({ onFlagGame, onClub, onJoinRoom }: Props) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <div className="text-center animate-pop-in">
          <div className="mb-2 flex justify-center">
            <BuntingMark size={96} />
          </div>
          <h1 className="text-4xl font-black leading-tight">Flourish Friends</h1>
          <p className="mt-3 text-sm text-slate-400">What are we playing?</p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <button
            onClick={onFlagGame}
            className="w-full rounded-2xl border border-sky-400/40 bg-gradient-to-r from-sky-500/20 to-sky-500/5 px-6 py-5 text-left transition active:scale-95"
          >
            <div className="text-xl font-black">🌎 Flag Game</div>
            <div className="mt-0.5 text-sm text-slate-400">
              Guess the country. Beat your friends. Learn the world.
            </div>
          </button>

          <button
            onClick={onClub}
            className="w-full rounded-2xl border border-violet-400/40 bg-gradient-to-r from-violet-500/20 to-violet-500/5 px-6 py-5 text-left transition active:scale-95"
          >
            <div className="text-xl font-black">🧠 0.5% Club</div>
            <div className="mt-0.5 text-sm text-slate-400">
              Eleven puzzles, 90% down to 0.5%. How far can you get?
            </div>
          </button>

          <button
            onClick={onJoinRoom}
            className="w-full rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 font-bold transition active:scale-95"
          >
            📱 Join a Game
          </button>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
