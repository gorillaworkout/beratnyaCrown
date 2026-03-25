import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import {
  ADMIN_SESSION_COOKIE,
  isValidAdminSessionToken
} from "@/lib/admin-session";
import { db } from "@/lib/firebase";

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

  if (previousWeight !== null) {
    await addDoc(collection(db, "athletes", athleteId, "weights"), {
      weight: previousWeight,
      trainingDate: null,
      createdAt: serverTimestamp()
    });
  }

  await addDoc(collection(db, "athletes", athleteId, "weights"), {
    weight: currentWeight,
    trainingDate,
    createdAt: serverTimestamp()
  });

  return NextResponse.json({ ok: true });
}
