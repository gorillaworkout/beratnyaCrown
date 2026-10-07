import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { validateSavingsInput } from "@/lib/athlete-savings";
import { authErrorResponse, requireAdmin } from "@/lib/server-auth";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();
    const result = validateSavingsInput(body, {
      requireReason: true,
      reason: body.reason,
    });
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });

    const transactionRef = adminDb
      .collection("crown-athlete-savings-transactions")
      .doc(params.id);
    const athleteRef = adminDb.collection("crown-athletes").doc(result.value.athleteId);
    const auditRef = adminDb.collection("crown-athlete-savings-audits").doc();

    await adminDb.runTransaction(async (transaction) => {
      const [snapshot, athlete] = await transaction.getAll(transactionRef, athleteRef);
      if (!snapshot.exists) throw new Error("NOT_FOUND");
      if (snapshot.data()?.cancelledAt) throw new Error("CANCELLED");
      if (!athlete.exists) throw new Error("ATHLETE_NOT_FOUND");
      const athleteName = athlete.data()?.name?.trim();
      if (!athleteName) throw new Error("ATHLETE_NAME_INVALID");

      const before = { id: snapshot.id, ...snapshot.data() };
      const editedAt = Timestamp.now();
      const after = {
        ...before,
        ...result.value,
        athleteName,
        updatedByUid: admin.uid,
        updatedByName: admin.name,
        updatedAt: editedAt,
      };

      const { id: _id, ...storedAfter } = after;
      transaction.set(transactionRef, storedAfter);
      transaction.set(auditRef, {
        transactionId: params.id,
        before,
        after,
        reason: body.reason.trim(),
        editedByUid: admin.uid,
        editedByName: admin.name,
        editedAt,
      });
    });

    return Response.json({ ok: true });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return Response.json({ error: "Transaksi tidak ditemukan." }, { status: 404 });
    }
    if (error instanceof Error && error.message === "CANCELLED") {
      return Response.json({ error: "Transaksi yang dibatalkan tidak dapat diedit." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "ATHLETE_NOT_FOUND") {
      return Response.json({ error: "Atlet tidak ditemukan." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "ATHLETE_NAME_INVALID") {
      return Response.json({ error: "Nama atlet tidak valid." }, { status: 400 });
    }
    console.error("Failed to update savings transaction", error);
    return Response.json({ error: "Gagal mengubah transaksi." }, { status: 500 });
  }
}
