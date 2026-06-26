'use client';

import { useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-muted/30 px-4">

      {/* Background Glow */}
      <div className="absolute -left-32 top-20 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -right-32 bottom-20 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative w-full max-w-md">

        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-2xl text-primary-foreground shadow-lg">
            🤖
          </div>

          <h1 className="text-4xl font-bold tracking-tight">
            Analyst AI
          </h1>

          <p className="mt-3 text-muted-foreground">
            Create your account using a secure passkey
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border bg-card/70 p-8 shadow-2xl backdrop-blur-xl">

          <div className="space-y-5">

            <div>
              <label className="mb-2 block text-sm font-medium">
                Email Address
              </label>

              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                disabled={loading}
                className="h-12 rounded-xl"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleRegister}
              disabled={loading || !email.trim()}
              className="h-12 w-full rounded-xl text-base font-medium"
            >
              {loading ? "Creating Account..." : "Register with Passkey"}
            </Button>

            <div className="rounded-xl bg-muted/50 p-4 text-center text-sm text-muted-foreground">
              🔒 Your fingerprint or Face ID stays on your device and is never shared.
            </div>

          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <a
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </a>
        </p>

      </div>
    </div>
  );
}
