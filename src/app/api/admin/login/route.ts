import { NextResponse } from "next/server";

import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken
} from "@/lib/admin-session";
import {
  beginLoginAttempt,
  clientIp,
  recordLoginFailure,
  type LoginBucket,
} from "@/lib/login-rate-limit";

const loginBuckets = new Map<string, LoginBucket>();

type LoginBody = {
  username?: string;
  password?: string;
};

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const attempt = beginLoginAttempt(loginBuckets.get(ip), Date.now());
  loginBuckets.set(ip, attempt.bucket);
  if (!attempt.allowed) {
    return NextResponse.json(
      { ok: false, message: "Terlalu banyak percobaan. Coba lagi nanti." },
      { status: 429 }
    );
  }

  const body = (await request.json()) as LoginBody;
  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";

  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    return NextResponse.json(
      { ok: false, message: "Admin credentials are not configured." },
      { status: 500 }
    );
  }

  if (username !== adminUsername || password !== adminPassword) {
    loginBuckets.set(ip, recordLoginFailure(attempt.bucket));
    return NextResponse.json(
      { ok: false, message: "Username atau password salah." },
      { status: 401 }
    );
  }

  loginBuckets.delete(ip);

  const token = createAdminSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12
  });

  return response;
}
