// hooks/useNearbyStores.ts
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface NearbyStore {
  id: string;
  name: string;
  address: string;
  pincode: string;
  latitude: number;
  longitude: number;
  distance_km: number;
}

interface UseNearbyStoresOptions {
  radiusKm?: number;
  fallbackLat?: number;
  fallbackLng?: number;
}

export function useNearbyStores(options: UseNearbyStoresOptions = {}) {
  const {
    radiusKm = 5.0,
    // Default fallback coordinates: Kattangal, Kerala (11.3216, 75.9341)
    fallbackLat = 11.3216,
    fallbackLng = 75.9341,
  } = options;

  const [stores, setStores] = useState<NearbyStore[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const fetchNearby = async (lat: number, lng: number) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_nearby_stores', {
        user_lat: lat,
        user_lng: lng,
        radius_km: radiusKm,
      });

      if (rpcError) {
        throw rpcError;
      }

      setStores(data || []);
    } catch (err: any) {
      console.error('Error fetching nearby stores:', err);
      setError(err.message || 'Failed to fetch nearby stores');
    } finally {
      setLoading(false);
    }
  };

  const requestLocationAndFetch = () => {
    setLoading(true);

    if (!navigator.geolocation) {
      console.warn('Geolocation not supported by browser. Falling back to default coordinates.');
      setUserCoords({ lat: fallbackLat, lng: fallbackLng });
      fetchNearby(fallbackLat, fallbackLng);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserCoords({ lat, lng });
        fetchNearby(lat, lng);
      },
      (geoErr) => {
        console.warn('Geolocation error or permission denied:', geoErr.message);
        setError('Location permission denied or unavailable. Showing default location.');
        setUserCoords({ lat: fallbackLat, lng: fallbackLng });
        fetchNearby(fallbackLat, fallbackLng);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    requestLocationAndFetch();
  }, [radiusKm]);

  return {
    stores,
    loading,
    error,
    userCoords,
    refetch: requestLocationAndFetch,
  };
}