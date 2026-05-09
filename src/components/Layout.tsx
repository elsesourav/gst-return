import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, useSettingsStore } from '@/store';
import { useTheme } from '@/hooks';
import {
  Home,
  Settings,
  LogOut,
  Sun,
  Moon,
  Monitor,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/utils';
import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui';
import toast from 'react-hot-toast';
import appIcon from "@/assets/icon.png";

export function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme, isDark } = useTheme();
  const { autoSave, setAutoSave } = useSettingsStore();
  const [showSettings, setShowSettings] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  // Breadcrumb logic
  const pathParts = location.pathname.split('/').filter(Boolean);

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 glass border-b border-surface-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo + Breadcrumb */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-2.5 group"
              >
                <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                  <div className="relative mx-auto size-10">
                    <img src={appIcon} alt="Logo" className="w-full h-full" />
                  </div>
                </div>
                <span className="text-lg font-bold text-surface-900 hidden sm:block">
                  GST Return
                </span>
              </button>

              {/* Breadcrumb */}
              {pathParts.length > 0 && (
                <nav className="hidden md:flex items-center gap-1 text-sm text-surface-500">
                  <ChevronRight className="w-4 h-4" />
                  {pathParts.map((part, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <span className="capitalize text-surface-600 font-medium">
                        {part.replace(/-/g, " ")}
                      </span>
                      {i < pathParts.length - 1 && (
                        <ChevronRight className="w-4 h-4 text-surface-400" />
                      )}
                    </span>
                  ))}
                </nav>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/")}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  location.pathname === "/"
                    ? "bg-brand-50 text-brand-600"
                    : "text-surface-500 hover:bg-surface-100",
                )}
                title="Dashboard"
              >
                <Home className="w-5 h-5" />
              </button>

              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg text-surface-500 hover:bg-surface-100 transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>

              {/* User Avatar */}
              {user && (
                <div className="flex items-center gap-2 ml-2 pl-2 border-l border-surface-200">
                  <img
                    src={user.photoURL || ""}
                    alt={user.displayName || "User"}
                    className="w-8 h-8 rounded-full ring-2 ring-surface-200"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-sm font-medium text-surface-700 hidden lg:block">
                    {user.displayName}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </main>

      {/* Settings Modal */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Settings"
        size="sm"
      >
        <div className="space-y-6">
          {/* Theme Toggle */}
          <div>
            <h3 className="text-sm font-semibold text-surface-900 mb-3">
              Appearance
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "light" as const, icon: Sun, label: "Light" },
                { value: "dark" as const, icon: Moon, label: "Dark" },
                { value: "system" as const, icon: Monitor, label: "System" },
              ].map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                    theme === value
                      ? "border-brand-500 bg-brand-50 text-brand-600"
                      : "border-surface-200 text-surface-500 hover:border-surface-300",
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Auto Save */}
          <div>
            <h3 className="text-sm font-semibold text-surface-900 mb-3">
              Auto Save
            </h3>
            <div className="flex items-center justify-between p-3 rounded-xl border border-surface-200">
              <div>
                <p className="text-sm font-medium text-surface-700">
                  Save automatically
                </p>
                <p className="text-xs text-surface-500">
                  Auto-save after file generation
                </p>
              </div>
              <button
                onClick={() => {
                  setAutoSave(!autoSave);
                  toast.success(
                    `Auto-save ${!autoSave ? "enabled" : "disabled"}`,
                  );
                }}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  autoSave ? "bg-brand-600" : "bg-surface-300",
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm",
                    autoSave ? "translate-x-6" : "translate-x-1",
                  )}
                />
              </button>
            </div>
          </div>

          {/* Logout */}
          <div className="pt-2 border-t border-surface-200">
            <Button
              variant="danger"
              className="w-full"
              icon={<LogOut className="w-4 h-4" />}
              onClick={handleLogout}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
