'use client';

import { useSession } from 'next-auth/react';
import Navigation from './Navigation';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const { data: session } = useSession();

  if (!session?.user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Navigation />
      
      {/* Main Content */}
      <div className="lg:pl-64">
        <main className="min-h-screen">
          <div className="h-full w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}