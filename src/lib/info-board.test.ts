import assert from "node:assert/strict";
import test from "node:test";
import { validateInfoItem } from "./info-board.ts";

test("info board item requires title and category", () => {
  assert.equal(validateInfoItem({ category: "finance", title: "", description: "" }), false);
  assert.equal(validateInfoItem({ category: "event", title: "Kompetisi Baru", description: "" }), true);
});
