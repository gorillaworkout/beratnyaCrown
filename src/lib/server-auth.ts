import { adminAuth, adminDb } from "@/lib/firebase-admin";

const OWNER_EMAIL = "darmawanbayu1@gmail.com";

export type VerifiedAdmin = {
  uid: string;
  name: string;
  email: string;
};

export async function requireAdmin(request: Request): Promise<VerifiedAdmin> {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer (.+)$/);
  if (!match) throw new Error("UNAUTHORIZED");

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(match[1], true);
  } catch {
    throw new Error("UNAUTHORIZED");
  }
  const athlete = await adminDb.collection("crown-athletes").doc(decoded.uid).get();
  const isOwner = decoded.email === OWNER_EMAIL;
  if (!isOwner && (!athlete.exists || athlete.data()?.role !== "admin")) {
    throw new Error("FORBIDDEN");
  }

  return {
    uid: decoded.uid,
    email: decoded.email ?? "",
    name: athlete.data()?.name || decoded.name || decoded.email || "Admin",
  };
}

export function authErrorResponse(
  error: unknown,
  options: { forbidden?: string; as?: "error" | "message" } = {},
): Response | null {
  const message = error instanceof Error ? error.message : "";
  const forbidden = options.forbidden ?? "Hanya admin yang boleh mengubah tabungan.";
  const text = message === "UNAUTHORIZED" ? "Silakan login kembali." : message === "FORBIDDEN" ? forbidden : "";
  if (!text) return null;
  const status = message === "UNAUTHORIZED" ? 401 : 403;
  if (options.as === "message") {
    return Response.json({ ok: false, message: text }, { status });
  }
  return Response.json({ error: text }, { status });
}

export async function requireAdminOrResponse(
  request: Request,
  options: { forbidden?: string; as?: "error" | "message" } = {},
): Promise<VerifiedAdmin | Response> {
  try {
    return await requireAdmin(request);
  } catch (error) {
    const response = authErrorResponse(error, options);
    if (response) return response;
    throw error;
  }
}
