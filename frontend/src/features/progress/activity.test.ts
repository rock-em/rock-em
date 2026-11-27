import { describe, expect, it } from "vitest";
import { activityCalendar, activityLevel, addActivity, dayKey } from "./activity";

const today = new Date(2026, 10, 27, 12);

describe("practice activity", () => {
  it("counts repeated submissions without mutating existing history", () => {
    const first = addActivity({}, today);
    expect(addActivity(first, today)).toEqual({ "2026-11-27": 2 });
    expect(first).toEqual({ "2026-11-27": 1 });
  });
  it("keeps different local dates separate", () => {
    expect(addActivity(addActivity({}, today), new Date(2026, 10, 28))).toEqual({ "2026-11-27": 1, "2026-11-28": 1 });
  });
  it("creates twelve complete Monday-first weeks", () => {
    const days = activityCalendar({}, today);
    expect(days).toHaveLength(84);
    expect(days[0].date.getDay()).toBe(1);
    expect(days[83].date.getDay()).toBe(0);
    expect(new Set(days.map((day) => day.key)).size).toBe(84);
  });
  it("excludes future dates from recorded activity", () => {
    const days = activityCalendar({ "2026-11-27": 3, "2026-11-28": 7 }, today);
    expect(days.find((day) => day.key === dayKey(today))?.count).toBe(3);
    expect(days.find((day) => day.key === "2026-11-28")).toMatchObject({ future: true, count: 0 });
  });
  it("maps submission counts to five intensity levels", () => {
    expect([0, 1, 3, 6, 7].map(activityLevel)).toEqual([0, 1, 2, 3, 4]);
  });
});
