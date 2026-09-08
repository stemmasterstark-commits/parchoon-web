'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/lib/supabaseClient';

export default function CartDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { cart, addToCart, removeFromCart, clearCart, cartTotal, pincode } = useCart();
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<{ id: string; customerOtp: string } | null>(null);

  if (!isOpen) return null;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || !phone || !address) return;

    setLoading(true);

    // 1. Generated customer handover OTP
    const customerHandoverOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const storeId = cart[0].store_id;

    // 2. Inserted into orders without forcing an unmapped customer_id FK constraint
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          store_id: storeId,
          pincode: pincode || '673601',
          delivery_address: `${address} | Phone: ${phone}`,
          items_total: cartTotal,
          delivery_fee: 25.00,
          convenience_fee: 0.00,
          total_amount: cartTotal + 25.00,
          order_status: 'PENDING',
          payment_status: 'SUCCESS',
          customer_otp: customerHandoverOtp,
        },
      ])
      .select()
      .single();

    if (orderError || !orderData) {
      console.error('Order creation error:', orderError);
      alert('Error creating order: ' + (orderError?.message || 'Database rejection'));
      setLoading(false);
      return;
    }

    // 3. Inserted line items matching column naming in Supabase
    const orderItems = cart.map((item) => ({
      order_id: orderData.id,
      product_id: item.id,
      quantity: item.quantity,
      price_per_unit: item.price,
      total_price: item.price * item.quantity,
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

    if (itemsError) {
      console.error('Order items insertion error:', itemsError);
      alert('Error saving cart items: ' + itemsError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    clearCart();
    setOrderPlaced({ id: orderData.id, customerOtp: customerHandoverOtp });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-6 border-b flex justify-between items-center bg-gray-50">
            <h2 className="text-xl font-bold text-gray-900">Your Cart</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-xl">
              ✕
            </button>
          </div>

          {/* Cart Items List */}
          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            {orderPlaced ? (
              <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center space-y-4">
                <span className="text-4xl">🎉</span>
                <h3 className="text-xl font-bold text-emerald-900">Order Placed Successfully!</h3>
                <p className="text-xs text-emerald-700">Order ID: #{orderPlaced.id.slice(0, 8)}</p>

                <div className="bg-white p-4 rounded-xl border border-emerald-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Customer Delivery Handover OTP
                  </p>
                  <p className="text-3xl font-mono font-black text-emerald-700 mt-1">
                    {orderPlaced.customerOtp}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Share this 4-digit code with the rider upon delivery.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setOrderPlaced(null);
                    onClose();
                  }}
                  className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm"
                >
                  Done
                </button>
              </div>
            ) : cart.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <span className="text-4xl">🛒</span>
                <p className="mt-2 text-sm font-medium">Your cart is empty.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <span>🛍️</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-gray-800 line-clamp-1">{item.title}</h4>
                      <p className="text-xs text-gray-500">₹{item.price} each</p>
                    </div>
                  </div>

                  <div className="flex items-center border rounded-lg overflow-hidden">
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="px-2 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-bold"
                    >
                      -
                    </button>
                    <span className="px-3 text-xs font-bold text-gray-800">{item.quantity}</span>
                    <button
                      onClick={() => addToCart(item)}
                      className="px-2 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Checkout Footer */}
          {!orderPlaced && cart.length > 0 && (
            <div className="p-6 border-t bg-gray-50 space-y-4">
              <form onSubmit={handleCheckout} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Delivery Address ({pincode || '673601'})
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Hostel / Room No. / House Name"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile Phone</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
                  />
                </div>

                <div className="pt-2 border-t space-y-1 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Items Total</span>
                    <span>₹{cartTotal}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery Fee</span>
                    <span>₹25</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-gray-900 pt-1">
                    <span>Total Amount</span>
                    <span>₹{cartTotal + 25}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-sm text-sm transition"
                >
                  {loading ? 'Placing Order...' : `Place Order • ₹${cartTotal + 25}`}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}