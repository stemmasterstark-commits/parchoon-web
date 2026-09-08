'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import PincodeModal from './PincodeModal';
import CartDrawer from './CartDrawer';

export default function Navbar() {
  const { pincode, locationName, cart } = useCart();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <nav className="sticky top-0 bg-white border-b border-gray-100 z-40 px-4 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-2xl font-black text-emerald-600 tracking-tight">Parchoon</span>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700"
            >
              <span className="text-emerald-600">📍</span>
              {pincode ? `${locationName} (${pincode})` : 'Select Location'}
              <span className="text-gray-400">▼</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl border border-emerald-200 transition cursor-pointer"
            >
              <span className="text-sm font-bold text-emerald-800">🛒 Cart ({totalItems})</span>
            </button>
          </div>
        </div>
      </nav>

      <PincodeModal isOpen={isModalOpen || !pincode} onClose={() => setIsModalOpen(false)} />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}