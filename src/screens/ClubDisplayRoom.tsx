import { useClubSocket } from "../hooks/useClubSocket";
import { ClubBoard } from "../components/ClubBoard";

interface Props {
  roomCode: string;
}

// Read-only big-screen view: same board as the host sees, no controls. Open it
// on the TV when the host would rather keep their own device private.

export function ClubDisplayRoom({ roomCode }: Props) {
  const { snapshot, connected, fatalError, clockOffset } = useClubSocket(roomCode, () => ({
    type: "hello",
    role: "display",
  }));

  const joinUrl = `${window.location.origin}/join/${roomCode}`;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-6 md:max-w-5xl md:px-8">
      <div className="flex items-center justify-between text-xs font-bold text-slate-400 md:text-sm">
        <span>🧠 0.5% Club</span>
        <span>
          ROOM <span className="tracking-widest text-sky-200">{roomCode}</span>
          {!connected && " · 🟡 Reconnecting…"}
        </span>
      </div>
      {fatalError ? (
        <div className="my-auto space-y-3 text-center">
          <div className="text-5xl">🚪</div>
          <p className="font-bold">{fatalError}</p>
        </div>
      ) : snapshot ? (
        <ClubBoard snapshot={snapshot} clockOffset={clockOffset} joinUrl={joinUrl} />
      ) : (
        <div className="my-auto text-center text-slate-400">Connecting to the room…</div>
      )}
    </div>
  );
}
