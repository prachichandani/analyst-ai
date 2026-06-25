'use client';

import { useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError('');

    try {
      // Get login options
      const optionsRes = await fetch('/api/auth/register/login/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const options = await optionsRes.json();
      if (options.error) throw new Error(options.error);

      // Trigger biometric prompt
      const credential = await startAuthentication({ optionsJSON: options });

      // Verify
      const finishRes = await fetch('/api/auth/register/login/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, credential }),
      });
      const result = await finishRes.json();
      if (result.error) throw new Error(result.error);

      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-white">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center text-black">Sign In</h1>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="w-full p-3 border border-black rounded bg-white text-black"
          disabled={loading}
        />

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          onClick={handleLogin}
          disabled={loading || !email.trim()}
          className="w-full py-3 bg-black text-white rounded hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Please wait...' : 'Sign in with Passkey'}
        </button>

        <p className="text-center text-sm text-black">
          Don't have an account?{' '}
          <a href="/register" className="underline hover:text-gray-700">
            Register
          </a>
        </p>
      </div>
    </div>
  );
}
