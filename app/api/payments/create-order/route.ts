// app/api/payments/create-order/route.ts
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: Request) {
  try {
    const { amount, currency = 'INR', orderId } = await req.json();

    const options = {
      amount: Math.round(amount * 100), // Amount in paise (1 INR = 100 paise)
      currency,
      receipt: `receipt_${orderId.slice(0, 8)}`,
      notes: {
        supabaseOrderId: orderId,
      },
    };

    const razorpayOrder = await razorpay.orders.create(options);

    return NextResponse.json({
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
    });
  } catch (err: any) {
    console.error('Razorpay Order Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}