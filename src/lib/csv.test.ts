import assert from "node:assert/strict";
import test from "node:test";
import { csvTable } from "./csv.ts";

test("csv rows are real lines and commas stay inside quotes", () => {
  assert.equal(csvTable([["Tanggal", "Nama"], ["2026-10-29", "Putri, A"]]), "Tanggal,Nama\n2026-10-29,\"Putri, A\"");
});
