import assert from "node:assert/strict";
import test from "node:test";
import {
  LOGIN_RATE_LIMIT,
  LOGIN_RATE_WINDOW_MS,
  beginLoginAttempt,
  clientIp,
  recordLoginFailure,
} from "./login-rate-limit.ts";

test("client ip uses the first forwarded address", () => {
  const headers = new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" });
  assert.equal(clientIp(headers), "203.0.113.5");
  assert.equal(clientIp(new Headers({ "x-real-ip": "198.51.100.9" })), "198.51.100.9");
  assert.equal(clientIp(new Headers()), "unknown");
});

test("login attempts are allowed until the failure limit, then blocked inside the window", () => {
  const now = 1_000_000;
  let state = beginLoginAttempt(undefined, now);
  assert.equal(state.allowed, true);
  for (let i = 0; i < LOGIN_RATE_LIMIT; i++) state.bucket = recordLoginFailure(state.bucket);
  const blocked = beginLoginAttempt(state.bucket, now + 1000);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.bucket.failures, LOGIN_RATE_LIMIT);
  const afterWindow = beginLoginAttempt(state.bucket, now + LOGIN_RATE_WINDOW_MS);
  assert.equal(afterWindow.allowed, true);
  assert.equal(afterWindow.bucket.failures, 0);
});
