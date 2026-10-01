import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { uid, action } = body;

    if (!uid || !action) {
      return NextResponse.json({ error: "Missing uid or action" }, { status: 400 });
    }

    if (!["make_admin", "remove_admin", "make_viewer", "remove_viewer"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const role = action === "make_admin" ? "admin" : action === "make_viewer" ? "viewer" : "member";
    await adminDb.collection("crown-athletes").doc(uid).set({ role }, { merge: true });
    return NextResponse.json({ success: true, role });
  } catch (error) {
    console.error("Error setting role:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
