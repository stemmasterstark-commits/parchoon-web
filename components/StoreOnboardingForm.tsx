// components/StoreOnboardingForm.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface StoreFormData {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude: string;
  longitude: string;
}

export default function StoreOnboardingForm({
  onSuccess,
}: {
  onSuccess?: (storeId: string) => void;
}) {
  const [formData, setFormData] = useState<StoreFormData>({
    name: '',
    address: '',
    city: 'Kattangal',
    state: 'Kerala',
    pincode: '',
    latitude: '',
    longitude: '',
  });

  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auto-detect current merchant GPS location
  const handleDetectLocation = () => {
    setGeoLoading(true);
    setMessage(null);

    if (!navigator.geolocation) {
      setMessage({ type: 'error', text: 'Geolocation is not supported by your browser.' });
      setGeoLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setMessage({ type: 'success', text: 'GPS Location detected successfully!' });
        setGeoLoading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setMessage({
          type: 'error',
          text: 'Failed to retrieve location. Please grant permission or enter coordinates manually.',
        });
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      setMessage({ type: 'error', text: 'Please enter valid numerical latitude and longitude.' });
      setLoading(false);
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const ownerId = userData?.user?.id || null;

      const { data: store, error } = await supabase
        .from('stores')
        .insert({
          name: formData.name,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          latitude: lat,
          longitude: lng,
          owner_id: ownerId,
          is_active: true,
        })
        .select('id')
        .single();

      if (error) throw error;

      setMessage({ type: 'success', text: 'Store registered successfully! PostGIS indexing complete.' });
      setFormData({
        name: '',
        address: '',
        city: 'Kattangal',
        state: 'Kerala',
        pincode: '',
        latitude: '',
        longitude: '',
      });

      if (onSuccess && store) {
        onSuccess(store.id);
      }
    } catch (err: any) {
      console.error('Error adding store:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to onboard store. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl shadow-md border border-gray-100">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Merchant Store Onboarding</h2>
        <p className="text-xs text-gray-500 mt-1">
          Register a local Kirana or retail outlet anywhere in India to join the Parchun network.
        </p>
      </div>

      {message && (
        <div
          className={`p-3 text-xs rounded-xl mb-4 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Store Name */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Store Name *</label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Apex General Store"
            className="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Full Address *</label>
          <input
            type="text"
            name="address"
            required
            value={formData.address}
            onChange={handleChange}
            placeholder="e.g. Main Gate, NIT Calicut Campus Area"
            className="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        {/* City, State & Pincode Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">City *</label>
            <input
              type="text"
              name="city"
              required
              value={formData.city}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">State *</label>
            <input
              type="text"
              name="state"
              required
              value={formData.state}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Pincode *</label>
            <input
              type="text"
              name="pincode"
              required
              value={formData.pincode}
              onChange={handleChange}
              placeholder="673601"
              className="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Geolocation Section */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-bold text-gray-700">Store GPS Coordinates *</label>
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={geoLoading}
              className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg hover:bg-emerald-200 transition disabled:opacity-50"
            >
              {geoLoading ? 'Detecting...' : 'Use Current GPS Location'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <input
                type="text"
                name="latitude"
                required
                value={formData.latitude}
                onChange={handleChange}
                placeholder="Latitude (e.g. 11.3216)"
                className="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <input
                type="text"
                name="longitude"
                required
                value={formData.longitude}
                onChange={handleChange}
                placeholder="Longitude (e.g. 75.9341)"
                className="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 py-3 bg-emerald-600 text-white font-bold text-sm rounded-xl shadow-md hover:bg-emerald-700 transition disabled:opacity-50"
        >
          {loading ? 'Registering & Indexing...' : 'Add Store to Pan-India Network'}
        </button>
      </form>
    </div>
  );
}