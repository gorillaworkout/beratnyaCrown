import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function GET(request: Request) {
  try {
    // Ambil SEMUA user dari Firebase Auth (Gorillatix + Crown)
    const listUsersResult = await adminAuth.listUsers(1000);
    const authUsers = new Map(
      listUsersResult.users.map((u) => [
        u.uid,
        {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName,
          photoURL: u.photoURL,
          disabled: u.disabled,
          creationTime: u.metadata.creationTime,
          lastSignInTime: u.metadata.lastSignInTime,
        },
      ])
    );

    // Ambil HANYA user yang pernah login ke CrownHub (dari Firestore crown-athletes)
    const crownAthletesSnap = await adminDb.collection("crown-athletes").get();
    const users = [];

    for (const doc of crownAthletesSnap.docs) {
      const athleteData = doc.data();
      const uid = doc.id;
      
      // Jika user ini ada di Auth, ambil detail status aktif/blokirnya
      const authData = authUsers.get(uid);
      
      if (authData) {
        users.push({
          uid,
          email: authData.email || athleteData.email,
          displayName: authData.displayName || athleteData.name,
          photoURL: authData.photoURL || athleteData.photoURL,
          disabled: authData.disabled,
          creationTime: authData.creationTime,
          lastSignInTime: authData.lastSignInTime,
          // Tambahan metadata dari CrownHub
          lastLoginCrown: athleteData.lastLogin?.toDate()?.toISOString() || null,
        });
      }
    }

    // Urutkan berdasarkan yang paling baru login ke Crown
    users.sort((a, b) => {
      const timeA = new Date(a.lastLoginCrown || a.creationTime).getTime();
      const timeB = new Date(b.lastLoginCrown || b.creationTime).getTime();
      return timeB - timeA;
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error listing users:", error);
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }
}
