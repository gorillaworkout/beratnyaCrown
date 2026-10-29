import assert from "node:assert/strict";
import test from "node:test";
import { coerceRupiah, gobizOrderId, gobizSignature, signaturesMatch } from "./gobiz.ts";

test("signature match accepts the hex hmac and rejects a different body", () => {
  const secret = "test-relay-secret";
  const body = "{\"order_id\":\"ORD-1\"}";
  const signature = gobizSignature(secret, body);
  assert.equal(signaturesMatch(signature, signature), true);
  assert.equal(signaturesMatch(gobizSignature(secret, body + " "), signature), false);
  assert.equal(signaturesMatch(signature, null), false);
  assert.equal(signaturesMatch(signature, "abc"), false);
});

test("rupiah amounts become non-negative integers", () => {
  assert.equal(coerceRupiah(13000), 13000);
  assert.equal(coerceRupiah("26000"), 26000);
  assert.equal(coerceRupiah("15000.40"), 15000);
  assert.equal(coerceRupiah("15000.60"), 15001);
  assert.equal(coerceRupiah(-1), null);
  assert.equal(coerceRupiah("13.000"), null);
  assert.equal(coerceRupiah("abc"), null);
});

test("order id is taken from the transaction and kept safe as a document id", () => {
  assert.equal(gobizOrderId({ transaction: { order_id: "ORD_1-a" } }), "ORD_1-a");
  assert.equal(gobizOrderId({ order_id: "plain" }), "plain");
  assert.equal(gobizOrderId({ order_id: "a/b" }), null);
  assert.equal(gobizOrderId({}), null);
});
