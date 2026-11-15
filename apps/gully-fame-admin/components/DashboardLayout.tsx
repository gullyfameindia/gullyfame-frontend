'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { getUserRole, UserRole } from '@/lib/auth';

const MobileMenuContext = createContext<{
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}>({
  mobileMenuOpen: false,
  setMobileMenuOpen: () => {},
});

export const useMobileMenu = () => useContext(MobileMenuContext);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [isMounted, setIsMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const role = getUserRole();
    if (role) {
      setUserRole(role);
    }
  }, []);

  
  
  return (
    <MobileMenuContext.Provider value={{ mobileMenuOpen, setMobileMenuOpen }}>
      <div className="flex h-screen bg-app-bg">
        {isMounted ? (
          <Sidebar userRole={userRole} />
        ) : (
          <div className="hidden md:block w-56 bg-app-sidebar"></div>
        )}
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <Header />
          <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 bg-app-bg" suppressHydrationWarning>
            {children}
          </main>
        </div>
      </div>
    </MobileMenuContext.Provider>
  );
}

