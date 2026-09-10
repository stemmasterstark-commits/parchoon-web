// app/api/orders/verify-otp/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const { orderId, otp } = await req.json();

    if (!orderId || !otp) {
      return NextResponse.json(
        { error: 'Order ID and 4-digit OTP are required.' },
        { status: 400 }
      );
    }

    // 1. Fetch current order details
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, delivery_otp, status')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    if (order.status === 'DELIVERED') {
      return NextResponse.json({ error: 'Order is already delivered.' }, { status: 400 });
    }

    // 2. Validate OTP
    if (order.delivery_otp !== otp.trim()) {
      return NextResponse.json({ error: 'Invalid OTP code. Please re-check with customer.' }, { status: 422 });
    }

    // 3. Update order status to DELIVERED
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'DELIVERED',
        delivered_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, message: 'Order marked as DELIVERED!' });
  } catch (err: any) {
    console.error('OTP Verification Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}