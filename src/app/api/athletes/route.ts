import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import {
  ADMIN_SESSION_COOKIE,
  isValidAdminSessionToken
} from "@/lib/admin-session";
import { db } from "@/lib/firebase";

type CreateAthleteBody = {
  name?: string;
  currentWeight?: number;
  goalWeight?: number;
  trainingDate?: string;
};

const isInvalidDate = (value: string) => Number.isNaN(new Date(`${value}T00:00:00`).valueOf());

export async function POST(request: Request) {
  const store = await cookies();
  const token = store.get(ADMIN_SESSION_COOKIE)?.value;
  if (!isValidAdminSessionToken(token)) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as CreateAthleteBody;
  const name = body.name?.trim() ?? "";
  const currentWeight = Number(body.currentWeight);
  const goalWeight = Number(body.goalWeight);
  const trainingDate = body.trainingDate ?? "";

  if (!name || !trainingDate) {
    return NextResponse.json(
      { ok: false, message: "Nama dan tanggal wajib diisi." },
      { status: 400 }
    );
  }
  if (isInvalidDate(trainingDate)) {
    return NextResponse.json(
      { ok: false, message: "Tanggal latihan tidak valid." },
      { status: 400 }
    );
  }
  if (!Number.isFinite(currentWeight) || currentWeight <= 0) {
    return NextResponse.json(
      { ok: false, message: "Berat awal tidak valid." },
      { status: 400 }
    );
  }
  if (!Number.isFinite(goalWeight) || goalWeight <= 0 || goalWeight >= currentWeight) {
    return NextResponse.json(
      { ok: false, message: "Goal harus angka > 0 dan lebih kecil dari berat awal." },
      { status: 400 }
    );
  }

  const athleteRef = await addDoc(collection(db, "athletes"), {
    name,
    currentWeight,
    previousWeight: null,
    goalWeight,
    trainingDate,
    updatedAt: serverTimestamp()
  });

  await addDoc(collection(db, "athletes", athleteRef.id, "weights"), {
    weight: currentWeight,
    trainingDate,
    createdAt: serverTimestamp()
  });

  return NextResponse.json({ ok: true, id: athleteRef.id });
}
