'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Order {
  id: string;
  order_status: string;
  delivery_address: string;
  total_amount: number;
}

export default function RiderApp() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [inputOtps, setInputOtps] = useState<{ [key: string]: string }>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const fetchAssignedOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_status, delivery_address, total_amount')
      .in('order_status', ['PENDING', 'ACCEPTED', 'OUT_FOR_DELIVERY'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
  };

  useEffect(() => {
    fetchAssignedOrders();
  }, []);

  const handleVerifyStorePickup = async (orderId: string) => {
    const enteredOtp = inputOtps[orderId]?.trim();

    if (!enteredOtp || enteredOtp.length !== 4) {
      alert('Please enter a valid 4-digit Store OTP.');
      return;
    }

    setLoadingId(orderId);

    // Fetch the stored store_otp for verification
    const { data: order, error } = await supabase
      .from('orders')
      .select('store_otp')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      alert('Failed to verify OTP. Order not found.');
      setLoadingId(null);
      return;
    }

    // Direct string comparison
    if (String(order.store_otp).trim() !== enteredOtp) {
      alert('Invalid Store OTP! Please verify with the merchant.');
      setLoadingId(null);
      return;
    }

    // Update order status upon successful verification
    const { error: updateError } = await supabase
      .from('orders')
      .update({ order_status: 'OUT_FOR_DELIVERY' })
      .eq('id', orderId);

    setLoadingId(null);

    if (updateError) {
      alert('Failed to update status: ' + updateError.message);
    } else {
      alert('Pickup verified! Order status updated to OUT FOR DELIVERY.');
      fetchAssignedOrders();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-md mx-auto space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
          <span className="text-3xl">🛵</span>
          <h1 className="text-xl font-bold text-gray-900 mt-2">Parchoon Rider Partner</h1>
          <p className="text-xs text-gray-500">Verify store pickup using merchant OTP</p>
        </div>

        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-gray-400">#{order.id.slice(0, 8)}</span>
                <span className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                  {order.order_status}
                </span>
              </div>

              <p className="text-xs text-gray-700 font-medium">{order.delivery_address}</p>

              {order.order_status !== 'OUT_FOR_DELIVERY' && (
                <div className="space-y-2 pt-2 border-t">
                  <label className="block text-xs font-semibold text-gray-600">Enter Merchant Store OTP</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="4-digit OTP"
                      value={inputOtps[order.id] || ''}
                      onChange={(e) =>
                        setInputOtps({
                          ...inputOtps,
                          [order.id]: e.target.value.replace(/\D/g, ''),
                        })
                      }
                      className="flex-1 px-3 py-2 text-center text-lg font-mono border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
                    />
                    <button
                      onClick={() => handleVerifyStorePickup(order.id)}
                      disabled={loadingId === order.id}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 text-xs rounded-xl transition disabled:bg-gray-300"
                    >
                      {loadingId === order.id ? 'Verifying...' : 'Confirm Pickup'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}