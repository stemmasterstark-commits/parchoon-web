'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface DeliveryOrder {
  id: string;
  store_id: string;
  items_total: number;
  total_amount: number;
  order_status: 'PENDING' | 'ACCEPTED' | 'PACKED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  delivery_address: string;
  created_at: string;
  customer_otp: string;
}

export default function RiderDashboard() {
  const [activeTab, setActiveTab] = useState<'available' | 'active' | 'completed'>('available');
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [otpInput, setOtpInput] = useState<{ [orderId: string]: string }>({});
  const [otpError, setOtpError] = useState<{ [orderId: string]: string }>({});
  const [loading, setLoading] = useState(true);

  // Load orders available for pickup
  useEffect(() => {
    async function loadRiderOrders() {
      setLoading(true);

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('order_status', ['PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED'])
        .order('created_at', { ascending: false });

      if (!error && data) {
        setOrders(data);
      }
      setLoading(false);
    }

    loadRiderOrders();
  }, []);

  // Handle Rider accepting job to pick up from store
  const acceptDelivery = async (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, order_status: 'OUT_FOR_DELIVERY' } : o))
    );

    await supabase.from('orders').update({ order_status: 'OUT_FOR_DELIVERY' }).eq('id', orderId);
  };

  // Verify Customer OTP #2 on handover
  const verifyHandoverOtp = async (order: DeliveryOrder) => {
    const enteredOtp = otpInput[order.id];

    if (enteredOtp !== order.customer_otp) {
      setOtpError((prev) => ({ ...prev, [order.id]: 'Invalid OTP. Please check with customer.' }));
      return;
    }

    // Clear error and mark delivered
    setOtpError((prev) => ({ ...prev, [order.id]: '' }));
    
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, order_status: 'DELIVERED' } : o))
    );

    await supabase.from('orders').update({ order_status: 'DELIVERED' }).eq('id', order.id);
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-12">
      {/* Rider Header */}
      <header className="bg-slate-900 text-white px-6 py-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black text-amber-400">Parchoon</span>
          <span className="text-xs bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full font-bold border border-amber-500/30">
            RIDER APP
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('available')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'available' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Ready Pickup ({orders.filter((o) => o.order_status === 'PACKED').length})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'active' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Active Delivery ({orders.filter((o) => o.order_status === 'OUT_FOR_DELIVERY').length})
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-20 text-gray-500 font-medium">Checking delivery tasks...</div>
        ) : activeTab === 'available' ? (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Orders Ready for Pickup</h2>
            {orders.filter((o) => o.order_status === 'PACKED').length === 0 ? (
              <div className="bg-white p-8 rounded-2xl text-center text-gray-500 border">
                No packed orders ready for delivery right now.
              </div>
            ) : (
              orders
                .filter((o) => o.order_status === 'PACKED')
                .map((order) => (
                  <div key={order.id} className="bg-white rounded-2xl p-5 border shadow-sm mb-4 space-y-3">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-xs font-mono text-gray-400">ORDER #{order.id.slice(0, 8)}</span>
                      <span className="text-sm font-bold text-emerald-700">Earnings: ₹30</span>
                    </div>

                    <div className="text-sm text-gray-700 space-y-1">
                      <p><strong>Dropoff Location:</strong> {order.delivery_address}</p>
                      <p><strong>Order Amount:</strong> ₹{order.total_amount}</p>
                    </div>

                    <button
                      onClick={() => acceptDelivery(order.id)}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 rounded-xl shadow-sm text-sm"
                    >
                      Accept & Start Pickup
                    </button>
                  </div>
                ))
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Active Deliveries</h2>
            {orders.filter((o) => o.order_status === 'OUT_FOR_DELIVERY').length === 0 ? (
              <div className="bg-white p-8 rounded-2xl text-center text-gray-500 border">
                No active deliveries in progress.
              </div>
            ) : (
              orders
                .filter((o) => o.order_status === 'OUT_FOR_DELIVERY')
                .map((order) => (
                  <div key={order.id} className="bg-white rounded-2xl p-5 border shadow-sm mb-4 space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-xs font-mono text-gray-400">ORDER #{order.id.slice(0, 8)}</span>
                      <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                        IN TRANSIT
                      </span>
                    </div>

                    <p className="text-sm text-gray-800">📍 <strong>Deliver to:</strong> {order.delivery_address}</p>

                    {/* Customer Handover OTP Input */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                      <label className="block text-xs font-bold text-gray-700">
                        Customer Handover OTP (Ask customer upon arrival):
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={4}
                          placeholder="4-digit OTP"
                          value={otpInput[order.id] || ''}
                          onChange={(e) =>
                            setOtpInput({ ...otpInput, [order.id]: e.target.value.replace(/\D/g, '') })
                          }
                          className="flex-1 px-3 py-2 border rounded-xl text-center font-mono text-lg tracking-widest text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <button
                          onClick={() => verifyHandoverOtp(order)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 text-xs rounded-xl"
                        >
                          Verify & Complete
                        </button>
                      </div>
                      {otpError[order.id] && (
                        <p className="text-xs font-semibold text-red-600">{otpError[order.id]}</p>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}