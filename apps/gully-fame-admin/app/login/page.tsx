'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Mail, Lock, KeyRound } from 'lucide-react';
import { loginAdmin, verifyAdminLogin } from '@/lib/authApi';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Second step when the server asks for the emailed code (A6).
  const [txnId, setTxnId] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setIsLoading(true);
    try {
      const result = await loginAdmin(email, password);
      if (!result.success) {
        setError(result.message || 'Login failed. Please check your credentials.');
        return;
      }
      if (result.data?.otpRequired && result.data.txnId) {
        setTxnId(result.data.txnId);
        setSentTo(result.data.email || 'your email');
        setCode('');
        return;
      }
      router.replace('/');
    } catch (err: any) {
      console.error('Unexpected login error:', err?.message || err);
      setError('Unexpected error during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!txnId || !/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code from the email');
      return;
    }
    setIsLoading(true);
    try {
      const result = await verifyAdminLogin(txnId, code);
      if (!result.success) {
        setError(result.message || 'That code did not work. Please try again.');
        return;
      }
      router.replace('/');
    } finally {
      setIsLoading(false);
    }
  };

  const backToPassword = () => {
    setTxnId(null);
    setCode('');
    setError('');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg px-4">
      <div className="w-full max-w-md rounded-2xl border border-app-border bg-app-surface p-8 shadow-2xl">
        <div className="mb-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gfi-logo.png" alt="Gully Fame India" className="mx-auto mb-4 h-20 w-auto" />
          <h1 className="text-3xl font-bold text-white">
            Gully<span className="text-primary-500">Fame</span>
          </h1>
          <p className="mt-2 text-gray-500">Admin Panel</p>
        </div>

        {txnId ? (
          <form onSubmit={handleVerify} className="space-y-5">
            <p className="text-sm text-gray-500">
              We emailed a 6-digit login code to <span className="font-medium text-gray-700">{sentTo}</span>. It expires in 10 minutes.
            </p>
            <div>
              <label htmlFor="login-code" className="mb-2 block text-sm font-medium text-gray-700">Login code</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="login-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 tracking-widest focus:ring-1 focus:ring-primary-500"
                  placeholder="123456"
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center space-x-2 rounded-lg bg-primary-600 px-4 py-2.5 font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <LogIn className="h-5 w-5" />
              <span>{isLoading ? 'Checking...' : 'Verify and log in'}</span>
            </button>
            <button type="button" onClick={backToPassword} className="w-full text-sm text-gray-500 hover:text-gray-700">
              Back (send a new code)
            </button>
          </form>
        ) : (
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:ring-1 focus:ring-primary-500"
                placeholder="admin@gullyfame.com"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:ring-1 focus:ring-primary-500"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center space-x-2 rounded-lg bg-primary-600 px-4 py-2.5 font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <LogIn className="h-5 w-5" />
            <span>{isLoading ? 'Logging in...' : 'Login'}</span>
          </button>
        </form>
        )}
      </div>
    </div>
  );
}
