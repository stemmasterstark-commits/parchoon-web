'use client';

import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-black text-gray-900 mb-4">
          Order Essentials from Local Stores
        </h1>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Get groceries and daily needs delivered from local merchants in Kattangal.
        </p>
        <Link
          href="/store"
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl transition"
        >
          Browse All Stores & Products
        </Link>
      </main>
    </div>
  );
}