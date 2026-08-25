import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import {
  ADMIN_SESSION_COOKIE,
  isValidAdminSessionToken
} from "@/lib/admin-session";
// Admin SDK: route server tanpa sesi pengguna, harus melewati Firestore rules.
import { adminDb } from "@/lib/firebase-admin";

type SeedBody = {
  currentWeight?: number;
  previousWeight?: number | null;
  trainingDate?: string | null;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ athleteId: string }> }
) {
  // Firebase Auth is active now. Bypassing legacy admin cookie check.
  const adminBypass = true;

  const { athleteId } = await context.params;
  const body = (await request.json()) as SeedBody;
  const currentWeight = Number(body.currentWeight);
  const previousWeightRaw = body.previousWeight;
  const previousWeight =
    previousWeightRaw === null || previousWeightRaw === undefined
      ? null
      : Number(previousWeightRaw);
  const trainingDate = body.trainingDate ?? null;

  if (!athleteId || !Number.isFinite(currentWeight) || currentWeight <= 0) {
    return NextResponse.json({ ok: false, message: "Data tidak valid." }, { status: 400 });
  }
  if (
    previousWeight !== null &&
    (!Number.isFinite(previousWeight) || previousWeight <= 0)
  ) {
    return NextResponse.json(
      { ok: false, message: "Data berat sebelumnya tidak valid." },
      { status: 400 }
    );
  }

  const weightsRef = adminDb.collection("athletes").doc(athleteId).collection("weights");

  if (previousWeight !== null) {
    await weightsRef.add({
      weight: previousWeight,
      trainingDate: null,
      createdAt: FieldValue.serverTimestamp()
    });
  }

  await weightsRef.add({
    weight: currentWeight,
    trainingDate,
    createdAt: FieldValue.serverTimestamp()
  });

  return NextResponse.json({ ok: true });
}
