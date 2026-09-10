// app/merchant/orders/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface OrderItem {
  id: string;
  product_title: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  created_at: string;
  status: 'PENDING' | 'ACCEPTED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  total_amount: number;
  delivery_address: string;
  customer_phone: string;
  rider_id?: string;
  order_items?: OrderItem[];
}

export default function MerchantOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Fetch all orders for the merchant's store
  const fetchMerchantOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data as Order[]);
    }
    setLoading(false);
  };

  // Real-time subscription for incoming merchant orders
  useEffect(() => {
    fetchMerchantOrders();

    const channel = supabase
      .channel('merchant_orders_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchMerchantOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Update order status (ACCEPT / REJECT / MARK READY)
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      alert('Failed to update status: ' + error.message);
    } else {
      fetchMerchantOrders();
    }
  };

  const filteredOrders =
    filterStatus === 'ALL'
      ? orders
      : orders.filter((o) => o.status === filterStatus);

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
  const acceptedCount = orders.filter((o) => o.status === 'ACCEPTED').length;

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Merchant Order Console</h1>
            <p className="text-xs text-gray-500 mt-1">
              Manage incoming customer orders, stock preparation, and delivery dispatches.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-2xl text-center">
              <span className="text-[10px] font-extrabold uppercase text-amber-800 tracking-wider">
                New Pending
              </span>
              <p className="text-lg font-black text-amber-900">{pendingCount}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-2xl text-center">
              <span className="text-[10px] font-extrabold uppercase text-blue-800 tracking-wider">
                In Prep
              </span>
              <p className="text-lg font-black text-blue-900">{acceptedCount}</p>
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {['ALL', 'PENDING', 'ACCEPTED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  filterStatus === status
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-200 border'
                }`}
              >
                {status.replace(/_/g, ' ')}
              </button>
            )
          )}
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-52 bg-gray-200 animate-pulse rounded-3xl" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredOrders.length === 0 && (
          <div className="bg-white p-12 text-center rounded-3xl border border-dashed text-gray-400 font-medium text-sm">
            No orders found under this view.
          </div>
        )}

        {/* Order Cards Grid */}
        {!loading && filteredOrders.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className={`bg-white rounded-3xl p-6 border shadow-sm flex flex-col justify-between transition ${
                  order.status === 'PENDING' ? 'ring-2 ring-amber-400' : ''
                }`}
              >
                <div>
                  {/* Order ID & Status Header */}
                  <div className="flex justify-between items-start border-b pb-3 mb-4">
                    <div>
                      <span className="font-mono text-xs font-bold text-gray-400">
                        #{order.id.slice(0, 8)}
                      </span>
                      <p className="text-xs font-extrabold text-gray-900 mt-0.5">
                        {new Date(order.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
                        order.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800'
                          : order.status === 'ACCEPTED'
                          ? 'bg-blue-100 text-blue-800'
                          : order.status === 'OUT_FOR_DELIVERY'
                          ? 'bg-purple-100 text-purple-800'
                          : order.status === 'DELIVERED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Customer Information */}
                  <div className="bg-gray-50 p-3 rounded-2xl mb-4 text-xs space-y-1">
                    <p className="font-bold text-gray-800">Customer Details:</p>
                    <p className="text-gray-600 line-clamp-1">{order.delivery_address}</p>
                    <p className="text-gray-500 font-mono">Ph: {order.customer_phone}</p>
                  </div>

                  {/* Line Items Breakdown */}
                  <div className="space-y-2 mb-4">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Ordered Items
                    </span>
                    {order.order_items?.map((item) => (
                      <div key={item.id} className="flex justify-between text-xs py-1 border-b border-gray-100 last:border-0">
                        <span className="text-gray-800 font-medium">
                          <strong className="text-gray-900">{item.quantity}x</strong> {item.product_title}
                        </span>
                        <span className="font-bold text-gray-700">₹{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Total & Action Controls */}
                <div className="pt-4 border-t space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-gray-500">Order Total</span>
                    <span className="font-black text-emerald-700 text-base">₹{order.total_amount.toFixed(2)}</span>
                  </div>

                  {/* Merchant Action Controls */}
                  {order.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateOrderStatus(order.id, 'ACCEPTED')}
                        className="flex-1 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow hover:bg-emerald-700 transition"
                      >
                        Accept & Pack
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'CANCELLED')}
                        className="px-4 py-2.5 bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl hover:bg-rose-100 transition"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {order.status === 'ACCEPTED' && (
                    <div className="p-2.5 bg-blue-50 text-blue-800 rounded-xl text-center text-xs font-bold border border-blue-200">
                      Waiting for Rider Acceptance in Dispatch Queue
                    </div>
                  )}

                  {order.status === 'OUT_FOR_DELIVERY' && (
                    <div className="p-2.5 bg-purple-50 text-purple-800 rounded-xl text-center text-xs font-bold border border-purple-200">
                      Rider En Route to Customer
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}