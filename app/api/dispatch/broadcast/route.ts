// app/api/dispatch/broadcast/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Mark order status as BROADCASTED so available riders can see it in their queue
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'BROADCASTED',
        broadcasted_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Order broadcasted to nearby active riders.',
    });
  } catch (err: any) {
    console.error('Broadcast Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}