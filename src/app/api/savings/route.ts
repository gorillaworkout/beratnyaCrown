import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { validateSavingsInput } from "@/lib/athlete-savings";
import { authErrorResponse, requireAdmin } from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const result = validateSavingsInput(await request.json());
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });

    const ref = adminDb.collection("crown-athlete-savings-transactions").doc();
    const athleteRef = adminDb.collection("crown-athletes").doc(result.value.athleteId);
    await adminDb.runTransaction(async (transaction) => {
      const athlete = await transaction.get(athleteRef);
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
    });
    return Response.json({ id: ref.id }, { status: 201 });
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
