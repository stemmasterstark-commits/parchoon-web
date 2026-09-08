'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function MerchantDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('id, total_amount, order_status, delivery_address, store_otp')
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Auto-populate store OTP if missing
      const updatedOrders = await Promise.all(
        data.map(async (orderItem) => {
          if (!orderItem.store_otp) {
            const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
            await supabase
              .from('orders')
              .update({ store_otp: generatedOtp })
              .eq('id', orderItem.id);
            return { ...orderItem, store_otp: generatedOtp };
          }
          return orderItem;
        })
      );
      setOrders(updatedOrders);
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ order_status: newStatus })
      .eq('id', orderId);

    if (error) {
      alert('Failed to update status: ' + error.message);
      return;
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, order_status: newStatus } : o))
    );
  };

  useEffect(() => {
    fetchOrders();

    // Setup realtime subscription for instant new order popups
    const channel = supabase
      .channel('merchant-orders')
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-black text-gray-900 mb-6">Merchant Partner Dashboard</h1>

        {loading ? (
          <div className="text-gray-400 font-medium">Loading store orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-gray-400 font-medium">No orders found.</div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white p-5 rounded-2xl border shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-bold text-gray-700">#{order.id.slice(0, 8)}</span>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                      order.order_status === 'PENDING'
                        ? 'bg-amber-100 text-amber-800'
                        : order.order_status === 'ACCEPTED'
                        ? 'bg-blue-100 text-blue-800'
                        : order.order_status === 'PACKED'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {order.order_status}
                  </span>
                </div>

                <p className="text-xs text-gray-500">{order.delivery_address}</p>

                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-bold text-sm text-gray-900">₹{order.total_amount}</span>

                  <div className="bg-purple-50 border border-purple-200 px-3 py-1 rounded-lg text-xs font-mono font-bold text-purple-700">
                    Store Pickup OTP: {order.store_otp || '----'}
                  </div>
                </div>

                {/* Status Action Buttons */}
                <div className="flex gap-2 pt-2 border-t">
                  {order.order_status === 'PENDING' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'ACCEPTED')}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-xl"
                    >
                      Accept Order
                    </button>
                  )}

                  {(order.order_status === 'PENDING' || order.order_status === 'ACCEPTED') && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'PACKED')}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-xl"
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
    </div>
  );
}