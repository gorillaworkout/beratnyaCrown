export type LoginBucket = { failures: number; resetAt: number };

export const LOGIN_RATE_LIMIT = 8;
export const LOGIN_RATE_WINDOW_MS = 15 * 60 * 1000;

export function clientIp(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;
  return headers.get("x-real-ip")?.trim() || "unknown";
}

export function beginLoginAttempt(
  bucket: LoginBucket | undefined,
  now: number,
  limit = LOGIN_RATE_LIMIT,
  windowMs = LOGIN_RATE_WINDOW_MS,
): { allowed: boolean; bucket: LoginBucket } {
  if (!bucket || now >= bucket.resetAt) {
    return { allowed: true, bucket: { failures: 0, resetAt: now + windowMs } };
  }
  if (bucket.failures >= limit) return { allowed: false, bucket };
  return { allowed: true, bucket };
}

export function recordLoginFailure(bucket: LoginBucket): LoginBucket {
  return { ...bucket, failures: bucket.failures + 1 };
}
