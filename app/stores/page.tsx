// app/stores/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

interface NearbyStore {
  id: string;
  name: string;
  address: string;
  pincode: string;
  latitude: number;
  longitude: number;
  distance_km: number;
}

export default function StoreLocatorPage() {
  const [stores, setStores] = useState<NearbyStore[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // User position & filter preferences
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(5.0); // Default 5km radius

  // Fetch nearby stores using PostGIS RPC
  const fetchNearbyStores = async (lat: number, lng: number, radius: number) => {
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase.rpc('get_nearby_stores', {
      user_lat: lat,
      user_lng: lng,
      radius_km: radius,
    });

    if (error) {
      setErrorMsg('Failed to locate stores: ' + error.message);
    } else {
      setStores(data || []);
    }
    setLoading(false);
  };

  // Obtain user GPS position on load
  const getUserLocation = () => {
    setLoading(true);
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      // Fallback coordinates (e.g., Kattangal center)
      const fallbackLat = 11.3218;
      const fallbackLng = 75.9341;
      setUserCoords({ lat: fallbackLat, lng: fallbackLng });
      fetchNearbyStores(fallbackLat, fallbackLng, radiusKm);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserCoords({ lat, lng });
        fetchNearbyStores(lat, lng, radiusKm);
      },
      (error) => {
        console.warn('Geolocation access denied or failed:', error.message);
        setErrorMsg('Location permission denied. Showing default area stores.');
        // Default fallback coordinates
        const fallbackLat = 11.3218;
        const fallbackLng = 75.9341;
        setUserCoords({ lat: fallbackLat, lng: fallbackLng });
        fetchNearbyStores(fallbackLat, fallbackLng, radiusKm);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    getUserLocation();
  }, []);

  // Handle manual radius adjustment
  const handleRadiusChange = (newRadius: number) => {
    setRadiusKm(newRadius);
    if (userCoords) {
      fetchNearbyStores(userCoords.lat, userCoords.lng, newRadius);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Page Header */}
      <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-5 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black text-gray-900">Nearby Stores</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {userCoords
                ? `GPS Active: ${userCoords.lat.toFixed(4)}, ${userCoords.lng.toFixed(4)}`
                : 'Acquiring GPS location...'}
            </p>
          </div>

          <button
            onClick={getUserLocation}
            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          >
            <span>📍 Re-center</span>
          </button>
        </div>

        {/* Radius Filter Bar */}
        <div className="max-w-4xl mx-auto px-4 pb-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-xs font-bold text-gray-400 mr-1">Search Radius:</span>
          {[1.0, 3.0, 5.0, 10.0, 20.0].map((r) => (
            <button
              key={r}
              onClick={() => handleRadiusChange(r)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                radiusKm === r
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {r} km
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 pt-6">
        {errorMsg && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-40 bg-gray-200 animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && stores.length === 0 && (
          <div className="bg-white p-12 text-center rounded-3xl border border-dashed text-gray-400 font-medium text-sm">
            No active stores found within {radiusKm} km of your location. Try expanding your search radius.
          </div>
        )}

        {/* Stores List */}
        {!loading && stores.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stores.map((store) => (
              <div
                key={store.id}
                className="bg-white rounded-3xl p-5 border shadow-sm flex flex-col justify-between hover:shadow-md transition"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="text-base font-extrabold text-gray-900">{store.name}</h3>
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-black px-2.5 py-0.5 rounded-full">
                      {store.distance_km < 1
                        ? `${Math.round(store.distance_km * 1000)} m`
                        : `${store.distance_km.toFixed(1)} km`}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 mt-2 line-clamp-2">{store.address}</p>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">Pincode: {store.pincode}</p>
                </div>

                <div className="mt-5 pt-3 border-t flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                    ⚡ Instant Delivery Available
                  </span>

                  <Link
                    href={`/store/${store.id}`}
                    className="px-4 py-2 bg-gray-900 text-white font-bold text-xs rounded-xl hover:bg-gray-800 transition"
                  >
                    View Store →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}