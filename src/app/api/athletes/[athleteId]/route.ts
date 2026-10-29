import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdminOrResponse } from "@/lib/server-auth";

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
  const admin = await requireAdminOrResponse(request, {
    forbidden: "Hanya admin yang boleh mengubah berat atlet.",
    as: "message",
  });
  if (admin instanceof Response) return admin;

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

  const athleteRef = adminDb.collection("athletes").doc(athleteId);
  const athleteSnap = await athleteRef.get();
  if (!athleteSnap.exists) {
    return NextResponse.json({ ok: false, message: "Athlete tidak ditemukan." }, { status: 404 });
  }

  const currentStoredWeight = Number(athleteSnap.data()?.currentWeight ?? 0);
  await athleteRef.update({
    previousWeight: Number.isFinite(currentStoredWeight) ? currentStoredWeight : null,
    currentWeight,
    goalWeight,
    trainingDate,
    updatedAt: FieldValue.serverTimestamp()
  });

  await athleteRef.collection("weights").add({
    weight: currentWeight,
    trainingDate,
    createdAt: FieldValue.serverTimestamp()
  });

  return NextResponse.json({ ok: true });
}
