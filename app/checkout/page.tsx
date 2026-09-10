'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';

interface CartItem {
  id: string;
  store_id: string;
  product_id: string;
  product_title: string;
  price: number;
  quantity: number;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CheckoutPage() {
  const router = useRouter();

  const [cartItems] = useState<CartItem[]>([
    {
      id: 'c1',
      store_id: '8f7e2a10-3b4c-4e5f-a6b7-8c9d0e1f2a3b',
      product_id: 'p101',
      product_title: 'Amul Taaza Toned Milk 500ml',
      price: 28,
      quantity: 2,
    },
    {
      id: 'c2',
      store_id: '8f7e2a10-3b4c-4e5f-a6b7-8c9d0e1f2a3b',
      product_id: 'p102',
      product_title: 'Britannia Whole Wheat Bread 400g',
      price: 45,
      quantity: 1,
    },
  ]);

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [placedOrderOtp, setPlacedOrderOtp] = useState<string | null>(null);

  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const deliveryFee = 15;
  const totalAmount = subtotal + deliveryFee;

  const handlePlaceOrderAndPay = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!scriptLoaded || typeof window.Razorpay === 'undefined') {
      alert('Payment gateway is still loading. Please try again in a few seconds.');
      return;
    }

    if (!deliveryAddress || !phone) {
      alert('Please fill in your address and contact phone number.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Delegate DB insertion and Razorpay Order creation to backend route
      const createRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalAmount,
          deliveryAddress,
          customerPhone: phone,
          cartItems,
          storeId: cartItems[0]?.store_id,
        }),
      });

      const orderPayload = await createRes.json();
      if (!createRes.ok) throw new Error(orderPayload.error || 'Failed to initiate checkout.');

      // Step 2: Initialize Razorpay SDK modal options
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderPayload.amount,
        currency: orderPayload.currency,
        name: 'Hyper-Local Express',
        description: `Order #${orderPayload.supabaseOrderId.slice(0, 8)}`,
        order_id: orderPayload.razorpayOrderId,
        handler: async function (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) {
          try {
            // Step 3: Handle post-checkout verification on backend
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                supabaseOrderId: orderPayload.supabaseOrderId,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              setPlacedOrderOtp(verifyData.deliveryOtp);
            } else {
              alert('Payment verification failed. Please contact support.');
            }
          } catch (err: any) {
            alert('Verification Error: ' + err.message);
          } finally {
            setIsSubmitting(false);
          }
        },
        prefill: { contact: phone },
        theme: { color: '#059669' },
        modal: {
          ondismiss: function () {
            setIsSubmitting(false);
          },
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err: any) {
      alert('Checkout error: ' + (err.message || 'Unknown error'));
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setScriptLoaded(true)}
      />

      <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-xl w-full bg-white rounded-2xl shadow-sm border p-6 md:p-8">
          {!placedOrderOtp ? (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Order Checkout</h1>
              <p className="text-xs text-gray-500 mb-6">Confirm delivery details and submit your order.</p>

              <div className="bg-gray-50 p-4 rounded-xl mb-6 space-y-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Items in Order</span>
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm py-1 border-b border-gray-200/60 last:border-0">
                    <span className="text-gray-800">
                      {item.quantity}x {item.product_title}
                    </span>
                    <span className="font-semibold text-gray-900">₹{item.price * item.quantity}</span>
                  </div>
                ))}
                <div className="pt-2 flex justify-between text-xs text-gray-500">
                  <span>Delivery Fee</span>
                  <span>₹{deliveryFee}</span>
                </div>
                <div className="pt-2 border-t flex justify-between font-extrabold text-base text-gray-900">
                  <span>Total Payable</span>
                  <span className="text-emerald-700">₹{totalAmount}</span>
                </div>
              </div>

              <form onSubmit={handlePlaceOrderAndPay} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Delivery Address *</label>
                  <textarea
                    required
                    rows={2}
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="House/Flat No., Building, Street Name..."
                    className="w-full px-3 py-2 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !scriptLoaded}
                  className="w-full py-3 bg-emerald-600 text-white font-bold text-sm rounded-xl shadow hover:bg-emerald-700 transition disabled:opacity-50 mt-2"
                >
                  {isSubmitting ? 'Processing Payment...' : `Pay & Place Order (₹${totalAmount})`}
                </button>
              </form>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
                ✓
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Payment Successful!</h2>
              <p className="text-xs text-gray-500 mt-1 mb-6">
                Your order is confirmed and broadcasted to local riders.
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6">
                <span className="text-xs font-extrabold text-amber-800 uppercase tracking-widest block mb-2">
                  Your Delivery OTP
                </span>
                <div className="text-4xl font-black text-amber-900 tracking-widest font-mono">
                  {placedOrderOtp}
                </div>
                <p className="text-xs text-amber-700 mt-3">
                  Share this 4-digit code with the rider when they arrive to confirm delivery.
                </p>
              </div>

              <button
                onClick={() => router.push('/rider/dispatch')}
                className="px-6 py-2.5 bg-gray-900 text-white text-xs font-bold rounded-xl shadow hover:bg-gray-800 transition"
              >
                View Dispatch Queue Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}