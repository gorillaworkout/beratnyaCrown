import assert from "node:assert/strict";
import test from "node:test";
import { resolveAdditionalCity } from "./schedule-city.ts";

test("Bandung existing forces additional schedule to Jakarta", () => {
  assert.equal(resolveAdditionalCity(["Bandung"], "Bandung"), "Jakarta");
});

test("Jakarta existing forces additional schedule to Bandung", () => {
  assert.equal(resolveAdditionalCity(["Jakarta"], "Jakarta"), "Bandung");
});

test("duplicate city is rejected when both cities already exist", () => {
  assert.equal(resolveAdditionalCity(["Bandung", "Jakarta"], "Bandung"), null);
});

test("selected city remains available on an empty date", () => {
  assert.equal(resolveAdditionalCity([], "Bandung"), "Bandung");
});
