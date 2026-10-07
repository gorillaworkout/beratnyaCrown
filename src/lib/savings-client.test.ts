import assert from "node:assert/strict";
import test from "node:test";
import { isValidRequestId, sendMutation } from "./savings-client.ts";

const ok = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

test("request id accepts generated ids and rejects unsafe ids", () => {
  assert.equal(isValidRequestId("a1b2c3d4-e5f6-7890-abcd-ef1234567890"), true);
  assert.equal(isValidRequestId("short"), false);
  assert.equal(isValidRequestId("../../etc"), false);
  assert.equal(isValidRequestId(undefined), false);
});

test("network failure is retried once with the same request", async () => {
  const bodies: string[] = [];
  let calls = 0;
  const fetchImpl = async (_url: string, init: RequestInit) => {
    calls++;
    bodies.push(String(init.body));
    if (calls === 1) throw new TypeError("Failed to fetch");
    return ok(201, { id: "x" });
  };
  const result = await sendMutation(fetchImpl, "/api/savings", { method: "POST", body: "{\"requestId\":\"r1\"}" });
  assert.deepEqual(result, { ok: true, data: { id: "x" } });
  assert.equal(calls, 2);
  assert.equal(bodies[0], bodies[1]);
});

test("server rejection is returned without retry", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    return ok(400, { error: "Atlet wajib dipilih." });
  };
  const result = await sendMutation(fetchImpl, "/api/savings", { method: "POST" });
  assert.deepEqual(result, { ok: false, error: "Atlet wajib dipilih." });
  assert.equal(calls, 1);
});

test("configured status is treated as success", async () => {
  const fetchImpl = async () => ok(409, { error: "Transaksi sudah dibatalkan." });
  const result = await sendMutation(fetchImpl, "/api/x", { method: "POST" }, { successStatuses: [409] });
  assert.equal(result.ok, true);
});

test("two network failures report a connection error", async () => {
  const fetchImpl = async () => {
    throw new TypeError("Failed to fetch");
  };
  const result = await sendMutation(fetchImpl, "/api/x", { method: "POST" });
  assert.equal(result.ok, false);
  assert.match(result.ok ? "" : result.error, /koneksi/i);
});
