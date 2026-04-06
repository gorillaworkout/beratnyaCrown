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

    if (action !== "make_admin" && action !== "remove_admin") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const isAdmin = action === "make_admin";
    
    await adminDb.collection("crown-athletes").doc(uid).set({
      role: isAdmin ? "admin" : "member"
    }, { merge: true });

    return NextResponse.json({ success: true, role: isAdmin ? "admin" : "member" });
  } catch (error) {
    console.error("Error setting role:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
