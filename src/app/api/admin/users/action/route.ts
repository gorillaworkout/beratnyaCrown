import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { requireAdminOrResponse } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const admin = await requireAdminOrResponse(request, {
    forbidden: "Hanya admin yang boleh mengubah akun.",
  });
  if (admin instanceof Response) return admin;

  try {
    const { uid, action } = await request.json();

    if (!uid || !action) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const athlete = await adminDb.collection("crown-athletes").doc(uid).get();
    if (!athlete.exists) {
      return NextResponse.json(
        { error: "Akun ini bukan anggota Crown dan tidak diubah." },
        { status: 403 },
      );
    }

    if (action === "delete") {
      await adminAuth.deleteUser(uid);
      return NextResponse.json({ success: true, message: "User deleted" });
    }

    if (action === "block") {
      await adminAuth.updateUser(uid, { disabled: true });
      return NextResponse.json({ success: true, message: "User blocked" });
    }

    if (action === "unblock") {
      await adminAuth.updateUser(uid, { disabled: false });
      return NextResponse.json({ success: true, message: "User unblocked" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error modifying user:", error);
    return NextResponse.json({ error: "Failed to perform action" }, { status: 500 });
  }
}
