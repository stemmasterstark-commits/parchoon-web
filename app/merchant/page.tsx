'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function MerchantDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetched order history directly from Supabase on mount/refresh
  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();

    // 2. Subscribed to Realtime DB updates for new incoming orders
    const channel = supabase
      .channel('realtime_merchant_orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 3. Updated order status directly in Supabase DB
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ order_status: newStatus })
      .eq('id', orderId);

    if (error) {
      alert('Failed to update status: ' + error.message);
    } else {
      fetchOrders(); // Reloaded fresh state
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Merchant Order Management</h1>

      {loading ? (
        <p>Loading active orders...</p>
      ) : orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="p-4 border rounded-xl bg-white shadow-sm flex justify-between items-center">
              <div>
                <p className="font-bold text-sm">Order #{order.id.slice(0, 8)}</p>
                <p className="text-xs text-gray-500">Address: {order.delivery_address}</p>
                <p className="text-xs text-gray-500">Total: ₹{order.total_amount}</p>
                <span className={`inline-block mt-2 px-2 py-0.5 text-xs font-semibold rounded ${
                  order.order_status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                  order.order_status === 'ACCEPTED' ? 'bg-blue-100 text-blue-800' :
                  order.order_status === 'PACKED' ? 'bg-purple-100 text-purple-800' :
                  'bg-emerald-100 text-emerald-800'
                }`}>
                  Status: {order.order_status}
                </span>
              </div>

              <div className="flex gap-2">
                {order.order_status === 'PENDING' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'ACCEPTED')}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold"
                  >
                    Accept Order
                  </button>
                )}
                {order.order_status === 'ACCEPTED' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'PACKED')}
                    className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold"
                  >
                    Mark as Packed
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}