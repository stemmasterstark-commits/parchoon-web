'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

interface Store {
  id: string;
  name: string;
  category: string;
  rating: number;
  pincode: string;
  image_url: string;
  is_active: boolean;
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStores() {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('is_active', true);

      if (!error && data) {
        setStores(data);
      }
      setLoading(false);
    }
    fetchStores();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
          Partner Stores in Kattangal
        </h1>
        <p className="text-gray-500 mb-8 text-sm">
          Select a local shop to browse items and place an instant delivery order.
        </p>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading stores near you...</div>
        ) : stores.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No active stores found in this area.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map((store) => (
              <Link
                key={store.id}
                href={`/store?id=${store.id}`}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition flex items-center gap-4"
              >
                <div className="w-20 h-20 bg-emerald-50 rounded-xl flex items-center justify-center text-3xl shrink-0">
                  🏬
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{store.name}</h3>
                  <p className="text-xs text-gray-500 font-medium">{store.category}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                      ⭐ {store.rating || '4.8'}
                    </span>
                    <span className="text-gray-400">• Pincode {store.pincode}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}