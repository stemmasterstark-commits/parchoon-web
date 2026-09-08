'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function MerchantDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    // 1. Fetch orders along with their nested order_items and associated product details
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        total_amount,
        order_status,
        delivery_address,
        store_otp,
        created_at,
        order_items (
          id,
          quantity,
          price_per_unit,
          total_price,
          products (
            title
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // 2. Auto-populate store OTP if missing
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

    // Realtime subscription for incoming orders or status changes
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
    <div className="min-h-screen bg-gray-50 p-6 pb-16">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header & Quick Navigation */}
        <div className="flex flex-wrap justify-between items-center bg-white p-6 rounded-2xl border shadow-sm gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Merchant Partner Dashboard</h1>
            <p className="text-xs text-gray-500">Manage incoming orders & dispatch to riders</p>
          </div>
          
          <Link
            href="/merchant/inventory"
            className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-4 py-2.5 rounded-xl hover:bg-indigo-100 transition flex items-center gap-1.5"
          >
            <span>📦</span> Manage Inventory
          </Link>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="text-gray-400 font-medium py-8 text-center">Loading store orders...</div>
        ) : orders.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border text-center text-gray-400 font-medium">
            No active orders found.
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
                {/* Header row: Order ID & Status Badge */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-gray-900">#{order.id.slice(0, 8)}</span>
                    <span className="text-xs text-gray-400">
                      • {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-bold ${
                      order.order_status === 'PENDING'
                        ? 'bg-amber-100 text-amber-800'
                        : order.order_status === 'ACCEPTED'
                        ? 'bg-blue-100 text-blue-800'
                        : order.order_status === 'PACKED' || order.order_status === 'READY_FOR_PICKUP'
                        ? 'bg-purple-100 text-purple-800'
                        : order.order_status === 'DELIVERED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {order.order_status}
                  </span>
                </div>

                {/* Delivery Address */}
                <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border">
                  📍 <span className="font-semibold text-gray-800">Address:</span> {order.delivery_address}
                </p>

                {/* Order Items Breakdown */}
                {order.order_items && order.order_items.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ordered Items:</p>
                    <div className="bg-gray-50 p-3 rounded-xl border space-y-1">
                      {order.order_items.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-xs text-gray-800">
                          <span>
                            <span className="font-bold text-emerald-700">{item.quantity}x</span>{' '}
                            {item.products?.title || 'Item'}
                          </span>
                          <span className="font-semibold">₹{item.total_price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer: Amount & Pickup OTP */}
                <div className="flex justify-between items-center pt-2 border-t">
                  <div>
                    <p className="text-xs text-gray-400">Total Order Value</p>
                    <p className="font-bold text-base text-gray-900">₹{order.total_amount}</p>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-purple-700">
                    Store Pickup OTP: <span className="text-sm font-black text-purple-900">{order.store_otp || '----'}</span>
                  </div>
                </div>

                {/* Status Action Buttons */}
                <div className="flex gap-2 pt-2 border-t">
                  {order.order_status === 'PENDING' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'ACCEPTED')}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-sm"
                    >
                      Accept Order
                    </button>
                  )}

                  {(order.order_status === 'PENDING' || order.order_status === 'ACCEPTED') && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'PACKED')}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-sm"
                    >
                      Mark as Packed
                    </button>
                  )}

                  {order.order_status === 'PACKED' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'READY_FOR_PICKUP')}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-sm"
                    >
                      Ready for Delivery Pickup
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