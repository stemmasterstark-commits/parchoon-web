// app/api/orders/accept/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const { orderId, riderId } = await req.json();

    if (!orderId || !riderId) {
      return NextResponse.json({ error: 'Order ID and Rider ID are required' }, { status: 400 });
    }

    // Atomic update: Only accept if order status is still 'BROADCASTED' or 'PENDING'
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        rider_id: riderId,
        status: 'ACCEPTED',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .in('status', ['BROADCASTED', 'PENDING']) // Prevents double-booking
      .select('id')
      .single();

    if (updateError || !updatedOrder) {
      return NextResponse.json(
        { error: 'Order was already accepted by another rider.' },
        { status: 409 }
      );
    }

    // Mark the accepting rider as busy
    await supabase
      .from('riders')
      .update({ is_busy: true })
      .eq('id', riderId);

    return NextResponse.json({
      success: true,
      message: 'Order successfully assigned to you!',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}