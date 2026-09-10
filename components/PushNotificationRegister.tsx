// components/PushNotificationRegister.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationRegister({ userId }: { userId: string }) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) setIsSubscribed(true);
        });
      });
    }
  }, []);

  const subscribeToNotifications = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Notification permission was denied.');
        setLoading(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });

      // Save subscription object to Supabase
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: userId,
          subscription: sub.toJSON(),
        },
        { onConflict: 'user_id' }
      );

      if (error) throw error;

      setIsSubscribed(true);
      alert('Notifications enabled!');
    } catch (err: any) {
      console.error('Push Subscription Error:', err);
      alert('Failed to subscribe to notifications.');
    } finally {
      setLoading(false);
    }
  };

  if (isSubscribed) return null;

  return (
    <button
      onClick={subscribeToNotifications}
      disabled={loading}
      className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition"
    >
      {loading ? 'Enabling...' : '🔔 Enable Live Order Alerts'}
    </button>
  );
}