import type { Player } from "../types";

interface Props {
  players: Player[];
  activePlayerId?: string;
  winnerId?: string;
}

export function PlayerScoreboard({ players, activePlayerId, winnerId }: Props) {
  const topScore = Math.max(...players.map((p) => p.score));
  const leaders = players.filter((p) => p.score === topScore && topScore > 0);
  const showCrown = leaders.length === 1 && players.length > 1;

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {players.map((p) => {
        const isActive = p.id === activePlayerId;
        const isWinner = p.id === winnerId;
        const isLeader = showCrown && leaders[0].id === p.id;
        return (
          <div
            key={p.id}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all ${
              isWinner
                ? "border-gold-400 bg-gold-500/20"
                : isActive
                  ? "border-sky-300/70 bg-sky-500/15"
                  : "border-white/10 bg-white/5"
            }`}
          >
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span className="font-semibold">{p.name}</span>
            <span className="font-bold tabular-nums text-sky-200">{p.score}</span>
            {p.streak >= 2 && (
              <span className="text-xs font-bold text-orange-300">🔥{p.streak}</span>
            )}
            {(isLeader || isWinner) && <span>👑</span>}
          </div>
        );
      })}
    </div>
  );
}
