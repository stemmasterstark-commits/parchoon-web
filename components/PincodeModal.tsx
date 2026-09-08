'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCart } from '@/context/CartContext';

export default function PincodeModal({ isOpen, onClose }: { isOpen: boolean; onClose?: () => void }) {
  const { setPincode, setIsServiceable, setLocationName } = useCart();
  const [inputPin, setInputPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'serviceable' | 'unserviceable'>('idle');
  const [phone, setPhone] = useState('');
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleCheckPincode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPin.length !== 6) return;

    setLoading(true);
    setStatus('idle');

    const { data, error } = await supabase
      .from('active_pincodes')
      .select('*')
      .eq('pincode', inputPin)
      .single();

    setLoading(false);

    if (error || !data || !data.is_active) {
      setStatus('unserviceable');
      setIsServiceable(false);
      localStorage.setItem('parchoon_is_serviceable', 'false');
    } else {
      setStatus('serviceable');
      setPincode(data.pincode);
      setLocationName(data.location_name);
      setIsServiceable(true);
      localStorage.setItem('parchoon_is_serviceable', 'true');
      localStorage.setItem('parchoon_location_name', data.location_name);
      if (onClose) onClose();
    }
  };

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;

    await supabase.from('waitlist_signups').insert([{ phone, pincode: inputPin }]);
    setWaitlistSubmitted(true);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="text-center mb-6">
          <span className="text-3xl font-extrabold text-emerald-600 tracking-tight">Parchoon</span>
          <h2 className="text-xl font-bold text-gray-800 mt-2">Enter Your Delivery Pincode</h2>
          <p className="text-sm text-gray-500">Check availability in your locality</p>
        </div>

        <form onSubmit={handleCheckPincode} className="space-y-4">
          <div>
            <input
              type="text"
              maxLength={6}
              value={inputPin}
              onChange={(e) => setInputPin(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 673601"
              className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-gray-900"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || inputPin.length !== 6}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-xl transition-all"
          >
            {loading ? 'Verifying...' : 'Check Availability'}
          </button>
        </form>

        {status === 'unserviceable' && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            {!waitlistSubmitted ? (
              <>
                <h3 className="font-semibold text-amber-800 text-sm">We aren't in {inputPin} yet!</h3>
                <p className="text-xs text-amber-700 mt-1">
                  Parchoon is expanding fast. Enter your phone number to get notified as soon as we launch in your area.
                </p>
                <form onSubmit={handleWaitlistSubmit} className="mt-3 flex gap-2">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Mobile number"
                    className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none text-gray-900"
                    required
                  />
                  <button type="submit" className="bg-amber-600 text-white text-sm px-3 py-2 rounded-lg font-medium">
                    Notify Me
                  </button>
                </form>
              </>
            ) : (
              <p className="text-xs font-semibold text-emerald-700 text-center">
                ✓ You're on the list! We'll notify you when we expand to {inputPin}.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}