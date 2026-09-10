// app/store/[id]/page.tsx
'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

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
  address: string;
  city: string;
}

interface CartItem extends Product {
  quantity: number;
}

export default function StorefrontPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const storeId = resolvedParams.id;
  const router = useRouter();

  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  // Fetch Store and Products data from Supabase
  useEffect(() => {
    async function fetchStoreAndProducts() {
      setLoading(true);

      // Fetch Store Info
      const { data: storeData } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();

      if (storeData) setStore(storeData);

      // Fetch Store Products
      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_available', true)
        .gt('stock_quantity', 0)
        .order('category', { ascending: true });

      if (productData) setProducts(productData);

      setLoading(false);
    }

    if (storeId) fetchStoreAndProducts();
  }, [storeId]);

  // Cart Handlers
  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // Group products by category
  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];
  const filteredProducts =
    selectedCategory === 'All'
      ? products
      : products.filter((p) => p.category === selectedCategory);

  const handleCheckoutRedirect = () => {
    // Store cart state in session/localStorage for Checkout page
    if (typeof window !== 'undefined') {
      localStorage.setItem('cartItems', JSON.stringify(cart));
    }
    router.push('/checkout');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header Banner */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black text-gray-900">
              {store ? store.name : 'Loading Store...'}
            </h1>
            <p className="text-xs text-gray-500">{store?.address || 'Hyper-local Delivery'}</p>
          </div>

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow hover:bg-emerald-700 transition flex items-center gap-2"
          >
            <span>Cart</span>
            {totalCartItems > 0 && (
              <span className="bg-white text-emerald-800 font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                {totalCartItems}
              </span>
            )}
          </button>
        </div>

        {/* Category Pills */}
        {!loading && categories.length > 1 && (
          <div className="max-w-6xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Product Catalog */}
      <main className="max-w-6xl mx-auto px-4 pt-6">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-64 bg-gray-200 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed text-gray-500">
            No products available in this category.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredProducts.map((p) => {
              const cartItem = cart.find((item) => item.id === p.id);
              return (
                <div
                  key={p.id}
                  className="bg-white border rounded-2xl p-4 flex flex-col justify-between hover:shadow-md transition"
                >
                  <div>
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.title}
                        className="w-full h-28 object-cover rounded-xl mb-3"
                      />
                    ) : (
                      <div className="w-full h-28 bg-gray-100 rounded-xl mb-3 flex items-center justify-center text-gray-400 text-xs font-bold">
                        {p.category}
                      </div>
                    )}
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      {p.category}
                    </span>
                    <h3 className="text-sm font-bold text-gray-900 line-clamp-2 mt-0.5">{p.title}</h3>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t pt-3">
                    <span className="font-extrabold text-sm text-gray-900">₹{p.price}</span>

                    {cartItem ? (
                      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-2 py-1">
                        <button
                          onClick={() => updateQuantity(p.id, -1)}
                          className="text-emerald-700 font-black text-xs px-1"
                        >
                          -
                        </button>
                        <span className="text-emerald-900 font-bold text-xs">
                          {cartItem.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(p.id, 1)}
                          className="text-emerald-700 font-black text-xs px-1"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(p)}
                        className="bg-emerald-50 border border-emerald-600 text-emerald-700 font-bold text-xs px-3 py-1.5 rounded-xl hover:bg-emerald-600 hover:text-white transition"
                      >
                        + Add
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto z-30">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-emerald-600 text-white p-4 rounded-2xl shadow-xl flex justify-between items-center font-bold text-sm hover:bg-emerald-700 transition"
          >
            <div className="flex items-center gap-2">
              <span className="bg-emerald-800 text-white text-xs px-2.5 py-1 rounded-lg">
                {totalCartItems} {totalCartItems === 1 ? 'item' : 'items'}
              </span>
              <span>₹{cartSubtotal}</span>
            </div>
            <span>View Cart →</span>
          </button>
        </div>
      )}

      {/* Cart Drawer Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col justify-between p-6 shadow-2xl">
            <div>
              <div className="flex justify-between items-center border-b pb-4 mb-4">
                <h2 className="text-lg font-bold text-gray-900">Your Basket</h2>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="text-gray-400 hover:text-gray-600 font-bold text-xl"
                >
                  ✕
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12 text-gray-400 font-medium text-sm">
                  Your cart is empty.
                </div>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center border-b pb-3"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-gray-800">{item.title}</h4>
                        <p className="text-xs font-extrabold text-emerald-700 mt-0.5">
                          ₹{item.price * item.quantity}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-2.5 py-1">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="text-gray-600 font-bold text-xs"
                        >
                          -
                        </button>
                        <span className="font-bold text-xs text-gray-800">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="text-gray-600 font-bold text-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between font-extrabold text-base text-gray-900">
                  <span>Subtotal</span>
                  <span className="text-emerald-700">₹{cartSubtotal}</span>
                </div>

                <button
                  onClick={handleCheckoutRedirect}
                  className="w-full py-3 bg-emerald-600 text-white font-bold text-sm rounded-xl shadow hover:bg-emerald-700 transition"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}