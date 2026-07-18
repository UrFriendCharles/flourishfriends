import { useState } from "react";
import type { ScoreShare } from "../types";
import { shareText, shareUrl } from "../logic/scoreSharing";

interface Props {
  share: ScoreShare;
}

export function ScoreShareWidget({ share }: Props) {
  const [copied, setCopied] = useState(false);
  const url = shareUrl(share);
  const text = shareText(share);
  const message = `${text} ${url}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // clipboard API blocked — legacy fallback
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const nativeShare = () =>
    navigator.share({ title: "Flourish Friends Flag Quiz", text, url }).catch(() => {});

  const intent = (href: string, label: string, emoji: string) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-1 rounded-xl border border-white/15 bg-white/5 px-2 py-2 text-center text-xs font-bold transition active:scale-95"
    >
      {emoji} {label}
    </a>
  );

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-sky-400/30 bg-sky-500/10 p-3 animate-pop-in">
      <div className="truncate rounded-lg bg-black/25 px-3 py-2 text-xs text-slate-300">
        {url}
      </div>
      <div className="flex gap-2">
        <button
          onClick={copyLink}
          className="flex-1 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-3 py-2 text-sm font-bold transition active:scale-95"
        >
          {copied ? "✅ Copied!" : "🔗 Copy Link"}
        </button>
        {typeof navigator.share === "function" && (
          <button
            onClick={nativeShare}
            className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-bold transition active:scale-95"
          >
            📤 Share…
          </button>
        )}
      </div>
      <div className="flex gap-2">
        {intent(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`,
          "Post",
          "🐦"
        )}
        {intent(`sms:?&body=${encodeURIComponent(message)}`, "Text", "💬")}
        {intent(`https://wa.me/?text=${encodeURIComponent(message)}`, "WhatsApp", "🟢")}
      </div>
    </div>
  );
}
