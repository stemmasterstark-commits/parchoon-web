// app/merchant/inventory/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import AddProductModal from '@/components/AddProductModal';

interface Product {
  id: string;
  store_id: string;
  title: string;
  category: string;
  price: number;
  stock_quantity: number;
  is_available: boolean;
  image_url: string | null;
}

interface Store {
  id: string;
  name: string;
  city: string;
}

function InventoryContent() {
  const searchParams = useSearchParams();
  const queryStoreId = searchParams.get('storeId');

  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>(queryStoreId || '');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. Fetch stores owned by manager or all available stores
  useEffect(() => {
    async function fetchStores() {
      const { data } = await supabase.from('stores').select('id, name, city').eq('is_active', true);
      if (data && data.length > 0) {
        setStores(data);
        if (!selectedStoreId) {
          setSelectedStoreId(data[0].id);
        }
      }
    }
    fetchStores();
  }, []);

  // 2. Fetch products whenever selectedStoreId changes
  useEffect(() => {
    if (!selectedStoreId) return;

    async function fetchProducts() {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', selectedStoreId)
        .order('created_at', { ascending: false });

      if (!error) {
        setProducts(data || []);
      }
      setLoading(false);
    }

    fetchProducts();
  }, [selectedStoreId]);

  // 3. Quick update for Stock or Availability
  const handleUpdateProduct = async (id: string, updates: Partial<Product>) => {
    setUpdatingId(id);
    const { error } = await supabase.from('products').update(updates).eq('id', id);

    if (!error) {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );
    } else {
      alert('Failed to update product stock.');
    }
    setUpdatingId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header & Store Selector */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-xs text-gray-500 mt-1">Manage catalog, real-time stock levels, and item pricing.</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="px-4 py-2 border rounded-xl text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-emerald-500 outline-none w-full md:w-auto"
            >
              {stores.length === 0 && <option value="">No Stores Found</option>}
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.city})
                </option>
              ))}
            </select>

            <button
              onClick={() => setIsModalOpen(true)}
              disabled={!selectedStoreId}
              className="px-4 py-2 bg-emerald-600 text-white font-bold text-sm rounded-xl shadow hover:bg-emerald-700 transition whitespace-nowrap disabled:opacity-50"
            >
              + Add Product
            </button>
          </div>
        </div>

        {/* Product Inventory Table */}
        {loading ? (
          <div className="p-12 text-center text-gray-500 font-medium">Loading inventory...</div>
        ) : products.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-dashed text-gray-500">
            No products found for this store yet. Click <strong>+ Add Product</strong> to add your first item.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs uppercase border-b">
                    <th className="py-3 px-4">Item</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Price (₹)</th>
                    <th className="py-3 px-4">Stock Qty</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/80 transition">
                      <td className="py-3 px-4 font-semibold text-gray-900">{p.title}</td>
                      <td className="py-3 px-4 text-xs text-gray-500">{p.category}</td>
                      <td className="py-3 px-4 font-medium">
                        ₹
                        <input
                          type="number"
                          defaultValue={p.price}
                          onBlur={(e) =>
                            handleUpdateProduct(p.id, { price: parseFloat(e.target.value) || p.price })
                          }
                          className="w-20 px-2 py-1 border rounded-lg text-sm text-gray-800 ml-1 outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          defaultValue={p.stock_quantity}
                          onBlur={(e) =>
                            handleUpdateProduct(p.id, { stock_quantity: parseInt(e.target.value) || 0 })
                          }
                          className="w-20 px-2 py-1 border rounded-lg text-sm text-gray-800 outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleUpdateProduct(p.id, { is_available: !p.is_available })}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                            p.is_available
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {p.is_available ? 'Available' : 'Out of Stock'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={async () => {
                            if (confirm('Delete this product?')) {
                              await supabase.from('products').delete().eq('id', p.id);
                              setProducts((prev) => prev.filter((item) => item.id !== p.id));
                            }
                          }}
                          className="text-xs font-semibold text-rose-600 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {isModalOpen && (
        <AddProductModal
          storeId={selectedStoreId}
          onClose={() => setIsModalOpen(false)}
          onProductAdded={(newProduct) => setProducts((prev) => [newProduct, ...prev])}
        />
      )}
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading Inventory Panel...</div>}>
      <InventoryContent />
    </Suspense>
  );
}