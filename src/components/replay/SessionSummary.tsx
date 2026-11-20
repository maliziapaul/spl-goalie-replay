import { META, ftsToMph, outcomeOf } from "@/lib/goalie/data";

const goals = META.filter((s) => s.goal).length;
const saves = META.filter((s) => outcomeOf(s) === "save").length;
const avg = META.reduce((a, s) => a + s.speed, 0) / META.length;
const fastest = META.reduce((a, s) => (s.speed > a.speed ? s : a));
const drops = META.filter((s) => s.drop != null)
  .map((s) => ((s.drop! - s.rel) * 1000) / s.hz)
  .sort((a, b) => a - b);
const medianDrop = drops[Math.floor(drops.length / 2)];

export function SessionSummary() {
  const tiles = [
    { v: goals, l: "goals" },
    { v: saves, l: "aimed on net, stopped" },
    { v: Math.round(avg), l: "avg ft/s" },
  ];
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-mono text-[10.5px] tracking-[0.12em] text-muted-foreground uppercase">Session</h2>
      <div className="grid grid-cols-3 gap-2">
        {tiles.map((t) => (
          <div key={t.l} className="rounded-md bg-secondary px-2.5 py-2">
            <b className="block font-display text-[26px] leading-none font-bold tabular-nums">{t.v}</b>
            <span className="text-[11px] text-muted-foreground">{t.l}</span>
          </div>
        ))}
      </div>
      <p className="text-[11.5px] leading-relaxed text-muted-foreground">
        {goals} of {META.length} shots ended in the net. The fastest was {fastest.id} at {Math.round(fastest.speed)} ft/s (
        {Math.round(ftsToMph(fastest.speed))} mph). The goalie&apos;s hips typically dropped below butterfly height{" "}
        {Math.round(medianDrop)} ms after release.
      </p>
    </section>
  );
}
