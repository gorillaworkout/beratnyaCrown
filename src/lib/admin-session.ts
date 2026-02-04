import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_SESSION_COOKIE = "beratnya_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

const getSessionSecret = () => {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not set.");
  }
  return secret;
};

const signPayload = (payload: string) => {
  const secret = getSessionSecret();
  return createHmac("sha256", secret).update(payload).digest("hex");
};

export const createAdminSessionToken = () => {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = String(expiresAt);
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
};

export const isValidAdminSessionToken = (token: string | undefined) => {
  if (!token) {
    return false;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return false;
  }

  const expected = signPayload(payload);
  const givenBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (givenBuffer.length !== expectedBuffer.length) {
    return false;
  }
  if (!timingSafeEqual(givenBuffer, expectedBuffer)) {
    return false;
  }

  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt)) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  return now < expiresAt;
};
