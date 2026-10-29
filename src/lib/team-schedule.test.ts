import assert from "node:assert/strict";
import test from "node:test";
import { listTrainingSessions, monthBounds } from "./team-schedule.ts";

test("a stored Jakarta session does not invent a second Bandung session", () => {
  const sessions = listTrainingSessions(
    [{ id: "jkt", date: "2026-10-07", city: "Jakarta", status: "latihan" }],
    "2026-10-07",
    "2026-10-07",
  );
  assert.deepEqual(sessions.map((session) => session.city), ["Jakarta"]);
  assert.equal(sessions[0].virtual, false);
});

test("regular Bandung days are virtual until a document exists, and national holidays are not", () => {
  const sessions = listTrainingSessions([], "2026-05-27", "2026-05-30");
  assert.deepEqual(sessions.map((session) => session.date), ["2026-05-30"]);
  assert.equal(sessions[0].id, "virtual:Bandung:2026-05-30");
});

test("an explicit training override still happens on a national holiday", () => {
  const sessions = listTrainingSessions(
    [{ id: "idul", date: "2026-05-27", city: "Bandung", status: "tambahan" }],
    "2026-05-27",
    "2026-05-27",
  );
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].status, "tambahan");
});

test("a rest document suppresses the virtual regular session", () => {
  const sessions = listTrainingSessions(
    [{ id: "off", date: "2026-10-07", city: "Bandung", status: "libur" }],
    "2026-10-07",
    "2026-10-07",
  );
  assert.deepEqual(sessions, []);
});

test("month bounds stay on the calendar month", () => {
  assert.deepEqual(monthBounds("2026-02"), { start: "2026-02-01", end: "2026-02-28" });
  assert.deepEqual(monthBounds("2026-10"), { start: "2026-10-01", end: "2026-10-31" });
});
