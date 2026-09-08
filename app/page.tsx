'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useCart } from '@/context/CartContext';

export default function Home() {
  const { pincode, isServiceable } = useCart();
  const router = useRouter();

  useEffect(() => {
    if (isServiceable && pincode) {
      router.push('/store');
    }
  }, [isServiceable, pincode, router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center py-20">
          <span className="text-5xl font-black text-emerald-600 tracking-tight">Parchoon</span>
          <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-2">
            Hyperlocal Grocery Delivery
          </h1>
          <p className="text-gray-500 max-w-md mx-auto">
            Please enter your delivery pincode above to discover local store catalogs in your neighborhood.
          </p>
        </div>
      </main>
    </div>
  );
}