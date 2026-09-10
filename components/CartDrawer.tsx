// components/CartDrawer.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function CartDrawer({ cartItems, clearCart }: { cartItems: any[]; clearCart: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Group items by store_id
  const itemsByStore = cartItems.reduce((acc: any, item: any) => {
    acc[item.store_id] = acc[item.store_id] || [];
    acc[item.store_id].push(item);
    return acc;
  }, {});

  const handleCheckout = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (!userId) {
      alert('Please log in to complete your order.');
      setLoading(false);
      return;
    }

    const totalGroupAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // 1. Create Parent Order Group
    const { data: orderGroup, error: groupErr } = await supabase
      .from('order_groups')
      .insert({
        user_id: userId,
        total_amount: totalGroupAmount,
        payment_status: 'PAID'
      })
      .select('id')
      .single();

    if (groupErr) {
      alert('Checkout failed. Please try again.');
      setLoading(false);
      return;
    }

    // 2. Create sub-orders per store
    const storeKeys = Object.keys(itemsByStore);
    let firstOrderId = '';

    for (const storeId of storeKeys) {
      const storeItems = itemsByStore[storeId];
      const itemsTotal = storeItems.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
      const storeOtp = Math.floor(1000 + Math.random() * 9000).toString();
      const customerOtp = Math.floor(1000 + Math.random() * 9000).toString();

      const { data: subOrder, error: orderErr } = await supabase
        .from('orders')
        .insert({
          order_group_id: orderGroup.id,
          store_id: storeId,
          user_id: userId,
          delivery_address: 'Kattangal, NIT Calicut Campus Area',
          delivery_lat: 11.3216,
          delivery_lng: 75.9341,
          items_total: itemsTotal,
          delivery_fee: 20.00,
          total_amount: itemsTotal + 20.00,
          order_status: 'PENDING',
          store_otp: storeOtp,
          customer_otp: customerOtp
        })
        .select('id')
        .single();

      if (!orderErr && subOrder && !firstOrderId) {
        firstOrderId = subOrder.id;
      }
    }

    clearCart();
    setLoading(false);
    
    // Redirect directly to the live tracking page for the newly created order
    router.push(`/orders/${firstOrderId}`);
  };

  return (
    <div className="p-4 bg-white rounded-t-2xl shadow-xl border-t">
      <h3 className="font-bold text-lg mb-2">Your Parchun Basket</h3>
      <p className="text-xs text-gray-500 mb-4">{Object.keys(itemsByStore).length} Store(s) in this order</p>
      
      <button
        onClick={handleCheckout}
        disabled={loading || cartItems.length === 0}
        className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-700 transition disabled:opacity-50"
      >
        {loading ? 'Processing Orders...' : 'Place Hyper-Local Order'}
      </button>
    </div>
  );
}