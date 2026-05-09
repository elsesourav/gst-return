import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store';
import { useTheme } from '@/hooks';
import { LoginPage } from '@/features/auth/LoginPage';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/features/clients/Dashboard';
import { FlipkartPage } from '@/features/flipkart/FlipkartPage';

function AppContent() {
  const { initAuth } = useAuthStore();
  useTheme(); // Initialize theme

  useEffect(() => {
    const unsubscribe = initAuth();
    return () => unsubscribe();
  }, [initAuth]);

  return (
    <>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/platform/flipkart" element={<FlipkartPage />} />
            {/* Future Platform Routes */}
            <Route path="/platform/amazon" element={<ComingSoon platform="Amazon" />} />
            <Route path="/platform/meesho" element={<ComingSoon platform="Meesho" />} />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          className: 'toast-custom',
          style: {
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '14px',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </>
  );
}

// Coming Soon placeholder for future platforms
function ComingSoon({ platform }: { platform: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      <div className="text-6xl mb-4 animate-float">🚧</div>
      <h2 className="text-2xl font-bold text-surface-900 mb-2">{platform} Module</h2>
      <p className="text-surface-500">Coming soon! We're working on integrating {platform} support.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
