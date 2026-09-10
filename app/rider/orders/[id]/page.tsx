'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import RiderOtpModal from '@/components/RiderOtpModal';

interface Order {
  id: string;
  delivery_address: string;
  customer_phone: string;
  total_amount: number;
  status: string;
}

export default function RiderActiveOrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. Fetch active order details
  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, delivery_address, customer_phone, total_amount, status')
        .eq('id', orderId)
        .single();

      if (!error && data) {
        setActiveOrder(data);
      }
      setLoading(false);
    };

    fetchOrder();
  }, [orderId]);

  if (loading) {
    return <div className="p-8 text-center text-sm text-gray-500">Loading active trip...</div>;
  }

  if (!activeOrder) {
    return <div className="p-8 text-center text-sm text-rose-500">Order not found or inactive.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-3xl border shadow-sm p-6 space-y-6">
        <div>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Active Delivery
          </span>
          <h1 className="text-xl font-bold text-gray-900 mt-2">
            Order #{activeOrder.id.slice(0, 8)}
          </h1>
        </div>

        {/* Customer Info Card */}
        <div className="bg-gray-50 rounded-2xl p-4 space-y-3 text-sm">
          <div>
            <span className="text-xs text-gray-400 font-medium block">Delivery Address</span>
            <p className="font-semibold text-gray-800">{activeOrder.delivery_address}</p>
          </div>
          <div>
            <span className="text-xs text-gray-400 font-medium block">Customer Contact</span>
            <a href={`tel:${activeOrder.customer_phone}`} className="font-semibold text-emerald-600 underline">
              {activeOrder.customer_phone}
            </a>
          </div>
          <div className="pt-2 border-t flex justify-between font-bold text-gray-900">
            <span>Collect Payment</span>
            <span>₹{activeOrder.total_amount}</span>
          </div>
        </div>

        {/* Trigger Button & Modal */}
        {activeOrder.status === 'DELIVERED' ? (
          <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl text-center text-xs font-bold">
            ✓ Order Already Completed
          </div>
        ) : (
          <>
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow transition"
            >
              Complete Order (Enter OTP)
            </button>

            <RiderOtpModal
              orderId={activeOrder.id}
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onSuccess={() => {
                setIsModalOpen(false);
                setActiveOrder((prev) => (prev ? { ...prev, status: 'DELIVERED' } : null));
                alert('Order Delivered Successfully!');
                router.push('/rider/dispatch');
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}