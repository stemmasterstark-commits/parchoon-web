'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function MerchantInventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // New Product Form State
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Groceries');
  const [imageUrl, setImageUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // 1. Fetch available stores
  const fetchStores = async () => {
    const { data, error } = await supabase.from('stores').select('*').order('name');
    if (!error && data && data.length > 0) {
      setStores(data);
      setSelectedStoreId(data[0].id);
    }
  };

  // 2. Fetch inventory for selected store
  const fetchProducts = async (storeId: string) => {
    if (!storeId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProducts(data);
    }
    setLoading(false);
  };

  // 3. Toggle Stock Status
  const toggleStockStatus = async (productId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('products')
      .update({ is_available: !currentStatus })
      .eq('id', productId);

    if (error) {
      alert('Failed to update stock: ' + error.message);
      return;
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, is_available: !currentStatus } : p))
    );
  };

  // 4. Add New Product
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price || !selectedStoreId) return;

    setIsAdding(true);
    const { data, error } = await supabase
      .from('products')
      .insert([
        {
          store_id: selectedStoreId,
          title,
          price: parseFloat(price),
          category,
          image_url: imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300',
          is_available: true,
        },
      ])
      .select()
      .single();

    setIsAdding(false);

    if (error) {
      alert('Error adding product: ' + error.message);
      return;
    }

    alert('Product added successfully!');
    setTitle('');
    setPrice('');
    setImageUrl('');
    if (data) setProducts((prev) => [data, ...prev]);
  };

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    if (selectedStoreId) {
      fetchProducts(selectedStoreId);
    }
  }, [selectedStoreId]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 pb-16">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl border shadow-sm">
          <div>
            <span className="text-3xl">📦</span>
            <h1 className="text-2xl font-black text-gray-900 mt-1">Inventory Manager</h1>
            <p className="text-xs text-gray-500">Toggle availability & add new products</p>
          </div>
          <Link
            href="/merchant"
            className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-xl hover:bg-indigo-100 transition"
          >
            ← Orders Dashboard
          </Link>
        </div>

        {/* Store Switcher */}
        {stores.length > 0 && (
          <div className="bg-white p-4 rounded-2xl border shadow-sm flex items-center justify-between">
            <label className="text-xs font-bold text-gray-700">Select Merchant Store:</label>
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="text-xs font-bold bg-gray-100 border rounded-xl px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.pincode})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Form: Add New Product */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-900 border-b pb-2">Add New Product Item</h2>
          <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Product Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Amul Milk 500ml"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Price (₹)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="e.g. 32.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Groceries">Groceries</option>
                <option value="Dairy & Bakery">Dairy & Bakery</option>
                <option value="Snacks & Beverages">Snacks & Beverages</option>
                <option value="Personal Care">Personal Care</option>
                <option value="Household">Household</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Image URL (Optional)</label>
              <input
                type="url"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="md:col-span-2 pt-2">
              <button
                type="submit"
                disabled={isAdding}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl shadow-sm transition"
              >
                {isAdding ? 'Adding Product...' : '+ Add Item to Catalog'}
              </button>
            </div>
          </form>
        </div>

        {/* Product Stock List */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-900 border-b pb-2">
            Store Items ({products.length})
          </h2>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading store inventory...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No products found for this store.</div>
          ) : (
            <div className="divide-y space-y-3">
              {products.map((product) => (
                <div key={product.id} className="pt-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="w-12 h-12 object-cover rounded-xl border bg-gray-50"
                    />
                    <div>
                      <h3 className="font-bold text-xs text-gray-900">{product.title}</h3>
                      <p className="text-xs text-gray-500">
                        ₹{product.price} • <span className="italic">{product.category}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleStockStatus(product.id, product.is_available)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
                      product.is_available
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                        : 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100'
                    }`}
                  >
                    {product.is_available ? 'In Stock ✓' : 'Out of Stock ✕'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}