import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { KeepAliveOutlet } from "@/components/KeepAliveOutlet";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AdminSidebar } from "./AdminSidebar";
import { LogOut, Menu, Moon, Sun, UserCircle, ChevronDown } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/useAuth";
import { AdminSearch } from "@/components/AdminSearch";
import { HeaderThemeDropdown } from "@/components/HeaderThemeDropdown";

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/superadmin");
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between h-14 px-4 sm:px-6 border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 flex-1">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 -ml-2 rounded-md text-muted-foreground hover:bg-primary/10 transition-colors">
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Super Admin
            </div>
            <AdminSearch />
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <HeaderThemeDropdown />
            <button onClick={toggleTheme} className="p-2 rounded-md text-muted-foreground hover:bg-primary/10 transition-colors">
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-1.5 rounded-md hover:bg-primary/10 transition-colors"
              >
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCircle className="h-5 w-5 text-primary" />
                </div>
                {profile?.full_name && <span className="text-sm font-medium text-foreground hidden sm:block max-w-[120px] truncate">{profile.full_name}</span>}
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-card border border-border rounded-lg shadow-lg z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-medium text-foreground truncate">{profile?.full_name || "Super Admin"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <Link
                    to="/superadmin/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-primary/10 transition-colors"
                  >
                    <UserCircle className="h-4 w-4" />
                    My Profile
                  </Link>
                  <button
                    onClick={() => { setProfileOpen(false); handleSignOut(); }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors w-full text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6"><ErrorBoundary moduleName="Admin"><KeepAliveOutlet /></ErrorBoundary></main>
      </div>
    </div>
  );
}
