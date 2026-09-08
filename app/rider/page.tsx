'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function RiderPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [otpInputs, setOtpInputs] = useState<{ [key: string]: string }>({});

  const fetchRiderOrders = async () => {
    // Fetch orders that are ready for pickup (PACKED) or currently active (OUT_FOR_DELIVERY)
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .in('order_status', ['PACKED', 'OUT_FOR_DELIVERY'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
    setLoading(false);
  };

  const handleOtpChange = (orderId: string, val: string) => {
    setOtpInputs((prev) => ({ ...prev, [orderId]: val.replace(/\D/g, '') }));
  };

  const handleVerifyStorePickup = async (orderId: string, expectedOtp: string) => {
    const enteredOtp = otpInputs[orderId] || '';

    if (enteredOtp.trim() !== expectedOtp?.trim()) {
      alert('Invalid Store OTP! Please check with the merchant.');
      return;
    }

    const { error } = await supabase
      .from('orders')
      .update({ order_status: 'OUT_FOR_DELIVERY' })
      .eq('id', orderId);

    if (error) {
      alert('Failed to update status: ' + error.message);
      return;
    }

    alert('Pickup confirmed! Order is now OUT FOR DELIVERY.');
    fetchRiderOrders();
  };

  useEffect(() => {
    fetchRiderOrders();

    // Subscribe to realtime order updates
    const channel = supabase
      .channel('rider-orders')
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <span className="text-3xl">🛵</span>
          <h1 className="text-2xl font-black text-gray-900">Parchoon Rider Partner</h1>
          <p className="text-xs text-gray-500">Verify store pickup using merchant OTP</p>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-white rounded-2xl border p-6">
            No packed orders available for pickup right now.
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold text-gray-700">#{order.id.slice(0, 8)}</span>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                    order.order_status === 'PACKED'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {order.order_status}
                </span>
              </div>

              <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border">
                {order.delivery_address}
              </p>

              {order.order_status === 'PACKED' && (
                <div className="space-y-2 pt-2 border-t">
                  <label className="block text-xs font-semibold text-gray-700">
                    Enter Merchant Pickup OTP
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="4-digit OTP"
                      value={otpInputs[order.id] || ''}
                      onChange={(e) => handleOtpChange(order.id, e.target.value)}
                      className="flex-1 px-3 py-2 text-sm font-mono border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    />
                    <button
                      onClick={() => handleVerifyStorePickup(order.id, order.store_otp)}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 rounded-xl"
                    >
                      Confirm Pickup
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}