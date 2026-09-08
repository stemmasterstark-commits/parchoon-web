'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCart } from '@/context/CartContext';
import Navbar from '@/components/Navbar';

interface Store {
  id: string;
  store_name: string;
  category: string;
  address: string;
}

interface Product {
  id: string;
  store_id: string;
  title: string;
  price: number;
  mrp: number;
  image_url: string;
  is_available: boolean;
}

export default function StoreCatalogPage() {
  const { pincode, locationName, addToCart } = useCart();
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pincode) return;

    async function fetchCatalog() {
      setLoading(true);

      // 1. Fetch active stores serving the current pincode
      const { data: storeData } = await supabase
        .from('stores')
        .select('*')
        .eq('pincode', pincode)
        .eq('is_active', true);

      if (storeData && storeData.length > 0) {
        setStores(storeData);
        const storeIds = storeData.map((s) => s.id);

        // 2. Fetch available products from these local stores
        const { data: productData } = await supabase
          .from('products')
          .select('*')
          .in('store_id', storeIds)
          .eq('is_available', true);

        if (productData) setProducts(productData);
      } else {
        setStores([]);
        setProducts([]);
      }
      setLoading(false);
    }

    fetchCatalog();
  }, [pincode]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">
              Stores in {locationName || pincode || 'your area'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Fresh daily essentials delivered locally in minutes
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500 font-medium">
            Loading local store inventory...
          </div>
        ) : stores.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl text-center border text-gray-500 shadow-sm">
            <p className="text-lg font-semibold text-gray-700">No partner stores currently online in {pincode}.</p>
            <p className="text-sm text-gray-400 mt-1">Check back shortly or try another pincode.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="h-44 bg-gray-50 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl">🛍️</span>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-800 text-base line-clamp-2">{product.title}</h3>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                  <div>
                    <span className="text-xl font-black text-gray-900">₹{product.price}</span>
                    {product.mrp > product.price && (
                      <span className="text-xs text-gray-400 line-through ml-2">₹{product.mrp}</span>
                    )}
                  </div>

                  <button
                    onClick={() =>
                      addToCart({
                        id: product.id,
                        store_id: product.store_id,
                        title: product.title,
                        price: product.price,
                        image_url: product.image_url,
                      })
                    }
                    className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all"
                  >
                    + ADD
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}