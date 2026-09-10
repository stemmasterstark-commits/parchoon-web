// components/CartDrawer.tsx
'use client';

import { useCart } from '@/context/CartContext';

// Define props interface matching what Navbar and StoreContent pass
interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { cart } = useCart();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-end">
      <div className="bg-white w-full max-w-md h-full p-6 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">Your Cart</h2>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 font-bold text-xl"
            >
              ✕
            </button>
          </div>

          {cart.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">Your cart is empty.</p>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-sm border-b pb-2">
                  <div>
                    <p className="font-semibold text-gray-800">{item.product_title}</p>
                    <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                  </div>
                  <span className="font-bold text-gray-900">₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-emerald-600 text-white font-bold text-sm rounded-xl"
        >
          Close
        </button>
      </div>
    </div>
  );
}