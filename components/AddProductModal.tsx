// components/AddProductModal.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AddProductModal({
  storeId,
  onClose,
  onProductAdded,
}: {
  storeId: string;
  onClose: () => void;
  onProductAdded: (prod: any) => void;
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [price, setPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('100');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const numericPrice = parseFloat(price);
    const numericStock = parseInt(stockQuantity);

    if (isNaN(numericPrice) || numericPrice <= 0) {
      alert('Please enter a valid price.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('products')
      .insert({
        store_id: storeId,
        title,
        category,
        price: numericPrice,
        stock_quantity: numericStock,
        image_url: imageUrl || null,
        is_available: true,
      })
      .select('*')
      .single();

    if (error) {
      alert(error.message || 'Failed to add product');
    } else if (data) {
      onProductAdded(data);
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Add New Product</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Product Name *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Amul Taaza Milk 500ml"
              className="w-full px-3 py-2 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Dairy & Bakery">Dairy & Bakery</option>
                <option value="Snacks & Munchies">Snacks & Munchies</option>
                <option value="Staples & Grains">Staples & Grains</option>
                <option value="Beverages">Beverages</option>
                <option value="Personal Care">Personal Care</option>
                <option value="General">General</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="28.00"
                className="w-full px-3 py-2 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Stock Quantity</label>
            <input
              type="number"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              placeholder="100"
              className="w-full px-3 py-2 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Image URL (Optional)</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-3 py-2 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl shadow hover:bg-emerald-700 transition disabled:opacity-50 mt-2"
          >
            {loading ? 'Adding Product...' : 'Add to Catalog'}
          </button>
        </form>
      </div>
    </div>
  );
}