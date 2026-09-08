'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function RiderDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // OTP Inputs map (keyed by order ID)
  const [storeOtpInput, setStoreOtpInput] = useState<{ [key: string]: string }>({});
  const [customerOtpInput, setCustomerOtpInput] = useState<{ [key: string]: string }>({});

  // Fetch orders available for pickup or currently in delivery
  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .in('order_status', ['ACCEPTED', 'PACKED', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
    setLoading(false);
  };

  // Verify Store OTP & Update status to OUT_FOR_DELIVERY
  const handleVerifyStoreOtp = async (orderId: string, correctStoreOtp: string) => {
    const entered = storeOtpInput[orderId] || '';
    if (entered.trim() !== correctStoreOtp) {
      alert('❌ Incorrect Store Pickup OTP. Please ask the merchant for the correct code.');
      return;
    }

    const { error } = await supabase
      .from('orders')
      .update({ order_status: 'OUT_FOR_DELIVERY' })
      .eq('id', orderId);

    if (error) {
      alert('Error updating order: ' + error.message);
      return;
    }

    alert('✅ Store OTP Verified! Order picked up. Head to customer location.');
    fetchOrders();
  };

  // Verify Customer OTP & Complete Delivery
  const handleVerifyCustomerOtp = async (orderId: string, correctCustomerOtp: string) => {
    const entered = customerOtpInput[orderId] || '';
    if (entered.trim() !== correctCustomerOtp) {
      alert('❌ Incorrect Customer OTP. Please ask the customer for the code on their screen.');
      return;
    }

    const { error } = await supabase
      .from('orders')
      .update({ order_status: 'DELIVERED' })
      .eq('id', orderId);

    if (error) {
      alert('Error marking delivered: ' + error.message);
      return;
    }

    alert('🎉 Customer OTP Verified! Order successfully delivered.');
    fetchOrders();
  };

  useEffect(() => {
    fetchOrders();

    // Realtime subscription for delivery order updates
    const channel = supabase
      .channel('rider-orders')
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
    <div className="min-h-screen bg-gray-900 text-white p-6 pb-16">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Rider Header */}
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 flex justify-between items-center shadow-lg">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🛵</span>
              <h1 className="text-xl font-black text-white">Rider Delivery Partner</h1>
            </div>
            <p className="text-xs text-gray-400 mt-1">Live delivery management & OTP verification</p>
          </div>
          <Link
            href="/"
            className="text-xs font-bold text-gray-300 bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-xl transition"
          >
            Customer View ↗
          </Link>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="text-center py-10 text-gray-500 font-medium">Loading active orders...</div>
        ) : orders.length === 0 ? (
          <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 text-center text-gray-400">
            No active orders for pickup or delivery right now.
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-gray-800 border border-gray-700 p-5 rounded-2xl space-y-4 shadow-md"
              >
                {/* Header Row */}
                <div className="flex justify-between items-center">
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    #{order.id.slice(0, 8)}
                  </span>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-bold ${
                      order.order_status === 'DELIVERED'
                        ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700'
                        : order.order_status === 'OUT_FOR_DELIVERY'
                        ? 'bg-amber-900/80 text-amber-300 border border-amber-700'
                        : 'bg-blue-900/80 text-blue-300 border border-blue-700'
                    }`}
                  >
                    {order.order_status}
                  </span>
                </div>

                {/* Delivery Info */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-300">
                    <span className="text-gray-400">Address:</span>
                    <span className="font-semibold text-right max-w-[250px]">{order.delivery_address}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span className="text-gray-400">Payout:</span>
                    <span className="font-bold text-emerald-400">₹25.00 Delivery Fee</span>
                  </div>
                </div>

                {/* STEP A: Store Pickup OTP Verification */}
                {['ACCEPTED', 'PACKED', 'READY_FOR_PICKUP'].includes(order.order_status) && (
                  <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-700 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-amber-400">Step 1: Store Pickup</span>
                      <span className="text-gray-400">Ask Merchant for OTP</span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="4-digit Store OTP"
                        value={storeOtpInput[order.id] || ''}
                        onChange={(e) =>
                          setStoreOtpInput({ ...storeOtpInput, [order.id]: e.target.value })
                        }
                        className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-xs text-white text-center font-mono tracking-widest focus:outline-none focus:border-amber-400"
                      />
                      <button
                        onClick={() => handleVerifyStoreOtp(order.id, order.store_otp)}
                        className="bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold px-4 py-2 rounded-xl text-xs transition"
                      >
                        Verify Pickup
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP B: Customer Handover OTP Verification */}
                {order.order_status === 'OUT_FOR_DELIVERY' && (
                  <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-700 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-emerald-400">Step 2: Customer Delivery</span>
                      <span className="text-gray-400">Ask Customer for OTP</span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="4-digit Customer OTP"
                        value={customerOtpInput[order.id] || ''}
                        onChange={(e) =>
                          setCustomerOtpInput({ ...customerOtpInput, [order.id]: e.target.value })
                        }
                        className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-xs text-white text-center font-mono tracking-widest focus:outline-none focus:border-emerald-400"
                      />
                      <button
                        onClick={() => handleVerifyCustomerOtp(order.id, order.customer_otp)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-gray-950 font-bold px-4 py-2 rounded-xl text-xs transition"
                      >
                        Complete Order
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP C: Order Completed View */}
                {order.order_status === 'DELIVERED' && (
                  <div className="bg-emerald-950/40 border border-emerald-800/60 p-3 rounded-xl text-center">
                    <p className="text-xs font-bold text-emerald-400">✓ Order Delivered Successfully</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}