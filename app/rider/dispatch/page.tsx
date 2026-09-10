// app/rider/dispatch/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface OrderItem {
  id: string;
  product_title: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  created_at: string;
  status: 'PENDING' | 'ACCEPTED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  total_amount: number;
  delivery_address: string;
  delivery_otp: string;
  customer_phone?: string;
  stores?: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  order_items?: OrderItem[];
}

export default function RiderDispatchPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'active' | 'completed'>('available');
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [otpError, setOtpError] = useState<Record<string, string>>({});

  // 1. Fetch orders from Supabase
  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        stores (name, address, latitude, longitude),
        order_items (id, product_title, quantity, price)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
    setLoading(false);
  };

  // 2. Set up Supabase Realtime Subscription for instant order updates
  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('public:orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Accept Order for Pickup
  const handleAcceptOrder = async (orderId: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'ACCEPTED' })
      .eq('id', orderId);

    if (error) {
      alert('Failed to accept order: ' + error.message);
    } else {
      fetchOrders();
    }
  };

  // Mark as Out For Delivery
  const handleStartDelivery = async (orderId: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'OUT_FOR_DELIVERY' })
      .eq('id', orderId);

    if (error) {
      alert('Failed to update order status: ' + error.message);
    } else {
      fetchOrders();
    }
  };

  // Verify Delivery OTP and Complete Delivery
  const handleVerifyOtpAndDeliver = async (order: Order) => {
    const enteredOtp = otpInputs[order.id]?.trim();

    if (!enteredOtp) {
      setOtpError((prev) => ({ ...prev, [order.id]: 'Please enter the 4-digit OTP' }));
      return;
    }

    if (enteredOtp !== order.delivery_otp) {
      setOtpError((prev) => ({ ...prev, [order.id]: 'Invalid OTP. Please check with customer.' }));
      return;
    }

    // OTP Verified - Complete Order
    const { error } = await supabase
      .from('orders')
      .update({ status: 'DELIVERED' })
      .eq('id', order.id);

    if (error) {
      setOtpError((prev) => ({ ...prev, [order.id]: 'Error completing delivery: ' + error.message }));
    } else {
      setOtpError((prev) => ({ ...prev, [order.id]: '' }));
      setOtpInputs((prev) => ({ ...prev, [order.id]: '' }));
      fetchOrders();
    }
  };

  // Filter orders by active tab
  const availableOrders = orders.filter((o) => o.status === 'PENDING');
  const activeOrders = orders.filter((o) => o.status === 'ACCEPTED' || o.status === 'OUT_FOR_DELIVERY');
  const completedOrders = orders.filter((o) => o.status === 'DELIVERED');

  const displayedOrders =
    activeTab === 'available'
      ? availableOrders
      : activeTab === 'active'
      ? activeOrders
      : completedOrders;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Page Title */}
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rider Dispatch & Delivery</h1>
            <p className="text-xs text-gray-500 mt-1">Real-time order pickups and OTP customer handoff.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              Live Network
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 bg-gray-200/60 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('available')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
              activeTab === 'available'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Available ({availableOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
              activeTab === 'active'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            In Progress ({activeOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
              activeTab === 'completed'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Completed ({completedOrders.length})
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[1, 2].map((n) => (
              <div key={n} className="h-44 bg-gray-200/70 animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && displayedOrders.length === 0 && (
          <div className="bg-white p-12 text-center rounded-2xl border border-dashed text-gray-500">
            No orders found in this queue right now.
          </div>
        )}

        {/* Order List */}
        {!loading && displayedOrders.length > 0 && (
          <div className="space-y-4">
            {displayedOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col justify-between gap-4"
              >
                {/* Header Info */}
                <div className="flex justify-between items-start border-b pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 text-sm">
                        Order #{order.id.slice(0, 8)}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          order.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : order.status === 'ACCEPTED'
                            ? 'bg-blue-100 text-blue-800'
                            : order.status === 'OUT_FOR_DELIVERY'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(order.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-emerald-700">
                      ₹{order.total_amount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Location Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-gray-50 p-3 rounded-xl">
                  {/* Store Pickup Address */}
                  <div>
                    <span className="font-bold text-gray-500 uppercase text-[10px]">Pickup Location</span>
                    <p className="font-bold text-gray-800 mt-0.5">{order.stores?.name || 'Local Store'}</p>
                    <p className="text-gray-600 line-clamp-1">{order.stores?.address}</p>
                  </div>

                  {/* Customer Drop Address */}
                  <div>
                    <span className="font-bold text-gray-500 uppercase text-[10px]">Customer Drop</span>
                    <p className="font-bold text-gray-800 mt-0.5">{order.delivery_address}</p>
                    {order.customer_phone && (
                      <p className="text-gray-600">Ph: {order.customer_phone}</p>
                    )}
                  </div>
                </div>

                {/* Items Summary */}
                {order.order_items && order.order_items.length > 0 && (
                  <div className="text-xs text-gray-600">
                    <span className="font-bold text-gray-700">Items: </span>
                    {order.order_items
                      .map((item) => `${item.quantity}x ${item.product_title}`)
                      .join(', ')}
                  </div>
                )}

                {/* Action Controls per Status */}
                <div className="pt-2 border-t">
                  {/* PENDING: Rider accepts pickup */}
                  {order.status === 'PENDING' && (
                    <button
                      onClick={() => handleAcceptOrder(order.id)}
                      className="w-full py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow hover:bg-emerald-700 transition"
                    >
                      Accept Delivery
                    </button>
                  )}

                  {/* ACCEPTED: Rider picked up order, moving to customer */}
                  {order.status === 'ACCEPTED' && (
                    <button
                      onClick={() => handleStartDelivery(order.id)}
                      className="w-full py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl shadow hover:bg-blue-700 transition"
                    >
                      Mark Out For Delivery
                    </button>
                  )}

                  {/* OUT_FOR_DELIVERY: Require OTP Verification */}
                  {order.status === 'OUT_FOR_DELIVERY' && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={4}
                          placeholder="Enter 4-Digit OTP"
                          value={otpInputs[order.id] || ''}
                          onChange={(e) =>
                            setOtpInputs((prev) => ({ ...prev, [order.id]: e.target.value }))
                          }
                          className="flex-1 px-3 py-2 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-mono tracking-widest text-center"
                        />
                        <button
                          onClick={() => handleVerifyOtpAndDeliver(order)}
                          className="px-5 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow hover:bg-emerald-700 transition"
                        >
                          Verify & Deliver
                        </button>
                      </div>
                      {otpError[order.id] && (
                        <p className="text-xs font-semibold text-rose-600">{otpError[order.id]}</p>
                      )}
                    </div>
                  )}

                  {/* DELIVERED */}
                  {order.status === 'DELIVERED' && (
                    <div className="text-center py-1 bg-emerald-50 text-emerald-800 font-bold text-xs rounded-lg">
                      ✓ Successfully Handed Over
                    </div>
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