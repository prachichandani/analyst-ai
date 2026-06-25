'use client';

import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-white">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-3xl font-bold text-center text-black">Welcome</h1>
        <p className="text-center text-black">Analyst AI - Secure Passkey Authentication</p>

        <div className="space-y-4">
          <button
            onClick={() => router.push('/login')}
            className="w-full py-3 bg-black text-white rounded hover:bg-gray-800"
          >
            Sign In
          </button>

          <button
            onClick={() => router.push('/register')}
            className="w-full py-3 border border-black text-black rounded hover:bg-gray-100"
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
}