import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { isTrainingDateForCity } from "@/lib/kas-payment";
import { authErrorResponse, requireAdmin } from "@/lib/server-auth";
import { isValidRequestId } from "@/lib/savings-client";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json().catch(() => null);
    const dates: string[] = Array.isArray(body?.dates)
      ? Array.from(new Set<string>((body.dates as unknown[]).filter((date): date is string => typeof date === "string")))
      : [];
    const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(new Date());
    if (!isValidRequestId(body?.requestId) || typeof body?.athleteId !== "string" || !body.athleteId) {
      return Response.json({ error: "Data pembayaran tidak valid." }, { status: 400 });
    }
    if (dates.length < 1 || dates.length > 24 || dates.some((date) => typeof date !== "string" || date <= today)) {
      return Response.json({ error: "Pilih 1–24 tanggal latihan mendatang." }, { status: 400 });
    }

    const normalizedDates = [...dates].sort();
    const fingerprint = createHash("sha256").update(JSON.stringify({ athleteId: body.athleteId, dates: normalizedDates })).digest("hex");
    const requestRef = adminDb.collection("crown-kas-bulk-requests").doc(body.requestId);
    const athleteRef = adminDb.collection("crown-athletes").doc(body.athleteId);
    const kasQuery = adminDb.collection("crown-kas-daily").where("athleteId", "==", body.athleteId);
    const scheduleQuery = adminDb.collection("crown-schedules");
    const eventQuery = adminDb.collection("crown-events");

    const created = await adminDb.runTransaction(async (transaction) => {
      // Semua lookup berada di transaction. Writer bersamaan mengulang callback,
      // sehingga satu athlete+date tidak bisa lolos dari uniqueness check.
      const [duplicate, athlete, kasRecords, schedules, events] = await Promise.all([
        transaction.get(requestRef),
        transaction.get(athleteRef),
        transaction.get(kasQuery),
        transaction.get(scheduleQuery),
        transaction.get(eventQuery),
      ]);
      if (duplicate.exists) {
        if (duplicate.data()?.fingerprint !== fingerprint) throw new Error("REQUEST_ID_CONFLICT");
        return false;
      }
      if (!athlete.exists || athlete.data()?.kasExempt) throw new Error("ATHLETE_INVALID");

      const city = athlete.data()?.city || "Bandung";
      const scheduleRows = [
        ...schedules.docs.map((doc) => doc.data() as { date: string; city?: string; status?: string }),
        ...events.docs.map((doc) => ({ ...doc.data(), city: "Gabungan" }) as { date: string; city?: string; status?: string }),
      ];
      if (normalizedDates.some((date) => !isTrainingDateForCity(date, city, scheduleRows))) {
        throw new Error("INVALID_TRAINING_DATE");
      }

      const recordsByDate = new Map<string, typeof kasRecords.docs>();
      kasRecords.docs.forEach((doc) => {
        const date = doc.data().date;
        recordsByDate.set(date, [...(recordsByDate.get(date) ?? []), doc]);
      });

      normalizedDates.forEach((date) => {
        const matches = recordsByDate.get(date) ?? [];
        if (matches.length > 1) throw new Error("DUPLICATE_KAS_RECORD");
        const existing = matches[0];
        const old = existing?.data();
        const ref = existing?.ref ?? adminDb.collection("crown-kas-daily").doc(`${body.athleteId}_${date}`);
        const totalBilled = Math.max(old?.totalBilled ?? 0, 13_000);
        const legacyPaid = old?.paidAmount ?? (old?.isSettled ? old?.totalBilled ?? 0 : 0);
        const paidAmount = Math.max(legacyPaid, 13_000);
        transaction.set(ref, {
          date,
          athleteId: body.athleteId,
          name: athlete.data()?.name ?? "",
          division: athlete.data()?.division ?? "",
          paidKas: true,
          paidAmount,
          totalBilled,
          isSettled: paidAmount >= totalBilled,
          updatedAt: FieldValue.serverTimestamp(),
          ...(old ? {} : {
            isLate: false,
            noNews: false,
            isExcused: false,
            isExcusedWork: false,
            isExcusedOther: false,
            createdAt: FieldValue.serverTimestamp(),
          }),
        }, { merge: true });
      });
      transaction.set(requestRef, {
        athleteId: body.athleteId,
        dates: normalizedDates,
        fingerprint,
        createdByUid: admin.uid,
        createdByName: admin.name,
        createdAt: FieldValue.serverTimestamp(),
      });
      return true;
    });

    return Response.json({ updated: normalizedDates.length, duplicate: !created }, { status: created ? 201 : 200 });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    const message = error instanceof Error ? error.message : "";
    if (message === "ATHLETE_INVALID") return Response.json({ error: "Atlet tidak ditemukan atau bebas kas." }, { status: 400 });
    if (message === "INVALID_TRAINING_DATE") return Response.json({ error: "Tanggal harus berasal dari Calendar atlet tersebut." }, { status: 400 });
    if (message === "REQUEST_ID_CONFLICT") return Response.json({ error: "Permintaan pembayaran berubah. Muat ulang lalu coba lagi." }, { status: 409 });
    if (message === "DUPLICATE_KAS_RECORD") return Response.json({ error: "Ada data kas ganda. Rapikan data sebelum pembayaran." }, { status: 409 });
    console.error("Failed to bulk pay kas", error);
    return Response.json({ error: "Gagal menyimpan pembayaran kas." }, { status: 500 });
  }
}
