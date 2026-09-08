'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function RiderDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [inputOtp, setInputOtp] = useState<{ [key: string]: string }>({});

  const fetchRiderOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .in('order_status', ['PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
  };

  useEffect(() => {
    fetchRiderOrders();

    const channel = supabase
      .channel('rider_otp_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchRiderOrders())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleOtpChange = (orderId: string, value: string) => {
    setInputOtp((prev) => ({ ...prev, [orderId]: value }));
  };

  // 1. Validate Store Pickup OTP (Store -> Rider Handover)
  const verifyStoreOtp = async (order: any) => {
    const enteredOtp = inputOtp[order.id];

    if (enteredOtp !== order.store_otp) {
      alert('Invalid Store Pickup OTP! Please check with the merchant.');
      return;
    }

    const { error } = await supabase
      .from('orders')
      .update({ order_status: 'OUT_FOR_DELIVERY' })
      .eq('id', order.id);

    if (error) {
      alert('Failed to update status: ' + error.message);
    } else {
      alert('Store OTP Verified! Order picked up.');
      setInputOtp((prev) => ({ ...prev, [order.id]: '' }));
      fetchRiderOrders();
    }
  };

  // 2. Validate Customer Delivery Handover OTP (Rider -> Customer Handover)
  const verifyCustomerOtp = async (order: any) => {
    const enteredOtp = inputOtp[order.id];

    if (enteredOtp !== order.customer_otp) {
      alert('Invalid Customer Delivery OTP! Please ask customer for correct 4-digit code.');
      return;
    }

    const { error } = await supabase
      .from('orders')
      .update({ order_status: 'DELIVERED' })
      .eq('id', order.id);

    if (error) {
      alert('Failed to complete delivery: ' + error.message);
    } else {
      alert('Customer OTP Verified! Order successfully delivered.');
      setInputOtp((prev) => ({ ...prev, [order.id]: '' }));
      fetchRiderOrders();
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Rider Active Deliveries</h1>

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="p-5 bg-white border border-gray-200 rounded-2xl shadow-sm space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-gray-800 text-sm">Order #{order.id.slice(0, 8)}</p>
                <p className="text-xs text-gray-500 mt-0.5">{order.delivery_address}</p>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                  order.order_status === 'PACKED'
                    ? 'bg-purple-100 text-purple-800'
                    : order.order_status === 'OUT_FOR_DELIVERY'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {order.order_status}
              </span>
            </div>

            {/* Step 1 Verification: Store Pickup */}
            {order.order_status === 'PACKED' && (
              <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-purple-900">Enter Store Pickup OTP from Merchant:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="4-digit OTP"
                    value={inputOtp[order.id] || ''}
                    onChange={(e) => handleOtpChange(order.id, e.target.value)}
                    className="px-3 py-1.5 text-sm border rounded-lg w-32 font-mono text-center text-gray-900"
                  />
                  <button
                    onClick={() => verifyStoreOtp(order)}
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold"
                  >
                    Confirm Pickup
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 Verification: Customer Handover */}
            {order.order_status === 'OUT_FOR_DELIVERY' && (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-blue-900">Enter Handover OTP from Customer:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="4-digit OTP"
                    value={inputOtp[order.id] || ''}
                    onChange={(e) => handleOtpChange(order.id, e.target.value)}
                    className="px-3 py-1.5 text-sm border rounded-lg w-32 font-mono text-center text-gray-900"
                  />
                  <button
                    onClick={() => verifyCustomerOtp(order)}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                  >
                    Complete Delivery
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}