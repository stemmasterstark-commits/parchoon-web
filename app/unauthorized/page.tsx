// app/unauthorized/page.tsx
import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl border shadow-sm max-w-md text-center space-y-4">
        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto text-xl font-black">
          ✕
        </div>
        <h1 className="text-xl font-black text-gray-900">Access Denied</h1>
        <p className="text-xs text-gray-500">
          You do not have the required permissions to view this portal. Please sign in with an authorized account.
        </p>
        <Link
          href="/login"
          className="inline-block px-5 py-2.5 bg-gray-900 text-white font-bold text-xs rounded-xl shadow hover:bg-gray-800 transition"
        >
          Switch Account
        </Link>
      </div>
    </div>
  );
}