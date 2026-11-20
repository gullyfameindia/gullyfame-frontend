'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentAdmin } from '@/lib/authApi';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      setIsChecking(true);

      if (pathname === '/login') {
        if (!cancelled) {
          setIsAuthed(false);
          setIsChecking(false);
        }
        return;
      }

      // The session is an httpOnly cookie the page cannot see, so always ask the server.
      const result = await getCurrentAdmin();
      if (cancelled) return;

      if (result.success) {
        setIsAuthed(true);
        setIsChecking(false);
      } else {
        console.warn('Session invalid for protected route, redirecting to /login:', result.message || result.error);
        setIsAuthed(false);
        setIsChecking(false);
        router.replace('/login');
      }
    };

    checkAuth();

    const handleStorageChange = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      cancelled = true;
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [pathname, router]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="mt-4 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (pathname === '/login' && !isAuthed) {
    return <>{children}</>;
  }

  if (pathname === '/login' && isAuthed) {
    return null;
  }

  if (!isAuthed && pathname !== '/login') {
    return null;
  }

  return <>{children}</>;
}

