'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import CartDrawer from '@/components/CartDrawer';
import { supabase } from '@/lib/supabaseClient';
import { useCart } from '@/context/CartContext';

function StoreContent() {
  const searchParams = useSearchParams();
  const storeId = searchParams.get('id');

  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const { addToCart } = useCart();

  useEffect(() => {
    async function fetchStoreAndProducts() {
      setLoading(true);

      // Fetch store details or default to first active store if no ID provided
      let currentStoreId = storeId;
      if (!currentStoreId) {
        const { data: defaultStore } = await supabase.from('stores').select('id').limit(1).single();
        if (defaultStore) currentStoreId = defaultStore.id;
      }

      if (currentStoreId) {
        const { data: storeData } = await supabase
          .from('stores')
          .select('*')
          .eq('id', currentStoreId)
          .single();
        setStore(storeData);

        const { data: productData } = await supabase
          .from('products')
          .select('*')
          .eq('store_id', currentStoreId);
        if (productData) setProducts(productData);
      }

      setLoading(false);
    }

    fetchStoreAndProducts();
  }, [storeId]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading store products...</div>
        ) : (
          <>
            <div className="bg-white p-6 rounded-2xl border shadow-sm mb-8 flex items-center gap-4">
              <div className="w-16 h-16 bg-emerald-100 text-3xl rounded-xl flex items-center justify-center">
                🏪
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900">
                  {store?.name || 'Grocery & Essentials'}
                </h1>
                <p className="text-xs text-gray-500">{store?.category || 'Supermarket'}</p>
              </div>
            </div>

            <h2 className="text-lg font-bold text-gray-900 mb-4">Available Items</h2>

            {products.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border">
                No items listed in this store yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((product) => (
                  <div key={product.id} className="bg-white border rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="h-32 bg-gray-50 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.title} className="h-full object-cover" />
                        ) : (
                          <span className="text-3xl">🛍️</span>
                        )}
                      </div>
                      <h3 className="font-bold text-sm text-gray-800 line-clamp-1">{product.title}</h3>
                      <p className="text-xs text-gray-400 mt-1">{product.unit || '1 unit'}</p>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="font-extrabold text-sm text-gray-900">₹{product.price}</span>
                      <button
                        onClick={() => addToCart(product)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}

export default function StorePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <StoreContent />
    </Suspense>
  );
}