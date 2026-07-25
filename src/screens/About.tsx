import { useState } from "react";
import { SiteFooter } from "../components/SiteFooter";

interface Props {
  onBack: () => void;
}

// The story below the photo. First line is the lead; the last is a muted aside.
const LEAD = "Flourish Friends started with flags and a beer.";

const STORY: string[] = [
  "It was World Cup season, and Charles and Rajeedah were sitting at Atlas Brew Works, " +
    "having a lively debate over who could name more national flags. “We need flashcards,” " +
    "Rajeedah said. So Charles did what any self-respecting geek-in-love does — he built a " +
    "quick flag-guessing game that same night.",
  "What was supposed to be a one-off turned into game night. Then Rajeedah had an idea that " +
    "changed everything: “What if it was like Kahoot — something we could play together?” " +
    "Charles, never one to leave his fiancée’s idea on the table, went back to the drawing " +
    "board and built the multiplayer version you’re using today.",
  "The name is as simple as the story: Flourish Friends is a mashup of UrFriendCharles and " +
    "Rajeedah’s Flourish House LLC — two names, one project, built by two people who like " +
    "building things together.",
  "This isn’t a startup chasing a billion-dollar exit. It’s a love project — one part of " +
    "an ongoing, never-ending campaign by one fiancé to make his better half proud.",
];

const ASIDE = "(And yes — Rajeedah is smiling right now reading this.)";

export function About({ onBack }: Props) {
  const [imgOk, setImgOk] = useState(true);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={onBack} className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold">
          ←
        </button>
        <h2 className="text-2xl font-black">About this game</h2>
      </div>

      <div className="flex flex-col items-center text-center">
        {imgOk && (
          <img
            src="/our-story.jpg"
            alt="Charles and Rajeedah on the beach"
            onError={() => setImgOk(false)}
            className="mb-8 w-full max-w-sm rounded-3xl border border-white/10 object-cover shadow-2xl shadow-black/50 animate-pop-in"
          />
        )}

        <h1 className="text-3xl font-black">
          Our{" "}
          <span className="bg-gradient-to-r from-sky-300 via-violet-300 to-rose-300 bg-clip-text text-transparent">
            Story
          </span>
        </h1>

        <p className="mt-4 text-lg font-bold leading-snug text-slate-100">{LEAD}</p>

        <div className="mt-4 flex flex-col gap-4">
          {STORY.map((para, i) => (
            <p key={i} className="text-[15px] leading-relaxed text-slate-300 animate-slide-up">
              {para}
            </p>
          ))}
        </div>

        <p className="mt-5 text-sm italic text-slate-400">{ASIDE}</p>
      </div>

      <div className="mt-8">
        <SiteFooter />
      </div>
    </div>
  );
}
