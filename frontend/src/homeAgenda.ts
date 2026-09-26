import type { LifeRecord } from "./types";

/** Input is today's expanded schedule, including recurring courses. */
export function nextAgendaItem(records: LifeRecord[], now: Date) {
  const minute = now.getHours() * 60 + now.getMinutes();
  const minutes = (time: string) => {
    const [hour, min] = time.split(":").map(Number);
    return hour * 60 + min;
  };
  return records
    .filter((r) => {
      if (r.done || !r.start) return false;
      const start = minutes(r.start);
      // Only courses expose an end-time field. Tasks/meals can carry an
      // unrelated legacy editor default, so their duration is authoritative.
      const end =
        r.kind === "course" && r.end
          ? minutes(r.end)
          : start + (r.duration ?? 0);
      return start >= minute || end > minute;
    })
    .sort((a, b) => a.start!.localeCompare(b.start!))[0];
}
