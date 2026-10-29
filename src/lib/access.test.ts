import assert from "node:assert/strict";
import test from "node:test";
import { accessDecision, parseAllowedEmails } from "./access.ts";

test("empty allowlist still admits an existing athlete and refuses a stranger", () => {
  const allowed = parseAllowedEmails(undefined);
  assert.equal(allowed.size, 0);
  assert.equal(accessDecision({ hasAthleteDoc: true, email: "member@example.com", allowed }), "existing");
  assert.equal(accessDecision({ hasAthleteDoc: false, email: "stranger@example.com", allowed }), "denied");
});

test("allowlist and owner can enter before a profile exists", () => {
  const allowed = parseAllowedEmails(" New@Crown.id, broken, second@crown.id ");
  assert.equal(allowed.has("new@crown.id"), true);
  assert.equal(
    accessDecision({ hasAthleteDoc: false, email: "NEW@crown.id", allowed }),
    "allowlist",
  );
  assert.equal(
    accessDecision({
      hasAthleteDoc: false,
      email: "darmawanbayu1@gmail.com",
      allowed,
      ownerEmail: "darmawanbayu1@gmail.com",
    }),
    "owner",
  );
});
