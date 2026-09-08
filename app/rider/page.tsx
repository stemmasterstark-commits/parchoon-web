'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function RiderDashboard() {
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);

  // 1. Fetched orders with status 'PACKED' available for delivery assignment
  const fetchRiderOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .in('order_status', ['PACKED', 'OUT_FOR_DELIVERY'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAvailableOrders(data);
    }
  };

  useEffect(() => {
    fetchRiderOrders();

    // 2. Realtime listener so packed orders appear instantly without reloading
    const channel = supabase
      .channel('realtime_rider_orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => fetchRiderOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markOutForDelivery = async (orderId: string) => {
    await supabase.from('orders').update({ order_status: 'OUT_FOR_DELIVERY' }).eq('id', orderId);
    fetchRiderOrders();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Rider Delivery Feed</h1>

      {availableOrders.length === 0 ? (
        <p className="text-gray-500">No packed orders ready for pickup right now.</p>
      ) : (
        <div className="space-y-4">
          {availableOrders.map((order) => (
            <div key={order.id} className="p-4 border rounded-xl bg-white shadow-sm flex justify-between items-center">
              <div>
                <p className="font-bold text-sm">Order #{order.id.slice(0, 8)}</p>
                <p className="text-xs text-gray-600">Deliver to: {order.delivery_address}</p>
                <p className="text-xs font-semibold text-purple-700 mt-1">Status: {order.order_status}</p>
              </div>

              {order.order_status === 'PACKED' && (
                <button
                  onClick={() => markOutForDelivery(order.id)}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                >
                  Pick Up Order
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}