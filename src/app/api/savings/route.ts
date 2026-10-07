import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { validateSavingsInput } from "@/lib/athlete-savings";
import { isValidRequestId } from "@/lib/savings-client";
import { authErrorResponse, requireAdmin } from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return Response.json({ error: "Data tidak valid." }, { status: 400 });
    }
    // requestId dibuat sekali per pengisian form. Dipakai sebagai ID dokumen,
    // jadi kiriman ulang (retry jaringan / klik ganda) tidak membuat transaksi
    // kedua — penyebab setoran tercatat dobel sebelumnya.
    if (!isValidRequestId(body.requestId)) {
      return Response.json({ error: "Muat ulang halaman lalu coba lagi." }, { status: 400 });
    }
    const result = validateSavingsInput(body);
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });

    const ref = adminDb.collection("crown-athlete-savings-transactions").doc(body.requestId);
    const athleteRef = adminDb.collection("crown-athletes").doc(result.value.athleteId);
    const created = await adminDb.runTransaction(async (transaction) => {
      const [existing, athlete] = await transaction.getAll(ref, athleteRef);
      if (existing.exists) return false;
      if (!athlete.exists) throw new Error("ATHLETE_NOT_FOUND");
      const athleteName = athlete.data()?.name?.trim();
      if (!athleteName) throw new Error("ATHLETE_NAME_INVALID");
      transaction.set(ref, {
        ...result.value,
        athleteName,
        createdByUid: admin.uid,
        createdByName: admin.name,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return true;
    });
    return Response.json({ id: ref.id, duplicate: !created }, { status: created ? 201 : 200 });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof Error && error.message === "ATHLETE_NOT_FOUND") {
      return Response.json({ error: "Atlet tidak ditemukan." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "ATHLETE_NAME_INVALID") {
      return Response.json({ error: "Nama atlet tidak valid." }, { status: 400 });
    }
    console.error("Failed to create savings transaction", error);
    return Response.json({ error: "Gagal menyimpan transaksi." }, { status: 500 });
  }
}
