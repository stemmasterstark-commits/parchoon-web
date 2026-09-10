// app/merchant/onboard/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import StoreOnboardingForm from '@/components/StoreOnboardingForm';

export default function MerchantOnboardPage() {
  const router = useRouter();

  const handleStoreSuccess = (storeId: string) => {
    // Redirect merchant directly to their inventory management panel
    router.push(`/merchant/inventory?storeId=${storeId}`);
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <StoreOnboardingForm onSuccess={handleStoreSuccess} />
    </main>
  );
}