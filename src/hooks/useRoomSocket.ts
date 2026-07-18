import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ClientMessage,
  RoomErrorCode,
  RoomSnapshot,
  ServerMessage,
  YouView,
} from "../logic/roomProtocol";

// Fatal errors mean "stop reconnecting" — retrying won't change the outcome.
const FATAL: Set<RoomErrorCode> = new Set([
  "room-not-found",
  "room-full",
  "already-started",
  "bad-key",
]);

const MAX_RETRIES = 8;

export interface RoomConnection {
  snapshot: RoomSnapshot | null;
  you: YouView | null;
  connected: boolean;
  /** fatal error message — the connection has given up */
  fatalError: string | null;
  /** server clock minus local clock; add to Date.now() to compare with deadlines */
  clockOffset: number;
  send: (msg: ClientMessage) => void;
}

/**
 * Live connection to a game room. `makeHello` is called on every (re)connect
 * so reconnects can carry the freshest identity (e.g. the playerId assigned
 * on first join).
 */
export function useRoomSocket(
  roomCode: string,
  makeHello: () => Extract<ClientMessage, { type: "hello" }>
): RoomConnection {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [you, setYou] = useState<YouView | null>(null);
  const [connected, setConnected] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [clockOffset, setClockOffset] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const helloRef = useRef(makeHello);
  helloRef.current = makeHello;

  useEffect(() => {
    let disposed = false;
    let retries = 0;
    let retryTimer: number | undefined;

    const connect = () => {
      if (disposed) return;
      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(`${proto}://${window.location.host}/ws/${roomCode}`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify(helloRef.current()));
      };

      ws.onmessage = (event) => {
        let msg: ServerMessage;
        try {
          msg = JSON.parse(event.data as string);
        } catch {
          return;
        }
        if (msg.type === "error") {
          if (FATAL.has(msg.code)) {
            setFatalError(msg.message);
            disposed = true;
            ws.close();
          }
          return;
        }
        retries = 0; // healthy connection
        setConnected(true);
        setSnapshot(msg.snapshot);
        setYou(msg.you);
        setClockOffset(msg.snapshot.serverNow - Date.now());
      };

      ws.onclose = () => {
        setConnected(false);
        if (disposed) return;
        if (retries >= MAX_RETRIES) {
          setFatalError("Lost connection to the room.");
          return;
        }
        const delay = Math.min(5000, 400 * 2 ** retries);
        retries++;
        retryTimer = window.setTimeout(connect, delay);
      };
    };

    connect();
    return () => {
      disposed = true;
      window.clearTimeout(retryTimer);
      wsRef.current?.close();
    };
  }, [roomCode]);

  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { snapshot, you, connected, fatalError, clockOffset, send };
}
