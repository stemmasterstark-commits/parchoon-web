'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabaseClient';

export default function OrderTrackingPage() {
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrderDetails = async () => {
    if (!orderId) return;

    // Fetch order record
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*, stores(name)')
      .eq('id', orderId)
      .single();

    if (!orderError && orderData) {
      setOrder(orderData);
    }

    // Fetch line items
    const { data: itemsData } = await supabase
      .from('order_items')
      .select('*, products(title)')
      .eq('order_id', orderId);

    if (itemsData) {
      setOrderItems(itemsData);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchOrderDetails();

    // Subscribe to realtime order status updates
    const channel = supabase
      .channel(`order-track-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          setOrder((prev: any) => ({ ...prev, ...payload.new }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-xl mx-auto py-16 text-center text-gray-400">
          Loading order details...
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-xl mx-auto py-16 text-center text-gray-500 font-medium">
          Order not found. Please verify your order ID.
        </div>
      </div>
    );
  }

  const steps = ['PENDING', 'ACCEPTED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
  const currentStepIndex = steps.indexOf(order.order_status);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <Navbar />

      <main className="max-w-xl mx-auto px-4 py-8 space-y-6">
        {/* Header Summary */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono font-bold text-gray-400">
              ORDER #{order.id.slice(0, 8)}
            </span>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
              {order.order_status.replace(/_/g, ' ')}
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-gray-900">
            {order.stores?.name || 'Local Store'}
          </h1>
          <p className="text-xs text-gray-500">{order.delivery_address}</p>
        </div>

        {/* Customer OTP Card */}
        {order.order_status !== 'DELIVERED' && order.customer_otp && (
          <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl text-center space-y-1">
            <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Delivery Handover OTP
            </p>
            <p className="text-3xl font-mono font-black text-emerald-700">
              {order.customer_otp}
            </p>
            <p className="text-xs text-emerald-600">
              Share this code with your rider when they arrive.
            </p>
          </div>
        )}

        {/* Live Status Lifecycle Tracker */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-900">Live Delivery Progress</h2>
          <div className="space-y-3">
            {steps.map((step, idx) => {
              const isCompleted = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex;

              return (
                <div key={step} className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isCompleted ? '✓' : idx + 1}
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      isCurrent
                        ? 'text-emerald-700 font-black'
                        : isCompleted
                        ? 'text-gray-900'
                        : 'text-gray-400'
                    }`}
                  >
                    {step.replace(/_/g, ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Items Summary */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-gray-900 border-b pb-2">Order Items</h2>
          {orderItems.map((item) => (
            <div key={item.id} className="flex justify-between text-xs py-1">
              <span className="text-gray-700">
                {item.products?.title || 'Product'} × {item.quantity}
              </span>
              <span className="font-bold text-gray-900">₹{item.total_price}</span>
            </div>
          ))}
          <div className="pt-2 border-t flex justify-between text-sm font-bold text-gray-900">
            <span>Total Paid</span>
            <span>₹{order.total_amount}</span>
          </div>
        </div>
      </main>
    </div>
  );
}