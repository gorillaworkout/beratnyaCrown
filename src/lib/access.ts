export const OWNER_EMAIL = "darmawanbayu1@gmail.com";

export function parseAllowedEmails(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.includes("@")),
  );
}

export function accessDecision(input: {
  hasAthleteDoc: boolean;
  email?: string | null;
  allowed: Set<string>;
  ownerEmail?: string;
}): "existing" | "allowlist" | "owner" | "denied" {
  if (input.hasAthleteDoc) return "existing";
  const email = input.email?.trim().toLowerCase() ?? "";
  if (email && input.ownerEmail && email === input.ownerEmail.trim().toLowerCase()) return "owner";
  if (email && input.allowed.has(email)) return "allowlist";
  return "denied";
}
