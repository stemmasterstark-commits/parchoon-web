// components/LiveOrderMap.tsx
'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Marker Icons
const storeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const customerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const riderIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LiveOrderMapProps {
  storeLat: number;
  storeLng: number;
  riderLat?: number;
  riderLng?: number;
  customerLat?: number;
  customerLng?: number;
}

// Auto-fit view to include all available markers
function MapBoundsController({
  storeLat,
  storeLng,
  riderLat,
  riderLng,
  customerLat,
  customerLng,
}: LiveOrderMapProps) {
  const map = useMap();
  const isInitialFit = useRef(true);

  useEffect(() => {
    const points: [number, number][] = [[storeLat, storeLng]];

    if (customerLat && customerLng) {
      points.push([customerLat, customerLng]);
    }
    if (riderLat && riderLng) {
      points.push([riderLat, riderLng]);
    }

    if (points.length > 1 && isInitialFit.current) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      isInitialFit.current = false;
    } else if (riderLat && riderLng && !isInitialFit.current) {
      map.panTo([riderLat, riderLng], { animate: true, duration: 1 });
    }
  }, [storeLat, storeLng, riderLat, riderLng, customerLat, customerLng, map]);

  return null;
}

export default function LiveOrderMap({
  storeLat,
  storeLng,
  riderLat,
  riderLng,
  customerLat,
  customerLng,
}: LiveOrderMapProps) {
  const defaultCenter: [number, number] =
    riderLat && riderLng ? [riderLat, riderLng] : [storeLat, storeLng];

  // 1. Build route polyline array
  // Order: Store -> Rider (if available) -> Customer (if available)
  const routePoints: [number, number][] = [];

  routePoints.push([storeLat, storeLng]);

  if (riderLat && riderLng) {
    routePoints.push([riderLat, riderLng]);
  }

  if (customerLat && customerLng) {
    routePoints.push([customerLat, customerLng]);
  }

  return (
    <div className="w-full h-80 rounded-3xl overflow-hidden border border-gray-200 shadow-sm relative z-0">
      <MapContainer
        center={defaultCenter}
        zoom={14}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 2. Render Polyline connecting points */}
        {routePoints.length > 1 && (
          <Polyline
            positions={routePoints}
            pathOptions={{
              color: '#059669', // Emerald green line
              weight: 4,
              opacity: 0.8,
              dashArray: '8, 8', // Dashed line effect
            }}
          />
        )}

        {/* Store Marker */}
        <Marker position={[storeLat, storeLng]} icon={storeIcon}>
          <Popup className="font-semibold text-xs">Store Pickup</Popup>
        </Marker>

        {/* Customer Marker */}
        {customerLat && customerLng && (
          <Marker position={[customerLat, customerLng]} icon={customerIcon}>
            <Popup className="font-semibold text-xs">Delivery Address</Popup>
          </Marker>
        )}

        {/* Rider Marker */}
        {riderLat && riderLng && (
          <Marker position={[riderLat, riderLng]} icon={riderIcon}>
            <Popup className="font-semibold text-xs">Rider Location</Popup>
          </Marker>
        )}

        <MapBoundsController
          storeLat={storeLat}
          storeLng={storeLng}
          riderLat={riderLat}
          riderLng={riderLng}
          customerLat={customerLat}
          customerLng={customerLng}
        />
      </MapContainer>
    </div>
  );
}