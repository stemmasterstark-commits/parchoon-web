'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Order {
  id: string;
  items_total: number;
  total_amount: number;
  order_status: 'PENDING' | 'ACCEPTED' | 'PACKED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  delivery_address: string;
  created_at: string;
  customer_otp: string;
}

interface Product {
  id: string;
  title: string;
  price: number;
  is_available: boolean;
  category: string;
}

export default function MerchantDashboard() {
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'ledger'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);

  // Fetch store inventory and orders
  useEffect(() => {
    async function loadMerchantData() {
      setLoading(true);

      // Fetch the first active store (For pilot test)
      const { data: storeData } = await supabase.from('stores').select('*').limit(1).single();

      if (storeData) {
        setStoreId(storeData.id);

        // Fetch Orders for this store
        const { data: orderData } = await supabase
          .from('orders')
          .select('*')
          .eq('store_id', storeData.id)
          .order('created_at', { ascending: false });

        if (orderData) setOrders(orderData);

        // Fetch Products for this store
        const { data: productData } = await supabase
          .from('products')
          .select('*')
          .eq('store_id', storeData.id);

        if (productData) setProducts(productData);
      }
      setLoading(false);
    }

    loadMerchantData();
  }, []);

  // Toggle product availability in real-time
  const toggleStock = async (productId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, is_available: newStatus } : p))
    );

    await supabase.from('products').update({ is_available: newStatus }).eq('id', productId);
  };

  // Update order status (PENDING -> ACCEPTED -> PACKED)
  const updateOrderStatus = async (orderId: string, status: Order['order_status']) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, order_status: status } : o))
    );

    await supabase.from('orders').update({ order_status: status }).eq('id', orderId);
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* Merchant Top Bar */}
      <header className="bg-slate-900 text-white px-6 py-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black text-emerald-400">Parchoon</span>
          <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full font-bold border border-emerald-500/30">
            MERCHANT PORTAL
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
              activeTab === 'orders' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Live Orders ({orders.filter((o) => o.order_status !== 'DELIVERED').length})
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
              activeTab === 'inventory' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Stock & Inventory
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-20 text-gray-500 font-medium">Loading store dashboard...</div>
        ) : activeTab === 'orders' ? (
          /* Live Orders View */
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Live Incoming Orders</h2>
            {orders.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl text-center border text-gray-500">
                No orders received yet today.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {orders.map((order) => (
                  <div key={order.id} className="bg-white rounded-2xl border p-5 shadow-sm space-y-4">
                    <div className="flex justify-between items-start border-b pb-3">
                      <div>
                        <span className="text-xs font-mono text-gray-400">ORDER #{order.id.slice(0, 8)}</span>
                        <h4 className="font-bold text-gray-900 text-lg">₹{order.total_amount}</h4>
                      </div>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                          order.order_status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : order.order_status === 'ACCEPTED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {order.order_status}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 truncate">📍 {order.delivery_address}</p>

                    <div className="pt-2 flex gap-2">
                      {order.order_status === 'PENDING' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'ACCEPTED')}
                          className="w-full bg-emerald-600 text-white font-bold py-2 text-xs rounded-xl hover:bg-emerald-700"
                        >
                          Accept Order
                        </button>
                      )}
                      {order.order_status === 'ACCEPTED' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'PACKED')}
                          className="w-full bg-blue-600 text-white font-bold py-2 text-xs rounded-xl hover:bg-blue-700"
                        >
                          Mark as Packed & Ready
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Inventory Management View */
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Store Inventory Manager</h2>
            <div className="bg-white rounded-2xl border divide-y overflow-hidden shadow-sm">
              {products.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No products added to this store catalog yet.</div>
              ) : (
                products.map((product) => (
                  <div key={product.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <h4 className="font-bold text-gray-800">{product.title}</h4>
                      <span className="text-sm font-semibold text-emerald-600">₹{product.price}</span>
                    </div>

                    <button
                      onClick={() => toggleStock(product.id, product.is_available)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                        product.is_available
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-red-100 text-red-800 border border-red-300'
                      }`}
                    >
                      {product.is_available ? 'IN STOCK' : 'OUT OF STOCK'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}