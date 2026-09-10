// app/api/notifications/push/route.ts
import { NextResponse } from 'next/server';
import webPush from 'web-push';
import { supabase } from '@/lib/supabaseClient';

webPush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId, orderId, status } = await req.json();

    // Fetch subscription for this user
    const { data: subData, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .single();

    if (error || !subData) {
      return NextResponse.json({ message: 'No subscription found' }, { status: 404 });
    }

    // Format notification messages based on order status
    const statusMessages: Record<string, { title: string; body: string }> = {
      ACCEPTED: {
        title: 'Order Accepted! 🍳',
        body: 'The store has accepted your order and is preparing it.',
      },
      DISPATCHED: {
        title: 'Out for Delivery! 🚴',
        body: 'Your rider is on the way with your order.',
      },
      DELIVERED: {
        title: 'Order Delivered! 🎉',
        body: 'Your order has been delivered. Enjoy!',
      },
      CANCELLED: {
        title: 'Order Cancelled ❌',
        body: 'Your order was cancelled. Please check the order page for details.',
      },
    };

    const notificationPayload = JSON.stringify({
      title: statusMessages[status]?.title || 'Order Status Update',
      body: statusMessages[status]?.body || `Your order status changed to ${status}`,
      url: `/orders/${orderId}`,
    });

    await webPush.sendNotification(
      subData.subscription,
      notificationPayload
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Push Send Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}