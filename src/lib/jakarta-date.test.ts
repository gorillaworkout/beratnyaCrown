import assert from "node:assert/strict";
import test from "node:test";
import { chunkList, isBillableTrainingDate, jakartaDateString, KAS_SYNC_BATCH } from "./jakarta-date.ts";
import { bearerMatches } from "./cron-auth.ts";

test("jakarta date stays on the local calendar day across UTC midnight", () => {
  assert.equal(jakartaDateString(new Date("2026-10-29T16:30:00.000Z")), "2026-10-29");
  assert.equal(jakartaDateString(new Date("2026-10-29T17:30:00.000Z")), "2026-10-30");
});

test("kas sync bills only training dates that have already passed in Jakarta", () => {
  const today = "2026-10-29";
  assert.equal(isBillableTrainingDate("2026-08-28", today), false);
  assert.equal(isBillableTrainingDate("2026-08-29", today), true);
  assert.equal(isBillableTrainingDate("2026-10-28", today), true);
  assert.equal(isBillableTrainingDate("2026-10-29", today), false);
  assert.equal(isBillableTrainingDate("2026-10-30", today), false);
});

test("kas sync batches stay at or under 400", () => {
  const chunks = chunkList(Array.from({ length: 950 }, (_, i) => i), KAS_SYNC_BATCH);
  assert.deepEqual(chunks.map((chunk) => chunk.length), [400, 400, 150]);
});

test("cron bearer compare rejects missing, wrong, and prefix-only secrets", () => {
  assert.equal(bearerMatches(null, "cron-secret"), false);
  assert.equal(bearerMatches("Bearer cron-secret", ""), false);
  assert.equal(bearerMatches("Bearer wrong-secret", "cron-secret"), false);
  assert.equal(bearerMatches("Bearer cron-secret", "cron-secret"), true);
  assert.equal(bearerMatches("bearer cron-secret", "cron-secret"), false);
});
