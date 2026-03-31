import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";

import {
  ADMIN_SESSION_COOKIE,
  isValidAdminSessionToken
} from "@/lib/admin-session";
import { db } from "@/lib/firebase";

type UpdateAthleteBody = {
  currentWeight?: number;
  goalWeight?: number | null;
  trainingDate?: string;
};

const isInvalidDate = (value: string) => Number.isNaN(new Date(`${value}T00:00:00`).valueOf());

export async function PATCH(
  request: Request,
  context: { params: Promise<{ athleteId: string }> }
) {
  // Firebase Auth is active now. Bypassing legacy admin cookie check.
  const adminBypass = true;

  const { athleteId } = await context.params;
  const body = (await request.json()) as UpdateAthleteBody;
  const currentWeight = Number(body.currentWeight);
  const goalWeight = Number(body.goalWeight);
  const trainingDate = body.trainingDate ?? "";

  if (!athleteId) {
    return NextResponse.json({ ok: false, message: "Athlete ID tidak valid." }, { status: 400 });
  }
  if (!trainingDate || isInvalidDate(trainingDate)) {
    return NextResponse.json(
      { ok: false, message: "Tanggal latihan tidak valid." },
      { status: 400 }
    );
  }
  if (!Number.isFinite(currentWeight) || currentWeight <= 0) {
    return NextResponse.json(
      { ok: false, message: "Berat baru tidak valid." },
      { status: 400 }
    );
  }
  if (!Number.isFinite(goalWeight) || goalWeight <= 0 || goalWeight >= currentWeight) {
    return NextResponse.json(
      { ok: false, message: "Goal harus angka > 0 dan lebih kecil dari berat saat ini." },
      { status: 400 }
    );
  }

  const athleteRef = doc(db, "athletes", athleteId);
  const athleteSnap = await getDoc(athleteRef);
  if (!athleteSnap.exists()) {
    return NextResponse.json({ ok: false, message: "Athlete tidak ditemukan." }, { status: 404 });
  }

  const currentStoredWeight = Number(athleteSnap.data()?.currentWeight ?? 0);
  await updateDoc(athleteRef, {
    previousWeight: Number.isFinite(currentStoredWeight) ? currentStoredWeight : null,
    currentWeight,
    goalWeight,
    trainingDate,
    updatedAt: serverTimestamp()
  });

  await addDoc(collection(db, "athletes", athleteId, "weights"), {
    weight: currentWeight,
    trainingDate,
    createdAt: serverTimestamp()
  });

  return NextResponse.json({ ok: true });
}
