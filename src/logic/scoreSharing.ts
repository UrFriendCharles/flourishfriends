import type { ScoreShare } from "../types";
import { collectionLabel, encodeShare } from "./scoreShareWire";

// Client-facing share helpers. The DOM-free wire format (encode/decode) and
// preview-card copy live in scoreShareWire.ts so the worker can reuse them.
export { decodeShare, shareOgTitle, shareOgDescription } from "./scoreShareWire";

export function shareUrl(share: ScoreShare): string {
  return `${window.location.origin}/score/${share.shareId}?s=${encodeShare(share)}`;
}

export function shareText(share: ScoreShare): string {
  return (
    `🌍 I scored ${share.score} on the Flourish Friends Flag Quiz! ` +
    `${share.correctAnswers}/${share.totalQuestions} ${collectionLabel(share.collection)} ` +
    `(${share.difficulty}), 🔥 best streak ${share.bestStreak}. Can you beat me?`
  );
}
