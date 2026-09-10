// app/orders/[id]/page.tsx
'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
// At the top of app/orders/[id]/page.tsx
import dynamic from 'next/dynamic';

// Dynamically import map component with SSR disabled
const LiveOrderMap = dynamic(() => import('@/components/LiveOrderMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-72 bg-gray-200 animate-pulse rounded-3xl flex items-center justify-center text-xs font-bold text-gray-400">
      Loading Live Tracking Map...
    </div>
  ),
});
interface OrderItem {
  id: string;
  product_title: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  store_id: string;
  delivery_address: string;
  customer_phone: string;
  total_amount: number;
  delivery_otp: string;
  status: 'PENDING' | 'ACCEPTED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  rider_lat?: number;
  rider_lng?: number;
  created_at: string;
  order_items?: OrderItem[];
  stores?: {
    name: string;
    address: string;
  };
}

const STATUS_STAGES = [
  { key: 'PENDING', label: 'Placed', desc: 'Waiting for store confirmation' },
  { key: 'ACCEPTED', label: 'Accepted', desc: 'Store is packing your items' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'Rider is on the way' },
  { key: 'DELIVERED', label: 'Delivered', desc: 'Order completed' },
];

export default function OrderTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch initial Order and setup Supabase Realtime Subscription
  useEffect(() => {
    async function fetchOrderDetails() {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          stores (name, address),
          order_items (*)
        `)
        .eq('id', orderId)
        .single();

      if (data && !error) {
        setOrder(data as Order);
      }
      setLoading(false);
    }

    if (orderId) {
      fetchOrderDetails();

      // Realtime subscription to live updates on the 'orders' table
      const channel = supabase
        .channel(`order_tracking_${orderId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${orderId}`,
          },
          (payload) => {
            setOrder((prev) => (prev ? { ...prev, ...payload.new } : null));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl shadow border text-center max-w-sm">
          <h2 className="text-lg font-bold text-gray-900">Order Not Found</h2>
          <p className="text-xs text-gray-500 mt-1">Please check your order ID or contact support.</p>
        </div>
      </div>
    );
  }

  // Calculate current stage step index
  const currentStageIndex = STATUS_STAGES.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === 'CANCELLED';

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Top Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-black text-gray-900">Order #{order.id.slice(0, 8)}</h1>
            <p className="text-xs text-gray-500">{order.stores?.name || 'Hyper-local Store'}</p>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full ${
              isCancelled
                ? 'bg-red-100 text-red-700'
                : order.status === 'DELIVERED'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800 animate-pulse'
            }`}
          >
            {order.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        {/* 1. DELIVERY OTP CARD */}
        {order.status !== 'DELIVERED' && !isCancelled && (
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-lg text-center relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">
              Share with Rider at Doorstep
            </p>
            <h2 className="text-xs text-emerald-200 mt-1">Delivery Verification OTP</h2>
            <div className="mt-3 inline-block bg-white text-emerald-900 text-3xl font-black tracking-widest px-6 py-2.5 rounded-2xl shadow-inner font-mono">
              {order.delivery_otp}
            </div>
            <p className="text-[11px] text-emerald-100/80 mt-3">
              Do not share this PIN until you have inspected and received your package.
            </p>
          </div>
        )}

        {/* 2. REAL-TIME PROGRESS TRACKER */}
        <div className="bg-white rounded-3xl p-6 border shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-6">Delivery Progress</h3>

          {isCancelled ? (
            <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-xs font-semibold text-center border border-red-200">
              This order was cancelled.
            </div>
          ) : (
            <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
              {STATUS_STAGES.map((stage, idx) => {
                const isCompleted = currentStageIndex > idx;
                const isCurrent = currentStageIndex === idx;

                return (
                  <div key={stage.key} className="relative flex items-start gap-4">
                    {/* Stepper Dot */}
                    <div
                      className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isCompleted
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-white border-emerald-600 ring-4 ring-emerald-100'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      {isCompleted && (
                        <span className="text-[10px] font-black leading-none">✓</span>
                      )}
                      {isCurrent && (
                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                      )}
                    </div>

                    {/* Step Labels */}
                    <div>
                      <p
                        className={`text-xs font-bold ${
                          isCurrent
                            ? 'text-emerald-700 font-extrabold'
                            : isCompleted
                            ? 'text-gray-900'
                            : 'text-gray-400'
                        }`}
                      >
                        {stage.label}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{stage.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. ORDER SUMMARY & ADDRESS */}
        <div className="bg-white rounded-3xl p-6 border shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-900 border-b pb-3">Delivery Summary</h3>

          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Destination Address
            </p>
            <p className="text-xs text-gray-800 font-medium mt-0.5">{order.delivery_address}</p>
            <p className="text-xs text-gray-500 mt-0.5">Phone: {order.customer_phone}</p>
          </div>

          {/* Items List */}
          {order.order_items && order.order_items.length > 0 && (
            <div className="border-t pt-3">
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2">
                Items Ordered
              </p>
              <div className="space-y-2">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-xs">
                    <span className="text-gray-700">
                      {item.quantity}x <span className="font-semibold">{item.product_title}</span>
                    </span>
                    <span className="font-bold text-gray-900">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t pt-3 flex justify-between items-center font-extrabold text-sm text-gray-900">
            <span>Total Paid</span>
            <span className="text-emerald-700">₹{order.total_amount.toFixed(2)}</span>
          </div>
        </div>
      </main>
    </div>
  );
}