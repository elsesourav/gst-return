import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { Spinner } from '@/components/ui';

export function ProtectedRoute() {
  const { user, loading, initialized } = useAuthStore();

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="text-center animate-fade-in">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-surface-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
