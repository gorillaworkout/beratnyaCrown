import assert from "node:assert/strict";
import test from "node:test";
import { A18_SESSIONS, attendancePct, pastSessions } from "./a18-sessions.ts";

test("10 sessions, all Wed/Sat, 26 Aug – 26 Sep 2026", () => {
  assert.equal(A18_SESSIONS.length, 10);
  assert.equal(A18_SESSIONS[0], "2026-08-26");
  assert.equal(A18_SESSIONS[9], "2026-09-26");
  for (const s of A18_SESSIONS) {
    const dow = new Date(`${s}T00:00:00`).getDay();
    assert.ok(dow === 3 || dow === 6, `${s} is not Wed/Sat`);
  }
});

test("denominator is past sessions only", () => {
  assert.deepEqual(pastSessions("2026-09-06"), [...A18_SESSIONS].slice(0, 4));
  assert.equal(pastSessions("2026-08-25").length, 0);
});

test("5 hadir of 6 past sessions = 83%", () => {
  assert.equal(
    attendancePct(
      {
        "2026-08-26": "hadir",
        "2026-08-29": "hadir",
        "2026-09-02": "hadir",
        "2026-09-05": "izin",
        "2026-09-09": "hadir",
        "2026-09-12": "hadir",
      },
      "2026-09-12"
    ),
    83
  );
});

test("izin and missing records count as not-present", () => {
  // 29 Aug is session #2, so 1 izin of 2 past sessions = 0% hadir.
  assert.equal(attendancePct({ "2026-08-26": "izin" }, "2026-08-29"), 0);
  assert.equal(attendancePct({ "2026-08-26": "hadir" }, "2026-08-29"), 50);
  assert.equal(attendancePct({}, "2026-08-29"), 0);
});

test("no past sessions yet → 0, not NaN", () => {
  assert.equal(attendancePct({}, "2026-08-25"), 0);
});
