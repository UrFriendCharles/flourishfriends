import type { Country } from "../types";
import {
  countryFacts,
  formatArea,
  formatPopulation,
  formatStateArea,
  stateFacts,
} from "../data/placeFacts";

/** Quick-facts row shown on the answer reveal (phone, host and TV screens). */
export function factItems(place: Country): { icon: string; label: string; value: string }[] {
  if (place.id.startsWith("state-")) {
    const f = stateFacts(place.id);
    if (!f) return [];
    return [
      { icon: "🏷️", label: "Nickname", value: f.nickname },
      { icon: "👥", label: "Population", value: formatPopulation(f.population) },
      { icon: "📏", label: "Area", value: formatStateArea(f.areaMi2) },
      { icon: "⛰️", label: "Highest point", value: `${f.highestFt.toLocaleString("en-US")} ft` },
      { icon: "🌡️", label: "Avg. temperature", value: `${f.avgTempF} °F` },
    ];
  }
  const f = countryFacts(place.id);
  if (!f) return [];
  return [
    { icon: "👥", label: "Population", value: formatPopulation(f.population) },
    { icon: "📏", label: "Area", value: formatArea(f.areaKm2) },
    { icon: "💰", label: "Money", value: f.currency },
    { icon: "📅", label: "Founded", value: f.founded },
  ];
}

export function FactStrip({ place, large = false }: { place: Country; large?: boolean }) {
  const items = factItems(place);
  if (items.length === 0) return null;
  return (
    <div
      className={`grid grid-cols-2 gap-1.5 animate-slide-up ${large ? "mx-auto max-w-2xl md:grid-cols-3" : ""}`}
    >
      {items.map((it) => (
        <div
          key={it.label}
          className={`rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 ${large ? "md:px-3 md:py-2" : ""}`}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {it.icon} {it.label}
          </div>
          <div className={`font-bold text-white ${large ? "text-sm md:text-lg" : "text-sm"}`}>
            {it.value}
          </div>
        </div>
      ))}
    </div>
  );
}
