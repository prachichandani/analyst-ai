'use client';

import { useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError('');

    try {
      // Get registration options
      const optionsRes = await fetch('/api/auth/register/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const options = await optionsRes.json();
      if (options.error) throw new Error(options.error);

      // Trigger biometric prompt
      const credential = await startRegistration({ optionsJSON: options });

      // Verify and save
      const finishRes = await fetch('/api/auth/register/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, credential }),
      });
      const result = await finishRes.json();
      if (result.error) throw new Error(result.error);

      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-white">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center text-black">Register</h1>

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
          onClick={handleRegister}
          disabled={loading || !email.trim()}
          className="w-full py-3 bg-black text-white rounded hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Please wait...' : 'Register Passkey'}
        </button>

        <p className="text-center text-sm text-black">
          Already have an account?{' '}
          <a href="/login" className="underline hover:text-gray-700">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
