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

export function authErrorResponse(error: unknown): Response | null {
  const message = error instanceof Error ? error.message : "";
  if (message === "UNAUTHORIZED") {
    return Response.json({ error: "Silakan login kembali." }, { status: 401 });
  }
  if (message === "FORBIDDEN") {
    return Response.json({ error: "Hanya admin yang boleh mengubah tabungan." }, { status: 403 });
  }
  return null;
}
