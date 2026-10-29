import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { coerceRupiah, gobizOrderId, gobizSignature, signaturesMatch } from "@/lib/gobiz";
import { jakartaDateString } from "@/lib/jakarta-date";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.GOBIZ_RELAY_SECRET;
  if (!secret) {
    console.error("GoBiz webhook: GOBIZ_RELAY_SECRET is not set.");
    return NextResponse.json({ success: false, message: "Webhook secret is not configured." }, { status: 500 });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("X-Go-Signature");
    if (!signaturesMatch(gobizSignature(secret, rawBody), signature)) {
      console.warn("GoBiz webhook: signature rejected.");
      return NextResponse.json({ success: false, message: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as unknown;
    const orderId = gobizOrderId(payload);
    const transaction = payload && typeof payload === "object" && "transaction" in payload
      ? (payload as { transaction?: { gross_amount?: unknown } }).transaction ?? payload
      : payload;
    const amount = coerceRupiah(
      transaction && typeof transaction === "object" && "gross_amount" in transaction
        ? (transaction as { gross_amount?: unknown }).gross_amount
        : undefined,
    );
    if (!orderId || amount === null) {
      return NextResponse.json({ success: false, message: "Payload pembayaran tidak valid." }, { status: 400 });
    }

    const ref = adminDb.collection("crown-kas-transactions").doc(orderId);
    const created = await adminDb.runTransaction(async (tx) => {
      const existing = await tx.get(ref);
      if (existing.exists) return false;
      tx.set(ref, {
        type: "IN_OTHER",
        amount,
        description: `QRIS GoPay - ${orderId}`,
        date: jakartaDateString(),
        source: "gobiz_webhook",
        raw_payload: payload,
        createdAt: FieldValue.serverTimestamp(),
      });
      return true;
    });

    return NextResponse.json({ success: true, duplicate: !created });
  } catch {
    console.error("GoBiz webhook: failed to record payment.");
    return NextResponse.json({ success: false, error: "Gagal mencatat pembayaran." }, { status: 500 });
  }
}
