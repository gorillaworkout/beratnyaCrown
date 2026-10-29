import { timingSafeEqual } from "crypto";

export function bearerMatches(header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const expected = `Bearer ${secret}`;
  const given = Buffer.from(header);
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length) return false;
  return timingSafeEqual(given, wanted);
}
