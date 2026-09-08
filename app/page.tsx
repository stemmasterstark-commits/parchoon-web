'use client';

import Navbar from '@/components/Navbar';
import { useCart } from '@/context/CartContext';

export default function Home() {
  const { pincode, locationName, isServiceable } = useCart();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-12">
        {isServiceable ? (
          <div className="text-center py-16">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
              Welcome to Parchoon {locationName}!
            </h1>
            <p className="text-lg text-gray-600 max-w-xl mx-auto">
              Delivering daily essentials from your nearest local stores straight to your doorstep in minutes.
            </p>
          </div>
        ) : (
          <div className="text-center py-16">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Hyperlocal Grocery Delivery
            </h1>
            <p className="text-gray-500">Enter your pincode above to explore stores near you.</p>
          </div>
        )}
      </main>
    </div>
  );
}