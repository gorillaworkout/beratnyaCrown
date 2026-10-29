import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { OWNER_EMAIL, accessDecision, parseAllowedEmails } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer (.+)$/);
  if (!match) {
    return NextResponse.json({ allowed: false, error: "Silakan login kembali." }, { status: 401 });
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(match[1], true);
  } catch {
    return NextResponse.json({ allowed: false, error: "Silakan login kembali." }, { status: 401 });
  }

  const ref = adminDb.collection("crown-athletes").doc(decoded.uid);
  const snap = await ref.get();
  const decision = accessDecision({
    hasAthleteDoc: snap.exists,
    email: decoded.email,
    allowed: parseAllowedEmails(process.env.ALLOWED_EMAILS),
    ownerEmail: OWNER_EMAIL,
  });
  if (decision === "denied") {
    return NextResponse.json(
      { allowed: false, error: "Akun Google ini belum terdaftar di Crown." },
      { status: 403 },
    );
  }

  if (!snap.exists) {
    try {
      await ref.create({
        email: decoded.email ?? "",
        name: decoded.name ?? "",
        photoURL: decoded.picture ?? "",
        role: "athlete",
        createdAt: new Date().toISOString(),
        targetWeight: 0,
      });
    } catch {
      const again = await ref.get();
      if (!again.exists) {
        console.error("Access: failed to create athlete profile.");
        return NextResponse.json({ allowed: false, error: "Gagal membuat profil." }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ allowed: true, existing: decision === "existing" });
}
