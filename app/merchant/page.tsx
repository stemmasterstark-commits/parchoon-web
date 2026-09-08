'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Order {
  id: string;
  order_status: string;
  total_amount: number;
  delivery_address: string;
  store_otp: string;
  created_at: string;
}

export default function MerchantDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Merchant Dashboard</h1>
            <p className="text-sm text-gray-500">Manage store orders and provide pickup OTPs</p>
          </div>
          <button
            onClick={fetchOrders}
            className="px-4 py-2 bg-emerald-50 text-emerald-700 font-semibold text-xs rounded-xl border border-emerald-200 hover:bg-emerald-100 transition"
          >
            Refresh Orders
          </button>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-10">Loading active orders...</p>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <p className="text-gray-400 text-sm">No orders received yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {orders.map((order) => (
              <div key={order.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-mono text-gray-400">#{order.id.slice(0, 8)}</p>
                    <p className="text-lg font-extrabold text-gray-900">₹{order.total_amount}</p>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    {order.order_status}
                  </span>
                </div>

                <p className="text-xs text-gray-600 line-clamp-2">{order.delivery_address}</p>

                {/* Display Store Pickup OTP for the Merchant */}
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-900">Store Pickup OTP:</span>
                  <span className="text-lg font-mono font-black text-purple-700 tracking-wider">
                    {order.store_otp || 'N/A'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}