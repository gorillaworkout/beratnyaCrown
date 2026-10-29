import { createHmac, timingSafeEqual } from "crypto";

export function gobizSignature(secret: string, rawBody: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function signaturesMatch(expectedHex: string, received: string | null): boolean {
  if (!received) return false;
  const expected = Buffer.from(expectedHex);
  const given = Buffer.from(received);
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}

export function coerceRupiah(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const rounded = Math.round(value);
    return Number.isSafeInteger(rounded) && rounded >= 0 ? rounded : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed) || /^\d+\.\d{1,2}$/.test(trimmed)) {
      const rounded = Math.round(Number(trimmed));
      return Number.isSafeInteger(rounded) && rounded >= 0 ? rounded : null;
    }
  }
  return null;
}

export function gobizOrderId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as { transaction?: { order_id?: unknown }; order_id?: unknown };
  const raw = record.transaction?.order_id ?? record.order_id;
  if (typeof raw !== "string") return null;
  const id = raw.trim();
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(id)) return null;
  return id;
}
