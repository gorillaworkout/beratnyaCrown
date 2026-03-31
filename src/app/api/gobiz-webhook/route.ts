import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('X-Go-Signature');
    
    // Default to an empty string if relay secret isn't provided via env yet
    const SECRET_KEY = process.env.GOBIZ_RELAY_SECRET || "cb481840dc460a8092804e91ca1e384cc3bbfb166873dc89ceeb072b0accfe6f";
    
    if (!signature) {
      return NextResponse.json({ success: false, message: 'Missing signature' }, { status: 401 });
    }

    const hash = crypto.createHmac('sha256', SECRET_KEY).update(rawBody).digest('hex');
    
    if (hash !== signature) {
      console.warn("GoBiz Webhook: Signature mismatch", { expected: hash, received: signature });
      return NextResponse.json({ success: false, message: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    
    // Log for debugging
    console.log("GoBiz Webhook Payload Received:", JSON.stringify(payload, null, 2));

    // Depending on the event type from GoBiz, we save it to our database
    // "payment_status_updated" or similar is typical
    const transaction = payload.transaction || payload;
    
    // Save to Firestore
    await addDoc(collection(db, "crown-kas-transactions"), {
      type: "IN_OTHER", // default type for external QRIS
      amount: transaction.gross_amount || 0,
      description: `QRIS GoPay - ${transaction.order_id || 'Unknown Order'}`,
      date: new Date().toISOString().split('T')[0],
      source: "gobiz_webhook",
      raw_payload: payload,
      createdAt: serverTimestamp()
    });

    return NextResponse.json({ success: true, message: 'OK' });
  } catch (error) {
    console.error("GoBiz Webhook Error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
