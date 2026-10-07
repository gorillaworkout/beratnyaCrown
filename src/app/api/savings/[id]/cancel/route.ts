import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { authErrorResponse, requireAdmin } from "@/lib/server-auth";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return Response.json({ error: "Data tidak valid." }, { status: 400 });
    }
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!reason) {
      return Response.json({ error: "Alasan pembatalan wajib diisi." }, { status: 400 });
    }

    const transactionRef = adminDb.collection("crown-athlete-savings-transactions").doc(params.id);
    const auditRef = adminDb.collection("crown-athlete-savings-audits").doc();

    await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(transactionRef);
      if (!snapshot.exists) throw new Error("NOT_FOUND");
      if (snapshot.data()?.cancelledAt) throw new Error("ALREADY_CANCELLED");

      const before = { id: snapshot.id, ...snapshot.data() };
      const cancelledAt = Timestamp.now();
      const after = {
        ...before,
        cancelledByUid: admin.uid,
        cancelledByName: admin.name,
        cancelledAt,
        cancellationReason: reason,
        updatedByUid: admin.uid,
        updatedByName: admin.name,
        updatedAt: cancelledAt,
      };
      const { id: _id, ...storedAfter } = after;

      transaction.set(transactionRef, storedAfter);
      transaction.set(auditRef, {
        transactionId: params.id,
        action: "CANCEL",
        before,
        after,
        reason,
        editedByUid: admin.uid,
        editedByName: admin.name,
        editedAt: cancelledAt,
      });
    });

    return Response.json({ ok: true });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return Response.json({ error: "Transaksi tidak ditemukan." }, { status: 404 });
    }
    if (error instanceof Error && error.message === "ALREADY_CANCELLED") {
      return Response.json({ error: "Transaksi sudah dibatalkan." }, { status: 409 });
    }
    console.error("Failed to cancel savings transaction", error);
    return Response.json({ error: "Gagal membatalkan transaksi." }, { status: 500 });
  }
}
